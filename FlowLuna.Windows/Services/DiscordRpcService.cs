using System;
using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace FlowLuna.Services;

/// <summary>
/// Native Windows Discord Rich Presence (RPC) client over Discord Named Pipe IPC
/// Communicates directly with local Discord client via \\.\pipe\discord-ipc-0..9
/// </summary>
public sealed class DiscordRpcService : IDisposable
{
    private const string DefaultClientId = "1346083091945848883"; // FlowLuna registered Client ID
    private readonly string _clientId;
    private NamedPipeClientStream? _pipeStream;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private bool _isConnected;
    private bool _isDisposed;
    private readonly int _pid;

    public static DiscordRpcService Instance { get; } = new();

    public DiscordRpcService(string clientId = DefaultClientId)
    {
        _clientId = clientId;
        _pid = Environment.ProcessId;
    }

    public async Task<bool> EnsureConnectedAsync()
    {
        if (_isConnected && _pipeStream is { IsConnected: true })
            return true;

        await _lock.WaitAsync();
        try
        {
            if (_isConnected && _pipeStream is { IsConnected: true })
                return true;

            ClosePipeInternal();

            // Probe discord-ipc-0 through discord-ipc-9
            for (int i = 0; i < 10; i++)
            {
                var pipeName = $"discord-ipc-{i}";
                try
                {
                    var stream = new NamedPipeClientStream(".", pipeName, PipeDirection.InOut, PipeOptions.Asynchronous);
                    using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(250));
                    await stream.ConnectAsync(cts.Token);

                    _pipeStream = stream;

                    // Handshake frame: Opcode 0
                    var handshakeJson = JsonSerializer.Serialize(new
                    {
                        v = 1,
                        client_id = _clientId
                    });

                    await WriteFrameAsync(0, handshakeJson);
                    var (resOp, _) = await ReadFrameAsync();

                    if (resOp == 1) // Opcode 1 = Frame (DISPATCH READY)
                    {
                        _isConnected = true;
                        Debug.WriteLine($"[DiscordRPC] Successfully connected to \\\\.\\pipe\\{pipeName}");
                        return true;
                    }
                }
                catch
                {
                    // Pipe not active or handshake rejected, try next
                }
            }

            _isConnected = false;
            return false;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task UpdatePresenceAsync(string title, string artist, string? album, double duration, double position, bool isPlaying)
    {
        if (_isDisposed) return;

        try
        {
            var connected = await EnsureConnectedAsync();
            if (!connected || _pipeStream == null) return;

            await _lock.WaitAsync();
            try
            {
                if (!isPlaying)
                {
                    // Clear presence when paused or stopped
                    var clearPayload = JsonSerializer.Serialize(new
                    {
                        cmd = "SET_ACTIVITY",
                        args = new
                        {
                            pid = _pid,
                            activity = (object?)null
                        },
                        nonce = Guid.NewGuid().ToString("N")
                    });
                    await WriteFrameAsync(1, clearPayload);
                    _ = await ReadFrameAsync();
                    return;
                }

                long nowSec = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                long startSec = Math.Max(0, nowSec - (long)Math.Max(0, position));
                long endSec = duration > 0 ? startSec + (long)duration : 0;

                var activityObj = new
                {
                    details = string.IsNullOrWhiteSpace(title) ? "Musique" : (title.Length > 120 ? title[..117] + "..." : title),
                    state = string.IsNullOrWhiteSpace(artist) ? "FlowLuna Hi-Fi" : $"par {(artist.Length > 100 ? artist[..97] + "..." : artist)}",
                    timestamps = endSec > startSec ? (object)new { start = startSec, end = endSec } : new { start = startSec },
                    assets = new
                    {
                        large_image = "flowluna_logo",
                        large_text = string.IsNullOrWhiteSpace(album) ? "FlowLuna v1.0.1" : album,
                        small_image = "play",
                        small_text = "En cours d'écoute"
                    },
                    buttons = new[]
                    {
                        new { label = "Écouter sur FlowLuna", url = "https://github.com/vortexazur/FlowLuna" }
                    }
                };

                var payload = JsonSerializer.Serialize(new
                {
                    cmd = "SET_ACTIVITY",
                    args = new
                    {
                        pid = _pid,
                        activity = activityObj
                    },
                    nonce = Guid.NewGuid().ToString("N")
                });

                await WriteFrameAsync(1, payload);
                _ = await ReadFrameAsync();
            }
            finally
            {
                _lock.Release();
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[DiscordRPC] Failed to update presence: {ex.Message}");
            ClosePipeInternal();
        }
    }

    public async Task ClearPresenceAsync()
    {
        if (_isDisposed || !_isConnected || _pipeStream == null) return;

        try
        {
            await _lock.WaitAsync();
            try
            {
                var clearPayload = JsonSerializer.Serialize(new
                {
                    cmd = "SET_ACTIVITY",
                    args = new
                    {
                        pid = _pid,
                        activity = (object?)null
                    },
                    nonce = Guid.NewGuid().ToString("N")
                });
                await WriteFrameAsync(1, clearPayload);
                _ = await ReadFrameAsync();
            }
            finally
            {
                _lock.Release();
            }
        }
        catch
        {
            ClosePipeInternal();
        }
    }

    private async Task WriteFrameAsync(int opcode, string json)
    {
        if (_pipeStream == null) return;
        var bytes = Encoding.UTF8.GetBytes(json);
        var header = new byte[8];
        BitConverter.TryWriteBytes(header.AsSpan(0, 4), opcode);
        BitConverter.TryWriteBytes(header.AsSpan(4, 4), bytes.Length);

        await _pipeStream.WriteAsync(header, 0, 8);
        await _pipeStream.WriteAsync(bytes, 0, bytes.Length);
        await _pipeStream.FlushAsync();
    }

    private async Task<(int opcode, string json)> ReadFrameAsync()
    {
        if (_pipeStream == null) return (-1, string.Empty);
        var header = new byte[8];
        int read = await _pipeStream.ReadAsync(header, 0, 8);
        if (read < 8) return (-1, string.Empty);

        int opcode = BitConverter.ToInt32(header, 0);
        int length = BitConverter.ToInt32(header, 4);

        if (length <= 0 || length > 1024 * 1024) return (opcode, string.Empty);

        var buffer = new byte[length];
        int total = 0;
        while (total < length)
        {
            int chunk = await _pipeStream.ReadAsync(buffer, total, length - total);
            if (chunk <= 0) break;
            total += chunk;
        }

        var json = Encoding.UTF8.GetString(buffer, 0, total);
        return (opcode, json);
    }

    private void ClosePipeInternal()
    {
        _isConnected = false;
        try
        {
            _pipeStream?.Dispose();
        }
        catch { }
        _pipeStream = null;
    }

    public void Dispose()
    {
        if (_isDisposed) return;
        _isDisposed = true;
        ClosePipeInternal();
        _lock.Dispose();
    }
}

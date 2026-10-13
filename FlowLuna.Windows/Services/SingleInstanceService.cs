using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FlowLuna.Services;

/// <summary>
/// Manages Single-Instance enforcement and inter-process communication (IPC)
/// so that launching files (e.g. via double-click in Windows Explorer) forwards
/// them directly to the running FlowLuna instance without opening multiple windows.
/// </summary>
public static class SingleInstanceService
{
    private const string MutexName = "FlowLuna_SingleInstance_Mutex_GlobalApp";
    private const string PipeName = "FlowLuna_IPC_Pipe_GlobalApp";

    private static Mutex? _mutex;
    private static CancellationTokenSource? _cts;

    private static readonly object _listenerLock = new();
    private static Action<List<string>>? _filesReceived;
    private static readonly List<string> _pendingFilesBuffer = new();

    public static List<string> InitialFiles { get; } = new();

    public static event Action<List<string>>? FilesReceived
    {
        add
        {
            lock (_listenerLock)
            {
                _filesReceived += value;
                if (_pendingFilesBuffer.Count > 0)
                {
                    var buffered = new List<string>(_pendingFilesBuffer);
                    _pendingFilesBuffer.Clear();
                    try
                    {
                        value?.Invoke(buffered);
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"[FlowLuna] Error flushing buffered IPC files: {ex.Message}");
                    }
                }
            }
        }
        remove
        {
            lock (_listenerLock)
            {
                _filesReceived -= value;
            }
        }
    }

    private static void NotifyFilesReceived(List<string> files)
    {
        if (files == null || files.Count == 0) return;
        lock (_listenerLock)
        {
            if (_filesReceived != null)
            {
                _filesReceived.Invoke(files);
            }
            else
            {
                _pendingFilesBuffer.AddRange(files);
            }
        }
    }

    /// <summary>
    /// Checks if this is the first instance of FlowLuna.
    /// If another instance exists, transmits arguments through a named pipe and returns false.
    /// </summary>
    public static bool Initialize(string[] args)
    {
        var cleanedArgs = CleanArgs(args);

        bool isFirstInstance;
        try
        {
            _mutex = new Mutex(true, MutexName, out isFirstInstance);
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[FlowLuna] Mutex error: {ex.Message}");
            isFirstInstance = true;
        }

        if (!isFirstInstance)
        {
            // Another instance is running — send arguments to it with retries in case pipe is busy or starting
            if (cleanedArgs.Count > 0)
            {
                for (int attempt = 0; attempt < 30; attempt++)
                {
                    try
                    {
                        using var client = new NamedPipeClientStream(".", PipeName, PipeDirection.Out);
                        client.Connect(1000); // Wait up to 1 second per attempt
                        using var writer = new StreamWriter(client) { AutoFlush = true };
                        foreach (var path in cleanedArgs)
                        {
                            writer.WriteLine(path);
                        }
                        break; // Sent successfully
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"[FlowLuna] Attempt {attempt + 1} sending args to active instance: {ex.Message}");
                        Thread.Sleep(80 + (attempt % 5) * 20);
                    }
                }
            }
            return false;
        }

        // First instance
        InitialFiles.AddRange(cleanedArgs);
        StartIpcServer();
        return true;
    }

    private static List<string> CleanArgs(string[] args)
    {
        var result = new List<string>();
        foreach (var arg in args)
        {
            if (string.IsNullOrWhiteSpace(arg)) continue;
            var path = arg.Trim().Trim('"');
            if (File.Exists(path) || Directory.Exists(path))
            {
                result.Add(path);
            }
        }
        return result;
    }

    private static void StartIpcServer()
    {
        _cts = new CancellationTokenSource();
        var token = _cts.Token;

        // Run multiple concurrent server listeners so concurrent client connections never find a closed or busy pipe
        for (int i = 0; i < 3; i++)
        {
            _ = Task.Run(() => RunServerListenerLoopAsync(token), token);
        }
    }

    private static async Task RunServerListenerLoopAsync(CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            try
            {
                using var server = new NamedPipeServerStream(
                    PipeName,
                    PipeDirection.In,
                    NamedPipeServerStream.MaxAllowedServerInstances,
                    PipeTransmissionMode.Byte,
                    PipeOptions.Asynchronous);

                await server.WaitForConnectionAsync(token);

                using var reader = new StreamReader(server);
                var files = new List<string>();
                while (!reader.EndOfStream)
                {
                    var line = await reader.ReadLineAsync();
                    if (!string.IsNullOrWhiteSpace(line))
                    {
                        var path = line.Trim().Trim('"');
                        if (File.Exists(path) || Directory.Exists(path))
                        {
                            files.Add(path);
                        }
                    }
                }

                if (files.Count > 0)
                {
                    NotifyFilesReceived(files);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[FlowLuna] IPC listener loop exception: {ex.Message}");
                try { await Task.Delay(100, token); } catch { }
            }
        }
    }

    public static void Cleanup()
    {
        try
        {
            _cts?.Cancel();
            _mutex?.ReleaseMutex();
            _mutex?.Dispose();
        }
        catch { }
    }
}

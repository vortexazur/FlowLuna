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

    public static List<string> InitialFiles { get; } = new();
    public static event Action<List<string>>? FilesReceived;

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
            // Another instance is running — send arguments to it with retries in case pipe is busy
            if (cleanedArgs.Count > 0)
            {
                for (int attempt = 0; attempt < 6; attempt++)
                {
                    try
                    {
                        using var client = new NamedPipeClientStream(".", PipeName, PipeDirection.Out);
                        client.Connect(1500); // Wait up to 1.5 seconds per attempt
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
                        Thread.Sleep(80);
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

        Task.Run(async () =>
        {
            while (!token.IsCancellationRequested)
            {
                try
                {
                    var server = new NamedPipeServerStream(
                        PipeName,
                        PipeDirection.In,
                        NamedPipeServerStream.MaxAllowedServerInstances,
                        PipeTransmissionMode.Byte,
                        PipeOptions.Asynchronous);

                    await server.WaitForConnectionAsync(token);

                    // Process client asynchronously so loop immediately creates the NEXT server instance to accept subsequent connections
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            using (server)
                            using (var reader = new StreamReader(server))
                            {
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
                                    FilesReceived?.Invoke(files);
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            Debug.WriteLine($"[FlowLuna] IPC client reader exception: {ex.Message}");
                        }
                    }, token);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"[FlowLuna] IPC Server loop exception: {ex.Message}");
                    await Task.Delay(100, token);
                }
            }
        }, token);
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

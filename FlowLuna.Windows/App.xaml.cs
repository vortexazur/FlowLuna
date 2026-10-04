using System;
using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Threading;
using FlowLuna.Services;

namespace FlowLuna.Windows;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        // Global exception handlers to prevent silent crash / black screen
        DispatcherUnhandledException += App_DispatcherUnhandledException;
        AppDomain.CurrentDomain.UnhandledException += CurrentDomain_UnhandledException;
        TaskScheduler.UnobservedTaskException += TaskScheduler_UnobservedTaskException;

        // Proactively clean corrupted WebView2 lock files on startup
        CleanWebView2LocksOnStartup();
    }

    private void App_DispatcherUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
    {
        Debug.WriteLine($"[FlowLuna] Unhandled dispatcher exception: {e.Exception}");

        // If WebView2 initialization fails, prevent app crash and let retry logic handle it
        if (e.Exception is System.Runtime.InteropServices.COMException comEx
            && (comEx.HResult == unchecked((int)0x8007139F) || comEx.HResult == unchecked((int)0x80070005)))
        {
            Debug.WriteLine("[FlowLuna] WebView2 COM error intercepted — marking handled to avoid crash.");
            e.Handled = true;
            return;
        }

        // For other unhandled exceptions, log and try to survive
        try
        {
            var logPath = Path.Combine(BinaryManager.FlowLunaDataDir, "crash.log");
            File.AppendAllText(logPath,
                $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] DispatcherUnhandled: {e.Exception}\n\n");
        }
        catch { }

        e.Handled = true;
    }

    private static void CurrentDomain_UnhandledException(object sender, UnhandledExceptionEventArgs e)
    {
        Debug.WriteLine($"[FlowLuna] AppDomain unhandled exception: {e.ExceptionObject}");
        try
        {
            var logPath = Path.Combine(BinaryManager.FlowLunaDataDir, "crash.log");
            File.AppendAllText(logPath,
                $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] DomainUnhandled: {e.ExceptionObject}\n\n");
        }
        catch { }
    }

    private static void TaskScheduler_UnobservedTaskException(object? sender, UnobservedTaskExceptionEventArgs e)
    {
        Debug.WriteLine($"[FlowLuna] Unobserved task exception: {e.Exception}");
        e.SetObserved(); // Prevent process termination
    }

    /// <summary>
    /// Remove stale WebView2 lock files that cause COMException 0x8007139F
    /// after a previous crash. This mimics what Screenbox does with its
    /// proactive cache validation on startup.
    /// </summary>
    private static void CleanWebView2LocksOnStartup()
    {
        try
        {
            var webview2Dir = Path.Combine(BinaryManager.FlowLunaDataDir, "webview2_data", "EBWebView");
            if (!Directory.Exists(webview2Dir)) return;

            // Remove lock files that may be stale from a crashed session
            var lockFiles = new[]
            {
                Path.Combine(webview2Dir, "lockfile"),
                Path.Combine(webview2Dir, "Default", "lockfile"),
                Path.Combine(webview2Dir, "Default", "LOCK"),
            };

            foreach (var lockFile in lockFiles)
            {
                try
                {
                    if (File.Exists(lockFile))
                    {
                        File.Delete(lockFile);
                        Debug.WriteLine($"[FlowLuna] Cleaned stale lock: {lockFile}");
                    }
                }
                catch (IOException)
                {
                    // File is actively locked by another running instance — that's OK
                }
            }

            // Also remove the SingletonLock and SingletonSocket files
            foreach (var file in Directory.GetFiles(webview2Dir, "Singleton*", SearchOption.TopDirectoryOnly))
            {
                try
                {
                    File.Delete(file);
                    Debug.WriteLine($"[FlowLuna] Cleaned stale singleton: {file}");
                }
                catch (IOException) { }
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[FlowLuna] WebView2 lock cleanup warning: {ex.Message}");
        }
    }
}

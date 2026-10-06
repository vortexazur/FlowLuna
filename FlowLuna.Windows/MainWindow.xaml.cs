using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows;
using System.Windows.Interop;
using FlowLuna.Services;
using Microsoft.Web.WebView2.Core;

namespace FlowLuna.Windows;

public partial class MainWindow : Window
{
    private readonly HttpServer _httpServer = new();
    private NativeBridge? _nativeBridge;

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    [DllImport("user32.dll")]
    private static extern bool ReleaseCapture();

    [DllImport("user32.dll")]
    private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);

    [DllImport("psapi.dll")]
    private static extern int EmptyWorkingSet(IntPtr hwProc);

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    private const int SW_RESTORE = 9;

    private readonly List<string> _pendingFiles = new();
    private readonly object _pendingFilesLock = new();
    private bool _isUiReady = false;

    public void BringToForeground()
    {
        Dispatcher.Invoke(() =>
        {
            var hwnd = new WindowInteropHelper(this).Handle;
            if (WindowState == WindowState.Minimized)
            {
                ShowWindow(hwnd, SW_RESTORE);
                WindowState = WindowState.Normal;
            }
            SetForegroundWindow(hwnd);
            Activate();
            Focus();
        });
    }

    public void HandleIncomingFiles(IEnumerable<string> filePaths)
    {
        var existing = filePaths.Where(p => !string.IsNullOrWhiteSpace(p) && (File.Exists(p) || Directory.Exists(p))).ToList();
        if (existing.Count == 0) return;

        Dispatcher.Invoke(() =>
        {
            if (WebViewControl?.CoreWebView2 != null && _isUiReady)
            {
                var json = JsonSerializer.Serialize(existing);
                WebViewControl.CoreWebView2.ExecuteScriptAsync(
                    $"window.dispatchEvent(new CustomEvent('flowluna-open-files', {{ detail: {json} }}));"
                );
            }
            else
            {
                lock (_pendingFilesLock)
                {
                    _pendingFiles.AddRange(existing);
                }
            }
        });
    }

    private void FlushPendingFiles()
    {
        lock (_pendingFilesLock)
        {
            if (_pendingFiles.Count > 0)
            {
                var json = JsonSerializer.Serialize(_pendingFiles);
                _pendingFiles.Clear();
                _ = Task.Delay(400).ContinueWith(_ =>
                {
                    Dispatcher.Invoke(() =>
                    {
                        WebViewControl?.CoreWebView2?.ExecuteScriptAsync(
                            $"window.dispatchEvent(new CustomEvent('flowluna-open-files', {{ detail: {json} }}));"
                        );
                    });
                });
            }
        }
    }

    private const int WM_NCLBUTTONDOWN = 0xA1;
    private const int HTCAPTION = 0x2;
    private const int WM_APPCOMMAND = 0x0319;
    private const int APPCOMMAND_MEDIA_NEXTTRACK = 11;
    private const int APPCOMMAND_MEDIA_PREVIOUSTRACK = 12;
    private const int APPCOMMAND_MEDIA_STOP = 13;
    private const int APPCOMMAND_MEDIA_PLAY_PAUSE = 14;
    private const int APPCOMMAND_MEDIA_PLAY = 46;
    private const int APPCOMMAND_MEDIA_PAUSE = 47;

    public MainWindow()
    {
        InitializeComponent();
        try
        {
            WebViewControl.DefaultBackgroundColor = System.Drawing.Color.Transparent;
        }
        catch { }
        try
        {
            var iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "icon.ico");
            if (!File.Exists(iconPath))
                iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "favicon.ico");
            if (File.Exists(iconPath))
            {
                Icon = System.Windows.Media.Imaging.BitmapFrame.Create(new Uri(iconPath));
            }
        }
        catch { }
        Loaded += MainWindow_Loaded;
        StateChanged += MainWindow_StateChanged;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            ApplyWindows11Backdrop();

            // Hook Windows messages for hardware media keys & SMTC
            var source = HwndSource.FromHwnd(new WindowInteropHelper(this).Handle);
            source?.AddHook(WndProc);

            // Hook IPC FilesReceived from secondary instances
            SingleInstanceService.FilesReceived += files =>
            {
                Dispatcher.Invoke(() =>
                {
                    BringToForeground();
                    HandleIncomingFiles(files);
                });
            };

            // If initial files were provided on startup, queue them
            if (SingleInstanceService.InitialFiles.Count > 0)
            {
                HandleIncomingFiles(SingleInstanceService.InitialFiles);
            }

            // 1. Start embedded Kestrel minimal API server in-process
            await _httpServer.StartAsync(3000);

            // 2. Initialize WebView2 with retry on corrupted cache
            await InitializeWebView2WithRetryAsync();

            WebViewControl.CoreWebView2.Settings.IsStatusBarEnabled = false;
            WebViewControl.CoreWebView2.Settings.AreDevToolsEnabled = true;

            // 3. Register NativeBridge COM host object
            _nativeBridge = new NativeBridge(this);
            WebViewControl.CoreWebView2.AddHostObjectToScript("nativeHost", _nativeBridge);

            // 4. Inject polyfill script so window.electronAPI is automatically available
            const string polyfillScript = @"
            (function() {
                window.electronAPI = {
                    isElectron: true,
                    platform: 'win32',
                    minimize: () => window.chrome.webview.postMessage({ action: 'minimize' }),
                    maximize: () => window.chrome.webview.postMessage({ action: 'maximize' }),
                    close: () => window.chrome.webview.postMessage({ action: 'close' }),
                    setCompactMode: (enabled, w, h) => {
                        try {
                            if (window.chrome?.webview?.hostObjects?.nativeHost) {
                                window.chrome.webview.hostObjects.nativeHost.SetCompactMode(enabled, w || 360, h || 240);
                            } else {
                                window.chrome.webview.postMessage({ action: 'set-compact-mode', enabled: !!enabled, width: w || 360, height: h || 240 });
                            }
                        } catch {}
                    },
                    isMaximized: async () => await window.chrome.webview.hostObjects.nativeHost.IsMaximized(),
                    selectMusicFolder: async () => await window.chrome.webview.hostObjects.nativeHost.SelectMusicFolder(),
                    selectMusicFiles: async () => JSON.parse(await window.chrome.webview.hostObjects.nativeHost.SelectMusicFilesJson()),
                    getBinariesStatus: async () => {
                        const res = await fetch('/api/downloader/binaries-status');
                        return res.json();
                    },
                    updateYtdlp: async () => {
                        const res = await fetch('/api/downloader/update-ytdlp', { method: 'POST' });
                        return res.json();
                    },
                    getLibVlcStatus: async () => {
                        const res = await fetch('/api/engine/libvlc-status');
                        return res.json();
                    },
                    updateLibVlc: async () => {
                        const res = await fetch('/api/engine/update-libvlc', { method: 'POST' });
                        return res.json();
                    },
                    updateTrayTrack: (info) => window.chrome.webview.postMessage({ action: 'update-tray-track', info }),
                    onMaximizedChange: (callback) => {
                        const handler = (e) => callback(e.detail);
                        window.addEventListener('window-maximized-changed', handler);
                        return () => window.removeEventListener('window-maximized-changed', handler);
                    },
                    onMediaControl: (callback) => {
                        const handler = (e) => callback(e.detail);
                        window.addEventListener('media-control', handler);
                        return () => window.removeEventListener('media-control', handler);
                    },
                    applyUpdate: (installerPath) => {
                        try {
                            if (window.chrome?.webview?.hostObjects?.nativeHost) {
                                window.chrome.webview.hostObjects.nativeHost.ApplyUpdate(installerPath);
                            } else {
                                window.chrome.webview.postMessage({ action: 'apply-update', installerPath });
                            }
                        } catch {}
                    },
                    setBackdrop: (effect, theme) => {
                        try {
                            window.chrome.webview.postMessage({ action: 'set-backdrop', effect, theme });
                        } catch {}
                    },
                    openDefaultAppsSettings: () => {
                        try {
                            if (window.chrome?.webview?.hostObjects?.nativeHost) {
                                window.chrome.webview.hostObjects.nativeHost.OpenDefaultAppsSettings();
                            } else {
                                window.chrome.webview.postMessage({ action: 'open-default-apps' });
                            }
                        } catch {}
                    },
                    onOpenFiles: (callback) => {
                        const handler = (e) => callback(e.detail);
                        window.addEventListener('flowluna-open-files', handler);
                        return () => window.removeEventListener('flowluna-open-files', handler);
                    }
                };
            })();
            ";

            await WebViewControl.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(polyfillScript);

            // 5. Handle web messages
            WebViewControl.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;

            // 6. Hook NavigationCompleted to reveal UI only when the SPA is ready
            WebViewControl.CoreWebView2.NavigationCompleted += (_, navArgs) =>
            {
                Dispatcher.Invoke(() =>
                {
                    LoadingOverlay.Visibility = Visibility.Collapsed;
                    _isUiReady = true;
                    FlushPendingFiles();
                });
            };

            // Safety fallback: ensure loading overlay disappears after 5s max
            _ = Task.Delay(5000).ContinueWith(_ =>
            {
                Dispatcher.Invoke(() =>
                {
                    LoadingOverlay.Visibility = Visibility.Collapsed;
                });
            });

            // 7. Navigate to in-process server
            WebViewControl.CoreWebView2.Navigate(_httpServer.BaseUrl);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[FlowLuna] Critical startup error: {ex}");
            try
            {
                var logPath = Path.Combine(BinaryManager.FlowLunaDataDir, "crash.log");
                File.AppendAllText(logPath,
                    $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] MainWindow_Loaded fatal: {ex}\n\n");
            }
            catch { }

            MessageBox.Show(
                $"FlowLuna n'a pas pu démarrer correctement.\n\n" +
                $"Erreur : {ex.Message}\n\n" +
                $"Essayez de relancer l'application. Si le problème persiste,\n" +
                $"supprimez le dossier :\n{Path.Combine(BinaryManager.FlowLunaDataDir, "webview2_data")}",
                "FlowLuna — Erreur de démarrage",
                MessageBoxButton.OK,
                MessageBoxImage.Warning);
        }
    }

    /// <summary>
    /// Builds fine-tuned Chromium environment options targeting lower RAM footprint
    /// while maintaining 60 FPS hardware-accelerated fluid rendering.
    /// </summary>
    private static CoreWebView2EnvironmentOptions GetOptimizedEnvironmentOptions()
    {
        return new CoreWebView2EnvironmentOptions
        {
            AdditionalBrowserArguments =
                "--renderer-process-limit=1 " +
                "--disable-features=Translate,OptimizationHints,MediaRouter " +
                "--disable-background-networking " +
                "--disable-component-update " +
                "--disable-domain-reliability " +
                "--disable-sync " +
                "--disable-speech-api " +
                "--js-flags=\"--max-old-space-size=256\""
        };
    }

    /// <summary>
    /// Initialize WebView2 with automatic retry on corrupted cache (COMException 0x8007139F).
    /// Strategy: 1) Try normal folder → 2) Clean + retry → 3) Fallback to temp GUID folder.
    /// Inspired by Screenbox's resilient initialization pattern.
    /// </summary>
    private async Task InitializeWebView2WithRetryAsync(bool isRetry = false)
    {
        var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var userDataFolder = Path.Combine(localAppData, "FlowLuna", "webview2_data");
        Directory.CreateDirectory(userDataFolder);
        var options = GetOptimizedEnvironmentOptions();

        try
        {
            var env = await CoreWebView2Environment.CreateAsync(
                browserExecutableFolder: null,
                userDataFolder: userDataFolder,
                options: options);
            await WebViewControl.EnsureCoreWebView2Async(env);
        }
        catch (System.Runtime.InteropServices.COMException comEx)
            when (comEx.HResult == unchecked((int)0x8007139F)
              || comEx.HResult == unchecked((int)0x80070005)
              || comEx.HResult == unchecked((int)0x80004005))
        {
            System.Diagnostics.Debug.WriteLine(
                $"[FlowLuna] WebView2 init failed (HR=0x{comEx.HResult:X8}), attempting recovery...");

            if (!isRetry)
            {
                // First attempt: try to delete the corrupted folder and retry
                try
                {
                    if (Directory.Exists(userDataFolder))
                    {
                        Directory.Delete(userDataFolder, recursive: true);
                        System.Diagnostics.Debug.WriteLine("[FlowLuna] Deleted corrupted webview2_data folder.");
                    }
                }
                catch (Exception cleanEx)
                {
                    System.Diagnostics.Debug.WriteLine(
                        $"[FlowLuna] Could not clean webview2_data: {cleanEx.Message}");
                }

                // Small delay to let OS release file handles
                await Task.Delay(500);
                await InitializeWebView2WithRetryAsync(isRetry: true);
            }
            else
            {
                // Second attempt failed — ultimate fallback: use a unique temp folder
                // This guarantees no lock conflicts. Folder is cleaned up on next normal startup.
                var fallbackFolder = Path.Combine(
                    Path.GetTempPath(),
                    $"FlowLuna_WV2_{Guid.NewGuid().ToString("N")[..8]}");

                System.Diagnostics.Debug.WriteLine(
                    $"[FlowLuna] Using temp fallback WebView2 folder: {fallbackFolder}");

                Directory.CreateDirectory(fallbackFolder);
                var fallbackEnv = await CoreWebView2Environment.CreateAsync(
                    browserExecutableFolder: null,
                    userDataFolder: fallbackFolder,
                    options: options);
                await WebViewControl.EnsureCoreWebView2Async(fallbackEnv);
            }
        }
    }

    private void ApplyWindows11Backdrop(string effect = "glass", string theme = "dark")
    {
        try
        {
            var hwnd = new WindowInteropHelper(this).Handle;
            if (hwnd == IntPtr.Zero) return;

            // DWMWA_USE_IMMERSIVE_DARK_MODE = 20
            int darkMode = theme == "light" ? 0 : 1;
            DwmSetWindowAttribute(hwnd, 20, ref darkMode, sizeof(int));

            // DWMWA_WINDOW_CORNER_PREFERENCE = 33 (2 = DWMWCP_ROUND)
            int cornerPref = 2;
            DwmSetWindowAttribute(hwnd, 33, ref cornerPref, sizeof(int));

            // DWMWA_SYSTEMBACKDROP_TYPE = 38 (2 = Mica, 3 = Acrylic, 4 = MicaAlt)
            // Desktop Acrylic (backdrop 3) gives genuine blur-through translucency to background windows & desktop!
            int backdrop = (effect == "acrylic" || effect == "mica") ? 3 : 2;
            DwmSetWindowAttribute(hwnd, 38, ref backdrop, sizeof(int));

            Background = System.Windows.Media.Brushes.Transparent;
            if (RootGrid != null) RootGrid.Background = System.Windows.Media.Brushes.Transparent;
        }
        catch { }
    }

    private void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            if (doc.RootElement.TryGetProperty("action", out var actProp))
            {
                var action = actProp.GetString();
                switch (action)
                {
                    case "minimize":
                        WindowState = WindowState.Minimized;
                        break;
                    case "maximize":
                        WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
                        break;
                    case "close":
                        Close();
                        break;
                    case "drag-window":
                        ReleaseCapture();
                        SendMessage(new WindowInteropHelper(this).Handle, WM_NCLBUTTONDOWN, (IntPtr)HTCAPTION, IntPtr.Zero);
                        break;
                    case "set-compact-mode":
                        bool enabled = doc.RootElement.TryGetProperty("enabled", out var ep) && ep.GetBoolean();
                        double w = doc.RootElement.TryGetProperty("width", out var wp) ? wp.GetDouble() : 360;
                        double h = doc.RootElement.TryGetProperty("height", out var hp) ? hp.GetDouble() : 240;
                        _nativeBridge?.SetCompactMode(enabled, w, h);
                        break;
                    case "set-backdrop":
                        string? eff = doc.RootElement.TryGetProperty("effect", out var ep2) ? ep2.GetString() : "glass";
                        string? thm = doc.RootElement.TryGetProperty("theme", out var tp) ? tp.GetString() : "dark";
                        ApplyWindows11Backdrop(eff ?? "glass", thm ?? "dark");
                        break;
                    case "apply-update":
                        string? ip = doc.RootElement.TryGetProperty("installerPath", out var ipp) ? ipp.GetString() : null;
                        _nativeBridge?.ApplyUpdate(ip ?? "");
                        break;
                    case "open-default-apps":
                        _nativeBridge?.OpenDefaultAppsSettings();
                        break;
                }
            }
        }
        catch { }
    }

    /// <summary>
    /// Flushes physical RAM working set across the host process and all WebView2 child processes
    /// without interrupting audio playback or UI threads.
    /// </summary>
    public void FlushProcessMemoryAndChildren()
    {
        try
        {
            var currentProc = System.Diagnostics.Process.GetCurrentProcess();
            try { EmptyWorkingSet(currentProc.Handle); } catch { }

            // Purge WebView2 main browser process
            if (WebViewControl?.CoreWebView2 != null)
            {
                try
                {
                    var browserPid = (int)WebViewControl.CoreWebView2.BrowserProcessId;
                    if (browserPid > 0)
                    {
                        using var browserProc = System.Diagnostics.Process.GetProcessById(browserPid);
                        EmptyWorkingSet(browserProc.Handle);
                    }
                }
                catch { }
            }

            // Purge msedgewebview2 processes associated with this user session
            try
            {
                var edgeProcs = System.Diagnostics.Process.GetProcessesByName("msedgewebview2");
                foreach (var p in edgeProcs)
                {
                    try { EmptyWorkingSet(p.Handle); } catch { }
                    finally { p.Dispose(); }
                }
            }
            catch { }
        }
        catch { }
    }

    private void MainWindow_StateChanged(object? sender, EventArgs e)
    {
        if (WindowState == WindowState.Minimized)
        {
            if (WebViewControl?.CoreWebView2 != null)
            {
                try
                {
                    WebViewControl.CoreWebView2.MemoryUsageTargetLevel = CoreWebView2MemoryUsageTargetLevel.Low;
                }
                catch { }
            }

            // Aggressive RAM flush when minimized: .NET GC + EmptyWorkingSet on host and WebView2 children
            GC.Collect(2, GCCollectionMode.Aggressive, true, true);
            GC.WaitForPendingFinalizers();
            FlushProcessMemoryAndChildren();
        }
        else
        {
            if (WebViewControl?.CoreWebView2 != null)
            {
                try
                {
                    WebViewControl.CoreWebView2.MemoryUsageTargetLevel = CoreWebView2MemoryUsageTargetLevel.Normal;
                }
                catch { }
            }
        }

        if (WebViewControl?.CoreWebView2 != null)
        {
            var isMax = WindowState == WindowState.Maximized;
            WebViewControl.CoreWebView2.ExecuteScriptAsync(
                $"window.dispatchEvent(new CustomEvent('window-maximized-changed', {{ detail: {(isMax ? "true" : "false")} }}));"
            );
        }
    }

    private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == WM_APPCOMMAND)
        {
            int cmd = (int)((long)lParam >> 16) & ~0xF000;
            switch (cmd)
            {
                case APPCOMMAND_MEDIA_PLAY_PAUSE:
                    SendMediaControl("play-pause");
                    handled = true;
                    break;
                case APPCOMMAND_MEDIA_PLAY:
                    SendMediaControl("play");
                    handled = true;
                    break;
                case APPCOMMAND_MEDIA_PAUSE:
                    SendMediaControl("pause");
                    handled = true;
                    break;
                case APPCOMMAND_MEDIA_NEXTTRACK:
                    SendMediaControl("next");
                    handled = true;
                    break;
                case APPCOMMAND_MEDIA_PREVIOUSTRACK:
                    SendMediaControl("prev");
                    handled = true;
                    break;
                case APPCOMMAND_MEDIA_STOP:
                    SendMediaControl("stop");
                    handled = true;
                    break;
            }
        }
        return IntPtr.Zero;
    }

    private void SendMediaControl(string command)
    {
        try
        {
            if (WebViewControl?.CoreWebView2 != null)
            {
                WebViewControl.CoreWebView2.ExecuteScriptAsync(
                    $"window.dispatchEvent(new CustomEvent('media-control', {{ detail: '{command}' }}));"
                );
            }
        }
        catch { }
    }

    protected override async void OnClosed(EventArgs e)
    {
        base.OnClosed(e);
        await DiscordRpcService.Instance.ClearPresenceAsync();
        DiscordRpcService.Instance.Dispose();
        await _httpServer.StopAsync();
    }
}
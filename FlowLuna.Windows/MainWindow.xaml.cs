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
        Loaded += MainWindow_Loaded;
        StateChanged += MainWindow_StateChanged;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        ApplyWindows11Backdrop();

        // Hook Windows messages for hardware media keys & SMTC
        var source = HwndSource.FromHwnd(new WindowInteropHelper(this).Handle);
        source?.AddHook(WndProc);

        // 1. Start embedded Kestrel minimal API server in-process
        await _httpServer.StartAsync(3000);

        // 2. Initialize WebView2 with dedicated UserDataFolder
        var userDataFolder = Path.Combine(BinaryManager.FlowLunaDataDir, "webview2_data");
        Directory.CreateDirectory(userDataFolder);

        var env = await CoreWebView2Environment.CreateAsync(userDataFolder: userDataFolder);
        await WebViewControl.EnsureCoreWebView2Async(env);

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
                }
            };
        })();
        ";

        await WebViewControl.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(polyfillScript);

        // 5. Handle web messages
        WebViewControl.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;

        // 6. Navigate to in-process server
        WebViewControl.CoreWebView2.Navigate(_httpServer.BaseUrl);
    }

    private void ApplyWindows11Backdrop()
    {
        try
        {
            var hwnd = new WindowInteropHelper(this).Handle;
            if (hwnd == IntPtr.Zero) return;

            // DWMWA_USE_IMMERSIVE_DARK_MODE = 20
            int darkMode = 1;
            DwmSetWindowAttribute(hwnd, 20, ref darkMode, sizeof(int));

            // DWMWA_SYSTEMBACKDROP_TYPE = 38 (3 = Acrylic, 2 = Mica)
            int backdrop = 3;
            DwmSetWindowAttribute(hwnd, 38, ref backdrop, sizeof(int));
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
                }
            }
        }
        catch { }
    }

    private void MainWindow_StateChanged(object? sender, EventArgs e)
    {
        if (WebViewControl.CoreWebView2 != null)
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
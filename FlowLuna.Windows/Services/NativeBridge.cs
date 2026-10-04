using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows;
using Microsoft.Win32;

namespace FlowLuna.Services;

[ComVisible(true)]
[ClassInterface(ClassInterfaceType.AutoDual)]
public class NativeBridge
{
    private readonly Window _window;

    public NativeBridge(Window window)
    {
        _window = window;
    }

    public void Minimize()
    {
        _window.Dispatcher.Invoke(() =>
        {
            _window.WindowState = WindowState.Minimized;
        });
    }

    public void Maximize()
    {
        _window.Dispatcher.Invoke(() =>
        {
            _window.WindowState = _window.WindowState == WindowState.Maximized
                ? WindowState.Normal
                : WindowState.Maximized;
        });
    }

    public void Close()
    {
        _window.Dispatcher.Invoke(() =>
        {
            _window.Close();
        });
    }

    public bool IsMaximized()
    {
        return _window.Dispatcher.Invoke(() => _window.WindowState == WindowState.Maximized);
    }

    public string? SelectMusicFolder()
    {
        return _window.Dispatcher.Invoke(() =>
        {
            var dialog = new OpenFolderDialog
            {
                Title = "Sélectionner un dossier musical - FlowLuna",
                Multiselect = false
            };

            var result = dialog.ShowDialog(_window);
            return result == true ? dialog.FolderName : null;
        });
    }

    private double _savedWidth = 1280;
    private double _savedHeight = 820;
    private WindowState _savedState = WindowState.Normal;

    public void SetCompactMode(bool enabled, double width = 360, double height = 240)
    {
        _window.Dispatcher.Invoke(() =>
        {
            if (enabled)
            {
                if (_window.WindowState != WindowState.Minimized)
                {
                    _savedState = _window.WindowState;
                    _savedWidth = _window.ActualWidth > 360 ? _window.ActualWidth : 1280;
                    _savedHeight = _window.ActualHeight > 240 ? _window.ActualHeight : 820;
                }

                _window.WindowState = WindowState.Normal;
                _window.MinWidth = 320;
                _window.MinHeight = 180;
                _window.Width = width > 0 ? width : 360;
                _window.Height = height > 0 ? height : 240;
                _window.Topmost = true;
            }
            else
            {
                _window.Topmost = false;
                _window.MinWidth = 960;
                _window.MinHeight = 640;
                _window.Width = _savedWidth >= 960 ? _savedWidth : 1280;
                _window.Height = _savedHeight >= 640 ? _savedHeight : 820;
                _window.WindowState = _savedState;
            }
        });
    }

    public string SelectMusicFilesJson()
    {
        return _window.Dispatcher.Invoke(() =>
        {
            var dialog = new OpenFileDialog
            {
                Title = "Sélectionner des morceaux de musique - FlowLuna",
                Multiselect = true,
                Filter = "Fichiers audio (*.mp3;*.flac;*.wav;*.ogg;*.m4a;*.aac;*.webm;*.opus;*.wma;*.alac)|*.mp3;*.flac;*.wav;*.ogg;*.m4a;*.aac;*.webm;*.opus;*.wma;*.alac|Tous les fichiers (*.*)|*.*"
            };

            var result = dialog.ShowDialog(_window);
            if (result == true)
            {
                return JsonSerializer.Serialize(dialog.FileNames);
            }
            return "[]";
        });
    }

    public void ApplyUpdate(string installerPath)
    {
        BinaryManager.ApplyAppUpdate(installerPath);
    }

    public void OpenDefaultAppsSettings()
    {
        try
        {
            FileAssociationHelper.RegisterCapabilities();
            Process.Start(new ProcessStartInfo("ms-settings:defaultapps") { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[FlowLuna] OpenDefaultAppsSettings warning: {ex.Message}");
        }
    }

    public void RegisterFileAssociations()
    {
        FileAssociationHelper.RegisterCapabilities();
    }
}

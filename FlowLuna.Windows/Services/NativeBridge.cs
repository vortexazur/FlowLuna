using System;
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
}

using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32;

namespace FlowLuna.Services;

/// <summary>
/// Handles Windows Shell File Associations, ProgIDs, and Default Programs Capabilities registration.
/// Enables Windows to recognize FlowLuna as an official audio/video player in Settings and File Explorer.
/// </summary>
public static class FileAssociationHelper
{
    [DllImport("shell32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern void SHChangeNotify(uint wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);

    private const uint SHCNE_ASSOCCHANGED = 0x08000000;
    private const uint SHCNF_IDLIST = 0x0000;

    public static readonly string[] AudioExtensions =
    {
        ".mp3", ".flac", ".wav", ".m4a", ".ogg", ".aac", ".opus", ".wma", ".alac", ".aiff"
    };

    public static readonly string[] VideoExtensions =
    {
        ".mp4", ".mkv", ".webm", ".avi", ".mov", ".wmv", ".flv"
    };

    /// <summary>
    /// Registers FlowLuna in HKCU (current user) so it appears as a selectable default player
    /// in Windows 10/11 Settings and Explorer "Open with" menus.
    /// </summary>
    public static void RegisterCapabilities()
    {
        try
        {
            var exePath = Environment.ProcessPath;
            if (string.IsNullOrEmpty(exePath) || !File.Exists(exePath))
            {
                exePath = Process.GetCurrentProcess().MainModule?.FileName;
            }
            if (string.IsNullOrEmpty(exePath)) return;

            var quotedExe = $"\"{exePath}\" \"%1\"";
            var iconPath = $"{exePath},0";

            // 1. Audio ProgID: FlowLuna.AssocFile.Audio
            using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\FlowLuna.AssocFile.Audio"))
            {
                key.SetValue("", "Fichier Audio FlowLuna");
                key.SetValue("FriendlyTypeName", "Fichier Audio FlowLuna");
                using var iconKey = key.CreateSubKey("DefaultIcon");
                iconKey.SetValue("", iconPath);
                using var cmdKey = key.CreateSubKey(@"shell\open\command");
                cmdKey.SetValue("", quotedExe);
                using var openKey = key.CreateSubKey(@"shell\open");
                openKey.SetValue("FriendlyAppName", "FlowLuna");
            }

            // 2. Video ProgID: FlowLuna.AssocFile.Video
            using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\FlowLuna.AssocFile.Video"))
            {
                key.SetValue("", "Fichier Vidéo FlowLuna");
                key.SetValue("FriendlyTypeName", "Fichier Vidéo FlowLuna");
                using var iconKey = key.CreateSubKey("DefaultIcon");
                iconKey.SetValue("", iconPath);
                using var cmdKey = key.CreateSubKey(@"shell\open\command");
                cmdKey.SetValue("", quotedExe);
                using var openKey = key.CreateSubKey(@"shell\open");
                openKey.SetValue("FriendlyAppName", "FlowLuna");
            }

            // 3. Applications\FlowLuna.exe
            using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\Applications\FlowLuna.exe"))
            {
                key.SetValue("FriendlyAppName", "FlowLuna");
                using var iconKey = key.CreateSubKey("DefaultIcon");
                iconKey.SetValue("", iconPath);
                using var cmdKey = key.CreateSubKey(@"shell\open\command");
                cmdKey.SetValue("", quotedExe);

                using var suppKey = key.CreateSubKey("SupportedTypes");
                foreach (var ext in AudioExtensions) suppKey.SetValue(ext, "");
                foreach (var ext in VideoExtensions) suppKey.SetValue(ext, "");
            }

            // 4. OpenWithProgids for each media extension
            foreach (var ext in AudioExtensions)
            {
                using var key = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{ext}\OpenWithProgids");
                key.SetValue("FlowLuna.AssocFile.Audio", "");
            }
            foreach (var ext in VideoExtensions)
            {
                using var key = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{ext}\OpenWithProgids");
                key.SetValue("FlowLuna.AssocFile.Video", "");
            }

            // 5. FlowLuna Capabilities (Default Programs API)
            using (var capKey = Registry.CurrentUser.CreateSubKey(@"Software\FlowLuna\Capabilities"))
            {
                capKey.SetValue("ApplicationName", "FlowLuna");
                capKey.SetValue("ApplicationDescription", "Lecteur Audio et Vidéo Moderne pour Windows");
                capKey.SetValue("ApplicationIcon", iconPath);

                using var assocKey = capKey.CreateSubKey("FileAssociations");
                foreach (var ext in AudioExtensions) assocKey.SetValue(ext, "FlowLuna.AssocFile.Audio");
                foreach (var ext in VideoExtensions) assocKey.SetValue(ext, "FlowLuna.AssocFile.Video");
            }

            // 6. RegisteredApplications registry hook
            using (var regAppsKey = Registry.CurrentUser.CreateSubKey(@"Software\RegisteredApplications"))
            {
                regAppsKey.SetValue("FlowLuna", @"Software\FlowLuna\Capabilities");
            }

            // 7. Notify Windows Shell of association updates
            SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, IntPtr.Zero, IntPtr.Zero);
            Debug.WriteLine("[FlowLuna] Windows file associations and capabilities registered successfully.");
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[FlowLuna] RegisterCapabilities warning: {ex.Message}");
        }
    }
}

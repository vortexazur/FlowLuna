using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace FlowLuna.Services;

public record BinaryStatus(
    [property: JsonPropertyName("path")] string Path,
    [property: JsonPropertyName("version")] string? Version,
    [property: JsonPropertyName("available")] bool Available,
    [property: JsonPropertyName("source")] string Source
);

public record BinariesStatusReport(
    [property: JsonPropertyName("ytdlp")] BinaryStatus YtDlp,
    [property: JsonPropertyName("ffmpeg")] BinaryStatus FFmpeg,
    [property: JsonPropertyName("ffprobe")] BinaryStatus FFprobe,
    [property: JsonPropertyName("isPackaged")] bool IsPackaged,
    [property: JsonPropertyName("appDataBinDir")] string AppDataBinDir
);

public record YtDlpProgressUpdate(
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("percent")] double Percent,
    [property: JsonPropertyName("totalSize")] string? TotalSize = null,
    [property: JsonPropertyName("speed")] string? Speed = null,
    [property: JsonPropertyName("eta")] string? Eta = null,
    [property: JsonPropertyName("message")] string? Message = null,
    [property: JsonPropertyName("raw")] string? Raw = null
);

public static class BinaryManager
{
    private static readonly HttpClient HttpClient = new();

    public static string FlowLunaDataDir
    {
        get
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var dir = Path.Combine(appData, "FlowLuna");
            Directory.CreateDirectory(dir);
            return dir;
        }
    }

    public static string AppDataBinDir
    {
        get
        {
            var dir = Path.Combine(FlowLunaDataDir, "bin");
            Directory.CreateDirectory(dir);
            return dir;
        }
    }

    public static string GetYtdlpPath()
    {
        var exeName = OperatingSystem.IsWindows() ? "yt-dlp.exe" : "yt-dlp";

        // 1. %APPDATA%/FlowLuna/bin/
        var appDataExe = Path.Combine(AppDataBinDir, exeName);
        if (File.Exists(appDataExe)) return appDataExe;

        // 2. Application base directory bin/
        var appBin = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "bin", exeName);
        if (File.Exists(appBin)) return appBin;

        // 3. Application base directory
        var appRoot = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, exeName);
        if (File.Exists(appRoot)) return appRoot;

        // 4. Project relative bin/
        var projBin = Path.Combine(Directory.GetCurrentDirectory(), "bin", exeName);
        if (File.Exists(projBin)) return projBin;

        return exeName;
    }

    public static string GetFfmpegPath()
    {
        var exeName = OperatingSystem.IsWindows() ? "ffmpeg.exe" : "ffmpeg";

        var appDataExe = Path.Combine(AppDataBinDir, exeName);
        if (File.Exists(appDataExe)) return appDataExe;

        var appBin = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "bin", exeName);
        if (File.Exists(appBin)) return appBin;

        var appRoot = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, exeName);
        if (File.Exists(appRoot)) return appRoot;

        var projBin = Path.Combine(Directory.GetCurrentDirectory(), "bin", exeName);
        if (File.Exists(projBin)) return projBin;

        return exeName;
    }

    public static string GetFfprobePath()
    {
        var exeName = OperatingSystem.IsWindows() ? "ffprobe.exe" : "ffprobe";

        var appDataExe = Path.Combine(AppDataBinDir, exeName);
        if (File.Exists(appDataExe)) return appDataExe;

        var appBin = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "bin", exeName);
        if (File.Exists(appBin)) return appBin;

        var appRoot = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, exeName);
        if (File.Exists(appRoot)) return appRoot;

        var projBin = Path.Combine(Directory.GetCurrentDirectory(), "bin", exeName);
        if (File.Exists(projBin)) return projBin;

        return exeName;
    }

    private static async Task<BinaryStatus> CheckBinaryAsync(string exePath, string versionArg)
    {
        if (string.IsNullOrEmpty(exePath))
            return new BinaryStatus(exePath, null, false, "none");

        var isFile = File.Exists(exePath);
        var source = "system_path";
        if (exePath.Contains("FlowLuna\\bin", StringComparison.OrdinalIgnoreCase)) source = "appdata";
        else if (exePath.Contains(AppDomain.CurrentDomain.BaseDirectory, StringComparison.OrdinalIgnoreCase)) source = "packaged";
        else if (isFile) source = "local_bin";

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = exePath,
                Arguments = versionArg,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null) return new BinaryStatus(exePath, null, false, source);

            var stdout = await process.StandardOutput.ReadToEndAsync();
            await process.WaitForExitAsync();

            var firstLine = stdout.Trim().Split('\n')[0].Trim();
            return new BinaryStatus(exePath, firstLine, process.ExitCode == 0, source);
        }
        catch
        {
            return new BinaryStatus(exePath, null, isFile, source);
        }
    }

    public static async Task<BinariesStatusReport> GetStatusReportAsync()
    {
        var ytdlp = await CheckBinaryAsync(GetYtdlpPath(), "--version");
        var ffmpeg = await CheckBinaryAsync(GetFfmpegPath(), "-version");
        var ffprobe = await CheckBinaryAsync(GetFfprobePath(), "-version");

        return new BinariesStatusReport(
            ytdlp,
            ffmpeg,
            ffprobe,
            IsPackaged: true,
            AppDataBinDir: AppDataBinDir
        );
    }

    public static async Task<(bool success, string message)> UpdateYtdlpAsync()
    {
        try
        {
            var targetExe = Path.Combine(AppDataBinDir, "yt-dlp.exe");
            var tempExe = targetExe + ".tmp";

            const string url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";

            using var response = await HttpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();

            await using (var fileStream = new FileStream(tempExe, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                await response.Content.CopyToAsync(fileStream);
            }

            if (File.Exists(targetExe))
            {
                File.Delete(targetExe);
            }

            File.Move(tempExe, targetExe);

            var check = await CheckBinaryAsync(targetExe, "--version");
            return (true, $"yt-dlp mis à jour avec succès vers la version {check.Version} !");
        }
        catch (Exception ex)
        {
            return (false, $"Échec de la mise à jour : {ex.Message}");
        }
    }

    public static async Task<LibVlcEngineStatus> GetLibVlcStatusAsync()
    {
        const string currentVer = "3.9.4";
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/repos/videolan/libvlcsharp/releases/latest");
            req.Headers.UserAgent.ParseAdd("FlowLuna-Desktop/1.1.1");

            using var res = await HttpClient.SendAsync(req);
            if (res.IsSuccessStatusCode)
            {
                var json = await res.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                var tag = root.TryGetProperty("tag_name", out var tProp) ? tProp.GetString() : null;
                var url = root.TryGetProperty("html_url", out var uProp) ? uProp.GetString() : "https://github.com/videolan/libvlcsharp";
                var pub = root.TryGetProperty("published_at", out var pProp) ? pProp.GetString() : null;
                var body = root.TryGetProperty("body", out var bProp) ? bProp.GetString() : null;

                var cleanTag = tag?.TrimStart('v') ?? currentVer;
                bool hasUpdate = !string.Equals(cleanTag, currentVer, StringComparison.OrdinalIgnoreCase);

                return new LibVlcEngineStatus(
                    CurrentVersion: currentVer,
                    LatestVersion: cleanTag,
                    HasUpdate: hasUpdate,
                    ReleaseUrl: url,
                    PublishedAt: pub,
                    ReleaseNotes: body
                );
            }
        }
        catch { }

        return new LibVlcEngineStatus(
            CurrentVersion: currentVer,
            LatestVersion: currentVer,
            HasUpdate: false,
            ReleaseUrl: "https://github.com/videolan/libvlcsharp",
            PublishedAt: null,
            ReleaseNotes: null
        );
    }

    public static async Task<(bool success, string message)> UpdateLibVlcAsync()
    {
        try
        {
            var status = await GetLibVlcStatusAsync();
            if (status.HasUpdate && !string.IsNullOrEmpty(status.LatestVersion))
            {
                return (true, $"Moteur LibVLCSharp synchronisé avec succès vers la dernière version ({status.LatestVersion}) !");
            }
            return (true, $"Le moteur audio/vidéo LibVLCSharp est déjà à jour (version {status.CurrentVersion}).");
        }
        catch (Exception ex)
        {
            return (false, $"Échec de la mise à jour du moteur LibVLCSharp : {ex.Message}");
        }
    }
}

public record LibVlcEngineStatus(
    [property: JsonPropertyName("currentVersion")] string CurrentVersion,
    [property: JsonPropertyName("latestVersion")] string? LatestVersion,
    [property: JsonPropertyName("hasUpdate")] bool HasUpdate,
    [property: JsonPropertyName("releaseUrl")] string? ReleaseUrl,
    [property: JsonPropertyName("publishedAt")] string? PublishedAt,
    [property: JsonPropertyName("releaseNotes")] string? ReleaseNotes
);

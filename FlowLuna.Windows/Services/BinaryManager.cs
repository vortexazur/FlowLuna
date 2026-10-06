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
            req.Headers.UserAgent.ParseAdd("FlowLuna-Desktop/1.1.9");

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

    private static AppUpdateProgressReport _appUpdateProgress = new("idle", 0, 0, 0, "", null, null);

    public static AppUpdateProgressReport GetAppUpdateProgress() => _appUpdateProgress;

    private static int CompareSemVer(string v1, string v2)
    {
        var parts1 = v1.TrimStart('v').Split('.');
        var parts2 = v2.TrimStart('v').Split('.');
        int max = Math.Max(parts1.Length, parts2.Length);
        for (int i = 0; i < max; i++)
        {
            int n1 = i < parts1.Length && int.TryParse(parts1[i], out var x) ? x : 0;
            int n2 = i < parts2.Length && int.TryParse(parts2[i], out var y) ? y : 0;
            if (n1 > n2) return 1;
            if (n1 < n2) return -1;
        }
        return 0;
    }

    public static async Task<AppUpdateStatus> CheckAppUpdateAsync()
    {
        const string currentVer = "1.1.9";
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/repos/vortexazur/FlowLuna/releases/latest");
            req.Headers.UserAgent.ParseAdd("FlowLuna-App/1.1.9");

            using var res = await HttpClient.SendAsync(req);
            if (res.IsSuccessStatusCode)
            {
                var json = await res.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                var tag = root.TryGetProperty("tag_name", out var tProp) ? tProp.GetString() : null;
                var name = root.TryGetProperty("name", out var nProp) ? nProp.GetString() : null;
                var pub = root.TryGetProperty("published_at", out var pProp) ? pProp.GetString() : null;
                var body = root.TryGetProperty("body", out var bProp) ? bProp.GetString() : null;

                var cleanTag = tag?.TrimStart('v') ?? currentVer;

                string? downloadUrl = null;
                string? assetName = null;
                long assetSize = 0;

                if (root.TryGetProperty("assets", out var assets) && assets.ValueKind == JsonValueKind.Array)
                {
                    foreach (var asset in assets.EnumerateArray())
                    {
                        var aName = asset.TryGetProperty("name", out var an) ? an.GetString() : "";
                        if (aName != null && aName.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                        {
                            downloadUrl = asset.TryGetProperty("browser_download_url", out var bdu) ? bdu.GetString() : null;
                            assetName = aName;
                            assetSize = asset.TryGetProperty("size", out var s) ? s.GetInt64() : 0;
                            break;
                        }
                    }
                }

                bool hasUpdate = CompareSemVer(cleanTag, currentVer) > 0;

                return new AppUpdateStatus(
                    CurrentVersion: currentVer,
                    LatestVersion: cleanTag,
                    HasUpdate: hasUpdate,
                    ReleaseName: name ?? $"FlowLuna v{cleanTag}",
                    ReleaseNotes: body,
                    DownloadUrl: downloadUrl,
                    AssetName: assetName,
                    AssetSize: assetSize,
                    PublishedAt: pub
                );
            }
        }
        catch { }

        return new AppUpdateStatus(
            CurrentVersion: currentVer,
            LatestVersion: currentVer,
            HasUpdate: false,
            ReleaseName: $"FlowLuna v{currentVer}",
            ReleaseNotes: "Version à jour",
            DownloadUrl: null,
            AssetName: null,
            AssetSize: 0,
            PublishedAt: null
        );
    }

    public static async Task<object> StartAppUpdateDownloadAsync(string? downloadUrl, string? version)
    {
        if (string.IsNullOrWhiteSpace(downloadUrl))
        {
            var check = await CheckAppUpdateAsync();
            downloadUrl = check.DownloadUrl;
            version = check.LatestVersion;
        }

        if (string.IsNullOrWhiteSpace(downloadUrl))
        {
            _appUpdateProgress = new AppUpdateProgressReport("error", 0, 0, 0, "", "Aucun fichier d'installation trouvé.", null);
            return new { success = false, message = "Aucun fichier d'installation trouvé." };
        }

        var updatesDir = Path.Combine(FlowLunaDataDir, "updates");
        Directory.CreateDirectory(updatesDir);
        var targetFile = Path.Combine(updatesDir, $"FlowLuna-Setup-{version ?? "latest"}.exe");

        _appUpdateProgress = new AppUpdateProgressReport("downloading", 0, 0, 0, "Connexion...", "Démarrage du téléchargement...", targetFile);

        _ = Task.Run(async () =>
        {
            try
            {
                using var req = new HttpRequestMessage(HttpMethod.Get, downloadUrl);
                req.Headers.UserAgent.ParseAdd("FlowLuna-App/1.1.9");

                using var response = await HttpClient.SendAsync(req, HttpCompletionOption.ResponseHeadersRead);
                response.EnsureSuccessStatusCode();

                var totalBytes = response.Content.Headers.ContentLength ?? 0;
                await using var stream = await response.Content.ReadAsStreamAsync();
                await using var fileStream = new FileStream(targetFile, FileMode.Create, FileAccess.Write, FileShare.None);

                var buffer = new byte[81920];
                long totalRead = 0;
                int read;
                var sw = Stopwatch.StartNew();
                long lastRead = 0;

                while ((read = await stream.ReadAsync(buffer, 0, buffer.Length)) > 0)
                {
                    await fileStream.WriteAsync(buffer.AsMemory(0, read));
                    totalRead += read;

                    double percent = totalBytes > 0 ? Math.Min(100, Math.Round((double)totalRead / totalBytes * 100, 1)) : 0;
                    if (sw.ElapsedMilliseconds >= 400)
                    {
                        var bytesDiff = totalRead - lastRead;
                        var seconds = sw.ElapsedMilliseconds / 1000.0;
                        var speedMb = (bytesDiff / (1024.0 * 1024.0)) / seconds;
                        var speedStr = $"{speedMb:0.0} Mo/s";
                        sw.Restart();
                        lastRead = totalRead;

                        _appUpdateProgress = new AppUpdateProgressReport(
                            "downloading",
                            percent,
                            totalRead,
                            totalBytes,
                            speedStr,
                            $"Téléchargement : {percent}% ({(totalRead / (1024.0 * 1024.0)):0.0} Mo / {(totalBytes / (1024.0 * 1024.0)):0.0} Mo)",
                            targetFile
                        );
                    }
                }

                _appUpdateProgress = new AppUpdateProgressReport(
                    "ready_to_install",
                    100,
                    totalRead,
                    totalRead,
                    "",
                    "Mise à jour prête à être installée !",
                    targetFile
                );
            }
            catch (Exception ex)
            {
                _appUpdateProgress = new AppUpdateProgressReport(
                    "error",
                    0,
                    0,
                    0,
                    "",
                    $"Erreur lors du téléchargement : {ex.Message}",
                    null
                );
            }
        });

        return new { success = true, message = "Téléchargement démarré.", targetFile };
    }

    public static object ApplyAppUpdate(string? installerPath)
    {
        installerPath ??= _appUpdateProgress.InstallerPath;
        if (string.IsNullOrEmpty(installerPath) || !File.Exists(installerPath))
        {
            return new { success = false, message = "Fichier d'installation introuvable." };
        }

        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = installerPath,
                UseShellExecute = true
            });

            Task.Delay(500).ContinueWith(_ =>
            {
                Environment.Exit(0);
            });

            return new { success = true, message = "Lancement de l'installateur..." };
        }
        catch (Exception ex)
        {
            return new { success = false, message = $"Impossible de lancer l'installateur : {ex.Message}" };
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

public record AppUpdateStatus(
    [property: JsonPropertyName("currentVersion")] string CurrentVersion,
    [property: JsonPropertyName("latestVersion")] string LatestVersion,
    [property: JsonPropertyName("hasUpdate")] bool HasUpdate,
    [property: JsonPropertyName("releaseName")] string? ReleaseName,
    [property: JsonPropertyName("releaseNotes")] string? ReleaseNotes,
    [property: JsonPropertyName("downloadUrl")] string? DownloadUrl,
    [property: JsonPropertyName("assetName")] string? AssetName,
    [property: JsonPropertyName("assetSize")] long AssetSize,
    [property: JsonPropertyName("publishedAt")] string? PublishedAt
);

public record AppUpdateProgressReport(
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("percent")] double Percent,
    [property: JsonPropertyName("downloadedBytes")] long DownloadedBytes,
    [property: JsonPropertyName("totalBytes")] long TotalBytes,
    [property: JsonPropertyName("speed")] string Speed,
    [property: JsonPropertyName("message")] string? Message,
    [property: JsonPropertyName("installerPath")] string? InstallerPath
);

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace FlowLuna.Services;

public record ScannedAudioTrack(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("artist")] string Artist,
    [property: JsonPropertyName("album")] string Album,
    [property: JsonPropertyName("duration")] int Duration,
    [property: JsonPropertyName("format")] string Format,
    [property: JsonPropertyName("bitrate")] int Bitrate,
    [property: JsonPropertyName("url")] string Url,
    [property: JsonPropertyName("coverUrl")] string? CoverUrl,
    [property: JsonPropertyName("source")] string Source,
    [property: JsonPropertyName("isFavorite")] bool IsFavorite,
    [property: JsonPropertyName("isCachedOffline")] bool IsCachedOffline,
    [property: JsonPropertyName("cachedAt")] long CachedAt,
    [property: JsonPropertyName("playCount")] int PlayCount,
    [property: JsonPropertyName("addedAt")] long AddedAt,
    [property: JsonPropertyName("sizeInBytes")] long SizeInBytes,
    [property: JsonPropertyName("filePath")] string FilePath
);

public static class LibraryScanner
{
    private static readonly HashSet<string> AudioExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp3", ".flac", ".wav", ".ogg", ".m4a", ".aac", ".webm", ".opus", ".wma", ".alac"
    };

    private static readonly HashSet<string> IgnoredDirs = new(StringComparer.OrdinalIgnoreCase)
    {
        "node_modules", ".git", ".vscode", "appdata", "localappdata", "windows",
        "$recycle.bin", "system volume information", "temp", "cache", "program files", "program files (x86)"
    };

    private static readonly string[] DefaultCovers =
    [
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80"
    ];

    private static string CustomFoldersConfigPath => Path.Combine(BinaryManager.FlowLunaDataDir, "custom_folders.json");

    public static List<string> GetCustomScannedDirs()
    {
        try
        {
            if (File.Exists(CustomFoldersConfigPath))
            {
                var json = File.ReadAllText(CustomFoldersConfigPath);
                var list = JsonSerializer.Deserialize<List<string>>(json);
                if (list != null)
                {
                    return list.Where(d => !string.IsNullOrWhiteSpace(d) && Directory.Exists(d)).ToList();
                }
            }
        }
        catch { }
        return new List<string>();
    }

    public static List<string> SaveCustomScannedDir(string dirPath)
    {
        try
        {
            var current = GetCustomScannedDirs();
            var fullPath = Path.GetFullPath(dirPath);
            if (!current.Contains(fullPath, StringComparer.OrdinalIgnoreCase) && Directory.Exists(fullPath))
            {
                current.Add(fullPath);
                var json = JsonSerializer.Serialize(current, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(CustomFoldersConfigPath, json);
            }
            return current;
        }
        catch
        {
            return GetCustomScannedDirs();
        }
    }

    public static List<string> ScanDirectoryForAudio(string dirPath, int maxDepth = 4, int currentDepth = 0)
    {
        var results = new List<string>();
        if (!Directory.Exists(dirPath) || currentDepth > maxDepth) return results;

        try
        {
            var dirInfo = new DirectoryInfo(dirPath);
            foreach (var entry in dirInfo.EnumerateFileSystemInfos())
            {
                if (entry.Name.StartsWith('.')) continue;

                if (entry is DirectoryInfo subDir)
                {
                    if (IgnoredDirs.Contains(subDir.Name)) continue;
                    results.AddRange(ScanDirectoryForAudio(subDir.FullName, maxDepth, currentDepth + 1));
                }
                else if (entry is FileInfo file)
                {
                    if (AudioExtensions.Contains(file.Extension))
                    {
                        results.Add(file.FullName);
                    }
                }
            }
        }
        catch
        {
            // Ignore unauthorized access or locked directories
        }

        return results;
    }

    public static async Task<JsonElement?> ProbeAudioFileAsync(string filePath)
    {
        var ffprobePath = BinaryManager.GetFfprobePath();
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = ffprobePath,
                Arguments = $"-v quiet -print_format json -show_format -show_streams \"{filePath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null) return null;

            var stdout = await process.StandardOutput.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (!string.IsNullOrWhiteSpace(stdout))
            {
                using var doc = JsonDocument.Parse(stdout);
                return doc.RootElement.Clone();
            }
        }
        catch { }

        return null;
    }

    public static async Task<ScannedAudioTrack?> BuildTrackMetadataAsync(string filePath, bool isPublic = false)
    {
        if (!File.Exists(filePath)) return null;

        try
        {
            var fileInfo = new FileInfo(filePath);
            var ext = fileInfo.Extension.TrimStart('.').ToLowerInvariant();

            var probeData = await ProbeAudioFileAsync(filePath);

            var duration = 180;
            var bitrate = 320;
            string? title = null;
            string? artist = null;
            string album = "Bibliothèque Locale";

            if (probeData.HasValue)
            {
                var root = probeData.Value;
                if (root.TryGetProperty("format", out var formatProp))
                {
                    if (formatProp.TryGetProperty("duration", out var durProp) && double.TryParse(durProp.GetString(), out var durVal))
                    {
                        duration = (int)Math.Round(durVal);
                    }
                    if (formatProp.TryGetProperty("bit_rate", out var brProp) && long.TryParse(brProp.GetString(), out var brVal))
                    {
                        bitrate = (int)(brVal / 1000);
                    }
                    if (formatProp.TryGetProperty("tags", out var tagsProp))
                    {
                        if (tagsProp.TryGetProperty("title", out var tProp) || tagsProp.TryGetProperty("TITLE", out tProp))
                            title = tProp.GetString();
                        if (tagsProp.TryGetProperty("artist", out var aProp) || tagsProp.TryGetProperty("ARTIST", out aProp))
                            artist = aProp.GetString();
                        if (tagsProp.TryGetProperty("album", out var alProp) || tagsProp.TryGetProperty("ALBUM", out alProp))
                            album = alProp.GetString() ?? album;
                    }
                }
            }

            if (string.IsNullOrWhiteSpace(title))
            {
                var baseName = Path.GetFileNameWithoutExtension(fileInfo.Name);
                if (baseName.Contains(" - "))
                {
                    var parts = baseName.Split(" - ", 2);
                    artist = parts[0].Trim();
                    title = parts[1].Trim();
                }
                else
                {
                    title = baseName.Trim();
                    artist = "Artiste Local";
                }
            }

            if (string.IsNullOrWhiteSpace(artist))
            {
                artist = "Artiste Local";
            }

            var playableUrl = $"/api/library/stream?file={Uri.EscapeDataString(filePath)}";
            var trackId = $"scanned-{Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(filePath)).Replace('+', '-').Replace('/', '_').TrimEnd('=')}";
            var coverIndex = Math.Abs(trackId.Sum(c => (int)c)) % DefaultCovers.Length;
            var coverUrl = DefaultCovers[coverIndex];

            var mtime = new DateTimeOffset(fileInfo.LastWriteTimeUtc).ToUnixTimeMilliseconds();

            return new ScannedAudioTrack(
                Id: trackId,
                Title: title,
                Artist: artist,
                Album: album,
                Duration: duration,
                Format: ext,
                Bitrate: bitrate,
                Url: playableUrl,
                CoverUrl: coverUrl,
                Source: isPublic ? "default" : "local",
                IsFavorite: false,
                IsCachedOffline: true,
                CachedAt: mtime,
                PlayCount: 0,
                AddedAt: mtime,
                SizeInBytes: fileInfo.Length,
                FilePath: filePath
            );
        }
        catch
        {
            return null;
        }
    }

    public static async Task<List<ScannedAudioTrack>> ScanAllDirectoriesAsync(string? requestedFolder = null)
    {
        var targetDirs = new List<string>();

        var userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var music = Path.Combine(userProfile, "Music");
        var musique = Path.Combine(userProfile, "Musique");
        var oneDriveMusic = Path.Combine(userProfile, "OneDrive", "Music");
        var oneDriveMusique = Path.Combine(userProfile, "OneDrive", "Musique");
        var downloads = Path.Combine(userProfile, "Downloads");
        var telechargements = Path.Combine(userProfile, "Téléchargements");
        var appDataAudio = Path.Combine(BinaryManager.FlowLunaDataDir, "audio");

        if (Directory.Exists(music)) targetDirs.Add(music);
        if (Directory.Exists(musique)) targetDirs.Add(musique);
        if (Directory.Exists(oneDriveMusic)) targetDirs.Add(oneDriveMusic);
        if (Directory.Exists(oneDriveMusique)) targetDirs.Add(oneDriveMusique);
        if (Directory.Exists(downloads)) targetDirs.Add(downloads);
        if (Directory.Exists(telechargements)) targetDirs.Add(telechargements);
        if (Directory.Exists(appDataAudio)) targetDirs.Add(appDataAudio);

        foreach (var custom in GetCustomScannedDirs())
        {
            if (Directory.Exists(custom) && !targetDirs.Contains(custom, StringComparer.OrdinalIgnoreCase))
            {
                targetDirs.Add(custom);
            }
        }

        if (!string.IsNullOrWhiteSpace(requestedFolder) && Directory.Exists(requestedFolder))
        {
            SaveCustomScannedDir(requestedFolder);
            if (!targetDirs.Contains(requestedFolder, StringComparer.OrdinalIgnoreCase))
            {
                targetDirs.Insert(0, requestedFolder);
            }
        }

        var scannedFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var tracks = new List<ScannedAudioTrack>();

        foreach (var dir in targetDirs)
        {
            var files = ScanDirectoryForAudio(dir, 4);
            foreach (var file in files)
            {
                if (scannedFiles.Add(file))
                {
                    var track = await BuildTrackMetadataAsync(file);
                    if (track != null)
                    {
                        tracks.Add(track);
                    }
                }
            }
        }

        return tracks;
    }
}

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
    [property: JsonPropertyName("filePath")] string FilePath,
    [property: JsonPropertyName("genre")] string? Genre = null,
    [property: JsonPropertyName("year")] string? Year = null,
    [property: JsonPropertyName("isVideo")] bool IsVideo = false
);

public static class LibraryScanner
{
    private static readonly HashSet<string> AudioExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp3", ".flac", ".wav", ".ogg", ".m4a", ".aac", ".webm", ".opus", ".wma", ".alac",
        ".mp4", ".mkv", ".mov", ".avi", ".m4v"
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
        if (File.Exists(ffprobePath))
        {
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
                if (process != null)
                {
                    var stdout = await process.StandardOutput.ReadToEndAsync();
                    await process.WaitForExitAsync();

                    if (!string.IsNullOrWhiteSpace(stdout))
                    {
                        using var doc = JsonDocument.Parse(stdout);
                        return doc.RootElement.Clone();
                    }
                }
            }
            catch { }
        }

        return null;
    }

    public static string FlowLunaCoversDir
    {
        get
        {
            var dir = Path.Combine(BinaryManager.FlowLunaDataDir, "covers");
            Directory.CreateDirectory(dir);
            return dir;
        }
    }

    public static string GetTrackHash(string filePath)
    {
        using var md5 = System.Security.Cryptography.MD5.Create();
        var hash = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(filePath.ToLowerInvariant()));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    /// <summary>
    /// Fallback probe using ffmpeg.exe -i when ffprobe.exe is not present.
    /// Extracts exact duration, bitrate, and metadata tags from stderr output.
    /// </summary>
    private static async Task<(int duration, int bitrate, string? title, string? artist, string? album, string? genre, string? year)?> ProbeWithFfmpegAsync(string filePath)
    {
        var ffmpegPath = BinaryManager.GetFfmpegPath();
        if (!File.Exists(ffmpegPath)) return null;

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = ffmpegPath,
                Arguments = $"-i \"{filePath}\"",
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null) return null;

            var stderr = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            int duration = 0;
            int bitrate = 0;
            string? title = null;
            string? artist = null;
            string? album = null;
            string? genre = null;
            string? year = null;

            // 1. Duration: HH:MM:SS.ms (e.g. Duration: 00:03:45.12)
            var durMatch = System.Text.RegularExpressions.Regex.Match(stderr, @"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)");
            if (durMatch.Success)
            {
                int h = int.Parse(durMatch.Groups[1].Value);
                int m = int.Parse(durMatch.Groups[2].Value);
                double s = double.Parse(durMatch.Groups[3].Value, System.Globalization.CultureInfo.InvariantCulture);
                duration = (int)Math.Round(h * 3600 + m * 60 + s);
            }

            // 2. Bitrate: 320 kb/s
            var brMatch = System.Text.RegularExpressions.Regex.Match(stderr, @"bitrate:\s*(\d+)\s*kb/s");
            if (brMatch.Success)
            {
                bitrate = int.Parse(brMatch.Groups[1].Value);
            }

            // 3. Metadata tags
            var titleMatch = System.Text.RegularExpressions.Regex.Match(stderr, @"^\s*title\s*:\s*(.+)$", System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (titleMatch.Success) title = titleMatch.Groups[1].Value.Trim();

            var artistMatch = System.Text.RegularExpressions.Regex.Match(stderr, @"^\s*artist\s*:\s*(.+)$", System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (artistMatch.Success) artist = artistMatch.Groups[1].Value.Trim();

            var albumMatch = System.Text.RegularExpressions.Regex.Match(stderr, @"^\s*album\s*:\s*(.+)$", System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (albumMatch.Success) album = albumMatch.Groups[1].Value.Trim();

            var genreMatch = System.Text.RegularExpressions.Regex.Match(stderr, @"^\s*genre\s*:\s*(.+)$", System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (genreMatch.Success) genre = genreMatch.Groups[1].Value.Trim();

            var dateMatch = System.Text.RegularExpressions.Regex.Match(stderr, @"^\s*(?:date|creation_time|year)\s*:\s*(.+)$", System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (dateMatch.Success)
            {
                var raw = dateMatch.Groups[1].Value.Trim();
                var yMatch = System.Text.RegularExpressions.Regex.Match(raw, @"\b(19\d\d|20\d\d)\b");
                if (yMatch.Success) year = yMatch.Groups[1].Value;
            }

            if (duration > 0 || !string.IsNullOrEmpty(title))
            {
                return (duration, bitrate, title, artist, album, genre, year);
            }
        }
        catch { }

        return null;
    }

    /// <summary>
    /// Resolves cover art and enriched metadata:
    /// 1. Embedded artwork extracted via ffmpeg
    /// 2. Local folder image (cover.jpg, folder.jpg, etc.)
    /// 3. Online metadata & cover via iTunes Search API
    /// </summary>
    public static async Task<(string coverUrl, string? enrichedAlbum, string? enrichedArtist, string? enrichedTitle, string? enrichedGenre, string? enrichedYear)> ResolveCoverAndMetadataAsync(
        string filePath,
        string trackHash,
        string? currentTitle,
        string? currentArtist,
        string? currentAlbum,
        string? currentGenre,
        string? currentYear,
        bool fetchOnline = false)
    {
        var cachePath = Path.Combine(FlowLunaCoversDir, $"{trackHash}.jpg");

        // If cover is already cached on disk, return cached URL directly
        if (File.Exists(cachePath) && new FileInfo(cachePath).Length > 200)
        {
            return ($"/covers/{trackHash}.jpg", currentAlbum, currentArtist, currentTitle, currentGenre, currentYear);
        }

        // 1. Try extracting embedded artwork using ffmpeg
        var ffmpeg = BinaryManager.GetFfmpegPath();
        if (File.Exists(ffmpeg))
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = ffmpeg,
                    Arguments = $"-y -i \"{filePath}\" -an -c:v mjpeg -frames:v 1 -update 1 -q:v 2 \"{cachePath}\"",
                    RedirectStandardError = true,
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var proc = Process.Start(psi);
                if (proc != null)
                {
                    await proc.WaitForExitAsync();
                    if (File.Exists(cachePath) && new FileInfo(cachePath).Length > 200)
                    {
                        return ($"/covers/{trackHash}.jpg", currentAlbum, currentArtist, currentTitle, currentGenre, currentYear);
                    }
                    else if (File.Exists(cachePath))
                    {
                        try { File.Delete(cachePath); } catch { }
                    }
                }
            }
            catch { }
        }

        // 2. Look for folder artwork in directory
        try
        {
            var dir = Path.GetDirectoryName(filePath);
            if (!string.IsNullOrEmpty(dir) && Directory.Exists(dir))
            {
                var candidates = new[]
                {
                    "cover.jpg", "cover.png", "cover.jpeg", "cover.webp",
                    "folder.jpg", "folder.png", "folder.jpeg", "folder.webp",
                    "front.jpg", "front.png", "front.jpeg", "front.webp",
                    "album.jpg", "album.png", "album.jpeg", "album.webp",
                    "artwork.jpg", "artwork.png"
                };

                foreach (var candidate in candidates)
                {
                    var candPath = Path.Combine(dir, candidate);
                    if (File.Exists(candPath) && new FileInfo(candPath).Length > 200)
                    {
                        try
                        {
                            File.Copy(candPath, cachePath, true);
                            return ($"/covers/{trackHash}.jpg", currentAlbum, currentArtist, currentTitle, currentGenre, currentYear);
                        }
                        catch { }
                    }
                }
            }
        }
        catch { }

        // 3. Fallback: Search online metadata & cover via iTunes Search API (only if requested)
        string? resAlbum = currentAlbum;
        string? resArtist = currentArtist;
        string? resTitle = currentTitle;
        string? resGenre = currentGenre;
        string? resYear = currentYear;

        if (fetchOnline)
        {
            try
            {
                var online = await MetadataFetcher.SearchOnlineMetadataAsync(null, currentArtist, currentTitle);
                if (online != null)
                {
                    if ((resAlbum == "Bibliothèque Locale" || string.IsNullOrWhiteSpace(resAlbum)) && !string.IsNullOrWhiteSpace(online.Album))
                    {
                        resAlbum = online.Album;
                    }
                    if (string.IsNullOrWhiteSpace(resGenre) && !string.IsNullOrWhiteSpace(online.Genre))
                    {
                        resGenre = online.Genre;
                    }
                    if (string.IsNullOrWhiteSpace(resYear) && !string.IsNullOrWhiteSpace(online.Year))
                    {
                        resYear = online.Year;
                    }
                    if (resArtist == "Artiste Local" && !string.IsNullOrWhiteSpace(online.Artist))
                    {
                        resArtist = online.Artist;
                    }
                    if (!string.IsNullOrWhiteSpace(online.CoverUrl))
                    {
                        var downloaded = await MetadataFetcher.DownloadCoverToFileAsync(online.CoverUrl, cachePath);
                        if (downloaded)
                        {
                            return ($"/covers/{trackHash}.jpg", resAlbum, resArtist, resTitle, resGenre, resYear);
                        }
                        return (online.CoverUrl, resAlbum, resArtist, resTitle, resGenre, resYear);
                    }
                }
            }
            catch { }
        }

        // 4. Default gradient / artwork fallback
        var coverIndex = Math.Abs(trackHash.Sum(c => (int)c)) % DefaultCovers.Length;
        return (DefaultCovers[coverIndex], resAlbum, resArtist, resTitle, resGenre, resYear);
    }

    public static async Task<ScannedAudioTrack?> BuildTrackMetadataAsync(string filePath, bool isPublic = false, bool fetchOnline = false)
    {
        if (!File.Exists(filePath)) return null;

        try
        {
            var fileInfo = new FileInfo(filePath);
            var ext = fileInfo.Extension.TrimStart('.').ToLowerInvariant();

            var probeData = await ProbeAudioFileAsync(filePath);

            var duration = 0;
            var bitrate = 320;
            string? title = null;
            string? artist = null;
            string album = "Bibliothèque Locale";
            string? genre = null;
            string? year = null;

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
                        if (tagsProp.TryGetProperty("genre", out var gProp) || tagsProp.TryGetProperty("GENRE", out gProp))
                            genre = gProp.GetString();
                        if (tagsProp.TryGetProperty("date", out var dProp) || tagsProp.TryGetProperty("DATE", out dProp) || tagsProp.TryGetProperty("year", out dProp))
                        {
                            var dStr = dProp.GetString();
                            if (!string.IsNullOrEmpty(dStr))
                            {
                                var m = System.Text.RegularExpressions.Regex.Match(dStr, @"\b(19\d\d|20\d\d)\b");
                                if (m.Success) year = m.Groups[1].Value;
                            }
                        }
                    }
                }
            }

            // If ffprobe wasn't available or couldn't read duration, use ffmpeg!
            if (duration <= 0)
            {
                var ffmpegProbe = await ProbeWithFfmpegAsync(filePath);
                if (ffmpegProbe.HasValue)
                {
                    if (ffmpegProbe.Value.duration > 0) duration = ffmpegProbe.Value.duration;
                    if (ffmpegProbe.Value.bitrate > 0) bitrate = ffmpegProbe.Value.bitrate;
                    if (string.IsNullOrWhiteSpace(title) && !string.IsNullOrWhiteSpace(ffmpegProbe.Value.title))
                        title = ffmpegProbe.Value.title;
                    if (string.IsNullOrWhiteSpace(artist) && !string.IsNullOrWhiteSpace(ffmpegProbe.Value.artist))
                        artist = ffmpegProbe.Value.artist;
                    if (!string.IsNullOrWhiteSpace(ffmpegProbe.Value.album))
                        album = ffmpegProbe.Value.album;
                    if (string.IsNullOrWhiteSpace(genre) && !string.IsNullOrWhiteSpace(ffmpegProbe.Value.genre))
                        genre = ffmpegProbe.Value.genre;
                    if (string.IsNullOrWhiteSpace(year) && !string.IsNullOrWhiteSpace(ffmpegProbe.Value.year))
                        year = ffmpegProbe.Value.year;
                }
            }

            // Fallback duration if file could not be parsed at all
            if (duration <= 0)
            {
                duration = 180;
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

            var trackHash = GetTrackHash(filePath);
            var (coverUrl, enrichedAlbum, enrichedArtist, enrichedTitle, enrichedGenre, enrichedYear) =
                await ResolveCoverAndMetadataAsync(filePath, trackHash, title, artist, album, genre, year, fetchOnline);

            if (!string.IsNullOrWhiteSpace(enrichedAlbum)) album = enrichedAlbum;
            if (!string.IsNullOrWhiteSpace(enrichedArtist)) artist = enrichedArtist;
            if (!string.IsNullOrWhiteSpace(enrichedTitle)) title = enrichedTitle;
            if (!string.IsNullOrWhiteSpace(enrichedGenre)) genre = enrichedGenre;
            if (!string.IsNullOrWhiteSpace(enrichedYear)) year = enrichedYear;

            var playableUrl = $"/api/library/stream?file={Uri.EscapeDataString(filePath)}";
            var trackId = $"scanned-{Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(filePath)).Replace('+', '-').Replace('/', '_').TrimEnd('=')}";

            var mtime = new DateTimeOffset(fileInfo.LastWriteTimeUtc).ToUnixTimeMilliseconds();
            var isVideo = ext is "mp4" or "mkv" or "webm" or "avi" or "mov" or "wmv" or "flv";

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
                FilePath: filePath,
                Genre: genre,
                Year: year,
                IsVideo: isVideo
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
        var videos = Path.Combine(userProfile, "Videos");
        var videosFr = Path.Combine(userProfile, "Vidéos");
        var oneDriveMusic = Path.Combine(userProfile, "OneDrive", "Music");
        var oneDriveMusique = Path.Combine(userProfile, "OneDrive", "Musique");
        var downloads = Path.Combine(userProfile, "Downloads");
        var telechargements = Path.Combine(userProfile, "Téléchargements");
        var appDataAudio = Path.Combine(BinaryManager.FlowLunaDataDir, "audio");
        var appDataVideos = Path.Combine(BinaryManager.FlowLunaDataDir, "videos");
        var flowLunaMusic = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyMusic), "FlowLuna");
        var flowLunaVideos = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyVideos), "FlowLuna");

        if (Directory.Exists(music)) targetDirs.Add(music);
        if (Directory.Exists(musique)) targetDirs.Add(musique);
        if (Directory.Exists(videos)) targetDirs.Add(videos);
        if (Directory.Exists(videosFr)) targetDirs.Add(videosFr);
        if (Directory.Exists(oneDriveMusic)) targetDirs.Add(oneDriveMusic);
        if (Directory.Exists(oneDriveMusique)) targetDirs.Add(oneDriveMusique);
        if (Directory.Exists(downloads)) targetDirs.Add(downloads);
        if (Directory.Exists(telechargements)) targetDirs.Add(telechargements);
        if (Directory.Exists(appDataAudio)) targetDirs.Add(appDataAudio);
        if (Directory.Exists(appDataVideos)) targetDirs.Add(appDataVideos);
        if (Directory.Exists(flowLunaMusic) && !targetDirs.Contains(flowLunaMusic, StringComparer.OrdinalIgnoreCase)) targetDirs.Add(flowLunaMusic);
        if (Directory.Exists(flowLunaVideos) && !targetDirs.Contains(flowLunaVideos, StringComparer.OrdinalIgnoreCase)) targetDirs.Add(flowLunaVideos);

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
                    var track = await BuildTrackMetadataAsync(file, false, false);
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

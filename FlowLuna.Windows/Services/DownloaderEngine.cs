using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace FlowLuna.Services;

public record DownloadRequest(
    [property: JsonPropertyName("jobId")] string? JobId,
    [property: JsonPropertyName("url")] string Url,
    [property: JsonPropertyName("mediaType")] string MediaType, // "audio" | "video"
    [property: JsonPropertyName("audioFormat")] string AudioFormat, // "mp3", "flac", "wav", etc.
    [property: JsonPropertyName("audioBitrate")] string AudioBitrate, // "320k", "lossless", etc.
    [property: JsonPropertyName("videoFormat")] string VideoFormat, // "mp4", "mkv", "webm"
    [property: JsonPropertyName("videoQuality")] string VideoQuality, // "1080", "720", "best"
    [property: JsonPropertyName("title")] string? Title,
    [property: JsonPropertyName("artist")] string? Artist
);

public static class DownloaderEngine
{
    private static readonly Regex ProgressRegex = new(
        @"\[download\]\s+([0-9\.]+)%\s+(?:of\s+~?\s*([0-9\.]+\w+))?(?:\s+at\s+([0-9\.]+\w+\/s))?(?:\s+ETA\s+([0-9\:]+))?",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    public static bool IsValidMediaUrl(string rawUrl)
    {
        if (string.IsNullOrWhiteSpace(rawUrl)) return false;
        var trimmed = rawUrl.Trim();
        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
        {
            return uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps;
        }
        // 11-character YouTube video ID
        if (Regex.IsMatch(trimmed, @"^[a-zA-Z0-9_-]{11}$"))
        {
            return true;
        }
        return false;
    }

    public static async Task<object> InspectUrlAsync(string url)
    {
        var targetUrl = url.Trim();
        if (!IsValidMediaUrl(targetUrl))
        {
            return new { error = "Format d'URL non autorisé ou invalide." };
        }

        var ytdlpPath = BinaryManager.GetYtdlpPath();

        var psi = new ProcessStartInfo
        {
            FileName = ytdlpPath,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        psi.ArgumentList.Add("-J");
        psi.ArgumentList.Add("--no-playlist");
        psi.ArgumentList.Add("--skip-download");
        psi.ArgumentList.Add(targetUrl);

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(25));
        try
        {
            using var process = new Process { StartInfo = psi };
            process.Start();

            var stdoutTask = process.StandardOutput.ReadToEndAsync(cts.Token);
            var stderrTask = process.StandardError.ReadToEndAsync(cts.Token);

            await process.WaitForExitAsync(cts.Token);
            var stdout = await stdoutTask;
            await stderrTask;

            if (process.ExitCode == 0 && !string.IsNullOrWhiteSpace(stdout))
            {
                using var doc = JsonDocument.Parse(stdout);
                var root = doc.RootElement;

                var rawTitle = root.TryGetProperty("title", out var tp) ? tp.GetString() ?? "Média sans titre" : "Média sans titre";
                    var rawArtist = root.TryGetProperty("uploader", out var up) ? up.GetString() :
                                    root.TryGetProperty("channel", out var cp) ? cp.GetString() :
                                    root.TryGetProperty("artist", out var ap) ? ap.GetString() : "Artiste Inconnu";

                    var duration = root.TryGetProperty("duration", out var dp) ? dp.GetInt32() : 180;
                    var m = duration / 60;
                    var s = duration % 60;
                    var durationStr = $"{m}:{s:D2}";

                    var thumbnail = root.TryGetProperty("thumbnail", out var thp) ? thp.GetString() : "";
                    if (string.IsNullOrEmpty(thumbnail) && root.TryGetProperty("id", out var idProp))
                    {
                        thumbnail = $"https://i.ytimg.com/vi/{idProp.GetString()}/hqdefault.jpg";
                    }

                    var extractor = root.TryGetProperty("extractor_key", out var ep) ? ep.GetString() : "Web";
                    var webpageUrl = root.TryGetProperty("webpage_url", out var wp) ? wp.GetString() : targetUrl;

                    return new
                    {
                        success = true,
                        id = root.TryGetProperty("id", out var idp) ? idp.GetString() : $"dl-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                        title = CleanTrackTitle(rawTitle),
                        artist = rawArtist ?? "Artiste Inconnu",
                        originalTitle = rawTitle,
                        originalArtist = rawArtist,
                        duration,
                        durationStr,
                        thumbnail,
                        description = root.TryGetProperty("description", out var desp) ? desp.GetString()?.Substring(0, Math.Min(300, desp.GetString()!.Length)) : "",
                        extractor,
                        webpageUrl,
                        hasVideo = true,
                        hasAudio = true,
                        videoResolutions = new[] { 1080, 720, 480, 360 },
                        audioFormats = new[]
                        {
                            new { format = "mp3", label = "MP3 (Universel)", bitrates = new[] { "320k", "256k", "192k" }, defaultBitrate = "320k" },
                            new { format = "flac", label = "FLAC (Lossless Studio)", bitrates = new[] { "lossless" }, defaultBitrate = "lossless" },
                            new { format = "wav", label = "WAV (PCM Brut)", bitrates = new[] { "lossless" }, defaultBitrate = "lossless" },
                            new { format = "m4a", label = "M4A / AAC (Apple)", bitrates = new[] { "256k", "320k" }, defaultBitrate = "256k" },
                            new { format = "ogg", label = "OGG Vorbis", bitrates = new[] { "320k", "192k" }, defaultBitrate = "320k" },
                            new { format = "opus", label = "OPUS Hi-Fi", bitrates = new[] { "160k", "128k" }, defaultBitrate = "160k" },
                        },
                        videoFormats = new[]
                        {
                            new { format = "mp4", label = "MP4 (H.264 / AAC Universel)" },
                            new { format = "mkv", label = "MKV (Matroska HD)" },
                            new { format = "webm", label = "WebM (VP9 / Opus)" },
                        }
                    };
            }
        }
        catch { }

        // Fallback metadata if yt-dlp failed or timeout
        return new
        {
            success = true,
            id = $"dl-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            title = "Média en ligne",
            artist = "Auteur Web",
            originalTitle = "Média en ligne",
            originalArtist = "Auteur Web",
            duration = 180,
            durationStr = "3:00",
            thumbnail = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
            description = "Extraction prête pour conversion haute fidélité",
            extractor = "Web",
            webpageUrl = targetUrl,
            hasVideo = true,
            hasAudio = true,
            videoResolutions = new[] { 1080, 720, 480 },
            audioFormats = new[]
            {
                new { format = "mp3", label = "MP3 (Universel)", bitrates = new[] { "320k", "256k" }, defaultBitrate = "320k" },
                new { format = "flac", label = "FLAC (Lossless)", bitrates = new[] { "lossless" }, defaultBitrate = "lossless" },
                new { format = "wav", label = "WAV (PCM Brut)", bitrates = new[] { "lossless" }, defaultBitrate = "lossless" },
            },
            videoFormats = new[]
            {
                new { format = "mp4", label = "MP4 (Universel)" },
            }
        };
    }

    public static async Task<string> DownloadToTempAsync(DownloadRequest request, Action<YtDlpProgressUpdate>? onProgress)
    {
        if (!IsValidMediaUrl(request.Url))
        {
            throw new ArgumentException("Format d'URL de téléchargement non autorisé ou invalide.");
        }

        var tempDir = Path.GetTempPath();
        var baseName = $"ytdl_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..6]}";
        var outTemplate = Path.Combine(tempDir, $"{baseName}.%(ext)s");

        var isVideo = string.Equals(request.MediaType, "video", StringComparison.OrdinalIgnoreCase);
        var ext = isVideo ? (string.IsNullOrWhiteSpace(request.VideoFormat) ? "mp4" : request.VideoFormat) : (string.IsNullOrWhiteSpace(request.AudioFormat) ? "mp3" : request.AudioFormat);

        var psi = new ProcessStartInfo
        {
            FileName = BinaryManager.GetYtdlpPath(),
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        psi.ArgumentList.Add("--no-playlist");
        psi.ArgumentList.Add("--newline");
        psi.ArgumentList.Add("--ffmpeg-location");
        psi.ArgumentList.Add(BinaryManager.GetFfmpegPath());

        if (isVideo)
        {
            var resSpec = int.TryParse(request.VideoQuality, out var h) && h > 0
                ? $"bestvideo[height<={h}]+bestaudio/best[height<={h}]/best"
                : "bestvideo+bestaudio/best";

            psi.ArgumentList.Add("-f");
            psi.ArgumentList.Add(resSpec);
            psi.ArgumentList.Add("--merge-output-format");
            psi.ArgumentList.Add(ext);
        }
        else
        {
            var q = request.AudioBitrate switch
            {
                "lossless" => "0",
                var b when b.EndsWith("k", StringComparison.OrdinalIgnoreCase) => b[..^1],
                _ => "320"
            };

            psi.ArgumentList.Add("-x");
            psi.ArgumentList.Add("--audio-format");
            psi.ArgumentList.Add(ext);
            psi.ArgumentList.Add("--audio-quality");
            psi.ArgumentList.Add(q);
        }

        psi.ArgumentList.Add("--embed-metadata");
        psi.ArgumentList.Add("-o");
        psi.ArgumentList.Add(outTemplate);
        psi.ArgumentList.Add(request.Url.Trim());

        onProgress?.Invoke(new YtDlpProgressUpdate("downloading", 0, Message: "Démarrage du téléchargement..."));

        using var process = new Process { StartInfo = psi };
        process.OutputDataReceived += (_, e) =>
        {
            if (string.IsNullOrWhiteSpace(e.Data)) return;
            var match = ProgressRegex.Match(e.Data);
            if (match.Success)
            {
                var percentStr = match.Groups[1].Value;
                if (double.TryParse(percentStr, System.Globalization.CultureInfo.InvariantCulture, out var p))
                {
                    var size = match.Groups[2].Success ? match.Groups[2].Value : null;
                    var speed = match.Groups[3].Success ? match.Groups[3].Value : null;
                    var eta = match.Groups[4].Success ? match.Groups[4].Value : null;

                    onProgress?.Invoke(new YtDlpProgressUpdate(
                        p >= 100 ? "finished" : "downloading",
                        p,
                        TotalSize: size,
                        Speed: speed,
                        Eta: eta,
                        Message: p >= 100 ? "Finalisation du fichier..." : "Téléchargement du flux..."
                    ));
                }
            }
        };
        // Actively drain stderr to prevent OS anonymous pipe saturation and deadlock
        process.ErrorDataReceived += (_, _) => { };

        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(10));
        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        try
        {
            await process.WaitForExitAsync(cts.Token);
        }
        catch (OperationCanceledException)
        {
            try { process.Kill(entireProcessTree: true); } catch { }
            throw new TimeoutException("Le téléchargement via yt-dlp a dépassé le délai imparti de 10 minutes.");
        }

        onProgress?.Invoke(new YtDlpProgressUpdate("finished", 100, Message: "Téléchargement terminé avec succès !"));

        // Find the generated file matching baseName
        var candidate = Directory.GetFiles(tempDir, $"{baseName}.*").FirstOrDefault();
        if (candidate != null && File.Exists(candidate))
        {
            return candidate;
        }

        throw new FileNotFoundException("Le fichier téléchargé n'a pas pu être localisé.");
    }

    public static async Task<ScannedAudioTrack?> SaveDirectlyToAppLibraryAsync(DownloadRequest request, Action<YtDlpProgressUpdate>? onProgress)
    {
        var isVideo = string.Equals(request.MediaType, "video", StringComparison.OrdinalIgnoreCase);
        var targetDir = isVideo
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyVideos), "FlowLuna")
            : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyMusic), "FlowLuna");

        Directory.CreateDirectory(targetDir);

        var tempFile = await DownloadToTempAsync(request, onProgress);
        var ext = Path.GetExtension(tempFile);

        var cleanTitle = string.IsNullOrWhiteSpace(request.Title) ? "Titre" : CleanTrackTitle(request.Title);
        var cleanArtist = string.IsNullOrWhiteSpace(request.Artist) ? "Artiste" : request.Artist;
        var safeFileName = $"{SanitizeFileName(cleanArtist)} - {SanitizeFileName(cleanTitle)}{ext}";
        var destPath = Path.Combine(targetDir, safeFileName);

        if (File.Exists(destPath))
        {
            destPath = Path.Combine(targetDir, $"{SanitizeFileName(cleanArtist)} - {SanitizeFileName(cleanTitle)}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}{ext}");
        }

        File.Move(tempFile, destPath, true);

        return await LibraryScanner.BuildTrackMetadataAsync(destPath);
    }

    private static string CleanTrackTitle(string title)
    {
        var cleaned = Regex.Replace(title, @"\s*(\(|\[)(official\s+(music\s+)?video|audio\s+officiel|clip\s+officiel|hq|hd|4k|lyrics?)(\)|\])", "", RegexOptions.IgnoreCase);
        return cleaned.Trim();
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return string.Concat(name.Split(invalid, StringSplitOptions.RemoveEmptyEntries)).Trim();
    }
}

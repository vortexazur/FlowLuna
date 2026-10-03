using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;

namespace FlowLuna.Services;

public static class AudioTranscoder
{
    public static async Task<byte[]> TranscodeAudioAsync(
        byte[] inputData,
        string targetFormat = "mp3",
        string bitrate = "320k",
        string? title = null,
        string? artist = null,
        string? album = null)
    {
        var tempId = $"transcode_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid():N}";
        var inputTemp = Path.Combine(Path.GetTempPath(), $"{tempId}_in");
        var outputTemp = Path.Combine(Path.GetTempPath(), $"{tempId}_out.{targetFormat.ToLowerInvariant()}");

        try
        {
            await File.WriteAllBytesAsync(inputTemp, inputData);

            var ffmpegPath = BinaryManager.GetFfmpegPath();
            var args = $"-y -i \"{inputTemp}\"";

            if (!string.IsNullOrWhiteSpace(title)) args += $" -metadata title=\"{title}\"";
            if (!string.IsNullOrWhiteSpace(artist)) args += $" -metadata artist=\"{artist}\"";
            if (!string.IsNullOrWhiteSpace(album)) args += $" -metadata album=\"{album}\"";
            args += " -metadata encoder=\"FlowLuna Hi-Fi Audio Engine (C# .NET 9)\"";

            var fmt = targetFormat.ToLowerInvariant();
            if (fmt == "mp3")
            {
                args += $" -c:a libmp3lame -b:a {bitrate} -id3v2_version 3";
            }
            else if (fmt == "flac")
            {
                args += " -c:a flac -compression_level 8";
            }
            else if (fmt == "wav")
            {
                args += " -c:a pcm_s16le";
            }
            else if (fmt is "m4a" or "aac")
            {
                var br = bitrate.EndsWith('k') ? bitrate : $"{bitrate}k";
                args += $" -c:a aac -b:a {br}";
            }
            else if (fmt == "ogg")
            {
                args += " -c:a libvorbis -q:a 7";
            }

            args += $" \"{outputTemp}\"";

            var psi = new ProcessStartInfo
            {
                FileName = ffmpegPath,
                Arguments = args,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process != null)
            {
                await process.WaitForExitAsync();
            }

            if (File.Exists(outputTemp))
            {
                return await File.ReadAllBytesAsync(outputTemp);
            }

            throw new InvalidOperationException("Le fichier converti n'a pas pu être généré.");
        }
        finally
        {
            try
            {
                if (File.Exists(inputTemp)) File.Delete(inputTemp);
                if (File.Exists(outputTemp)) File.Delete(outputTemp);
            }
            catch { }
        }
    }
}

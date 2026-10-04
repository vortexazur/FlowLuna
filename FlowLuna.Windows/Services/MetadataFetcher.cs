using System;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace FlowLuna.Services;

public record OnlineTrackMetadata(
    [property: JsonPropertyName("title")] string? Title,
    [property: JsonPropertyName("artist")] string? Artist,
    [property: JsonPropertyName("album")] string? Album,
    [property: JsonPropertyName("genre")] string? Genre,
    [property: JsonPropertyName("year")] string? Year,
    [property: JsonPropertyName("coverUrl")] string? CoverUrl
);

public static class MetadataFetcher
{
    private static readonly HttpClient HttpClient = new()
    {
        Timeout = TimeSpan.FromSeconds(5)
    };

    /// <summary>
    /// Searches Apple / iTunes Search API for official song metadata and high-resolution cover artwork.
    /// </summary>
    public static async Task<OnlineTrackMetadata?> SearchOnlineMetadataAsync(string? query, string? artist = null, string? title = null)
    {
        try
        {
            var searchTerm = query?.Trim();
            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                if (!string.IsNullOrWhiteSpace(artist) && artist != "Artiste Local" && !string.IsNullOrWhiteSpace(title))
                {
                    searchTerm = $"{artist} {title}";
                }
                else if (!string.IsNullOrWhiteSpace(title))
                {
                    searchTerm = title;
                }
            }

            if (string.IsNullOrWhiteSpace(searchTerm)) return null;

            // Clean common video and tag suffixes for cleaner matching
            var cleanTerm = Regex.Replace(searchTerm, @"\b(?:ft\.|feat\.|featuring|official|video|music video|clip|audio|lyrics|paroles|remix|hd|4k)\b", "", RegexOptions.IgnoreCase).Trim();
            if (string.IsNullOrWhiteSpace(cleanTerm)) cleanTerm = searchTerm;

            var url = $"https://itunes.apple.com/search?term={Uri.EscapeDataString(cleanTerm)}&entity=song&limit=1";
            var response = await HttpClient.GetStringAsync(url);
            using var doc = JsonDocument.Parse(response);

            if (!doc.RootElement.TryGetProperty("results", out var results) || results.GetArrayLength() == 0)
            {
                return null;
            }

            var item = results[0];
            string? foundTitle = item.TryGetProperty("trackName", out var t) ? t.GetString() : null;
            string? foundArtist = item.TryGetProperty("artistName", out var a) ? a.GetString() : null;
            string? foundAlbum = item.TryGetProperty("collectionName", out var al) ? al.GetString() : null;
            string? foundGenre = item.TryGetProperty("primaryGenreName", out var g) ? g.GetString() : null;
            string? foundYear = null;
            if (item.TryGetProperty("releaseDate", out var rd) && rd.GetString() is string rds && rds.Length >= 4)
            {
                foundYear = rds.Substring(0, 4);
            }

            string? coverUrl = null;
            if (item.TryGetProperty("artworkUrl100", out var art) && art.GetString() is string artStr)
            {
                // Fetch high resolution 600x600 or 1000x1000 artwork instead of 100x100 thumbnail
                coverUrl = artStr.Replace("100x100bb", "600x600bb");
            }

            return new OnlineTrackMetadata(foundTitle, foundArtist, foundAlbum, foundGenre, foundYear, coverUrl);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Downloads an online cover art image directly into the FlowLuna covers cache directory.
    /// </summary>
    public static async Task<bool> DownloadCoverToFileAsync(string imageUrl, string destinationPath)
    {
        try
        {
            var bytes = await HttpClient.GetByteArrayAsync(imageUrl);
            if (bytes.Length > 200)
            {
                var dir = Path.GetDirectoryName(destinationPath);
                if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
                await File.WriteAllBytesAsync(destinationPath, bytes);
                return true;
            }
        }
        catch { }
        return false;
    }
}

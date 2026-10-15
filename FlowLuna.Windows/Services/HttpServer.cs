using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace FlowLuna.Services;

public class HttpServer
{
    private WebApplication? _app;
    private static readonly ConcurrentDictionary<string, YtDlpProgressUpdate> ActiveJobs = new();

    public int Port { get; private set; } = 3000;
    public string BaseUrl => $"http://127.0.0.1:{Port}";

    public static void BroadcastJobProgress(string jobId, YtDlpProgressUpdate update)
    {
        ActiveJobs[jobId] = update;
    }

    public async Task StartAsync(int preferredPort = 3000)
    {
        Port = preferredPort;

        var possibleWwwRoots = new[]
        {
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot"),
            Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", "dist")),
            Path.Combine(Directory.GetCurrentDirectory(), "dist"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "dist")
        };

        var wwwroot = possibleWwwRoots.FirstOrDefault(Directory.Exists);

        _app = BuildApp(Port, wwwroot);

        try
        {
            await _app.StartAsync();
            Console.WriteLine($"[FlowLuna HTTP] Serveur démarré sur {BaseUrl}");
        }
        catch (IOException)
        {
            // Port 3000 is occupied — rebuild on fallback port 3001
            Port = 3001;

            // Dispose the failed app before rebuilding
            try { await _app.DisposeAsync(); } catch { }

            _app = BuildApp(Port, wwwroot);

            await _app.StartAsync();
            Console.WriteLine($"[FlowLuna HTTP] Serveur démarré sur fallback {BaseUrl}");
        }
    }

    private WebApplication BuildApp(int port, string? wwwroot)
    {
        var builder = WebApplication.CreateEmptyBuilder(new WebApplicationOptions
        {
            Args = Array.Empty<string>()
        });

        builder.WebHost.UseKestrel(options =>
        {
            options.Listen(IPAddress.Loopback, port);
        });

        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.SetIsOriginAllowed(origin =>
                {
                    if (string.IsNullOrEmpty(origin)) return true;
                    if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                    {
                        var host = uri.Host.ToLowerInvariant();
                        return host == "localhost" || host == "127.0.0.1" || uri.Scheme == "file" || uri.Scheme == "vscode-webview";
                    }
                    return false;
                })
                .AllowAnyHeader()
                .AllowAnyMethod();
            });
        });

        builder.Services.AddRouting();

        var app = builder.Build();
        app.UseCors();

        ConfigureEndpoints(app, wwwroot);

        return app;
    }

    private void ConfigureEndpoints(WebApplication app, string? wwwroot)
    {
        // 1. Static media directories
        var appDataAudio = Path.Combine(BinaryManager.FlowLunaDataDir, "audio");
        var appDataVideos = Path.Combine(BinaryManager.FlowLunaDataDir, "videos");
        var appDataCovers = Path.Combine(BinaryManager.FlowLunaDataDir, "covers");
        Directory.CreateDirectory(appDataAudio);
        Directory.CreateDirectory(appDataVideos);
        Directory.CreateDirectory(appDataCovers);

        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(appDataAudio),
            RequestPath = "/audio"
        });

        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(appDataVideos),
            RequestPath = "/videos"
        });

        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(appDataCovers),
            RequestPath = "/covers"
        });

        // 2. Library Endpoints
        app.MapGet("/api/library/scan", async (HttpContext ctx) =>
        {
            var folder = ctx.Request.Query["folder"].ToString();
            var tracks = await LibraryScanner.ScanAllDirectoriesAsync(string.IsNullOrWhiteSpace(folder) ? null : folder);
            return Results.Json(new
            {
                success = true,
                count = tracks.Count,
                tracks,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });
        });

        app.MapPost("/api/library/add-folder", async (HttpContext ctx) =>
        {
            using var reader = new StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            using var doc = JsonDocument.Parse(bodyText);
            var folderPath = doc.RootElement.GetProperty("folderPath").GetString();

            if (string.IsNullOrWhiteSpace(folderPath) || !Directory.Exists(folderPath))
            {
                return Results.BadRequest(new { error = "Dossier inexistant ou inaccessible" });
            }

            LibraryScanner.SaveCustomScannedDir(folderPath);
            var filePaths = LibraryScanner.ScanDirectoryForAudio(folderPath, 5);
            var tracks = new System.Collections.Generic.List<ScannedAudioTrack>();

            foreach (var fp in filePaths)
            {
                var track = await LibraryScanner.BuildTrackMetadataAsync(fp);
                if (track != null) tracks.Add(track);
            }

            return Results.Json(new
            {
                success = true,
                folder = folderPath,
                count = tracks.Count,
                tracks
            });
        });

        app.MapPost("/api/library/add-files", async (HttpContext ctx) =>
        {
            using var reader = new StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            using var doc = JsonDocument.Parse(bodyText);
            var root = doc.RootElement;
            var filePathsElement = root.GetProperty("filePaths");

            bool isTransient = false;
            if (root.TryGetProperty("isTransient", out var transProp))
            {
                isTransient = transProp.GetBoolean();
            }

            var validFps = new System.Collections.Generic.List<string>();
            foreach (var item in filePathsElement.EnumerateArray())
            {
                var fp = item.GetString();
                if (!string.IsNullOrWhiteSpace(fp) && File.Exists(fp))
                {
                    validFps.Add(fp);
                }
            }

            var tasks = validFps.Select(async fp => await LibraryScanner.BuildTrackMetadataAsync(fp, isPublic: false, fetchOnline: false, isTransient: isTransient));
            var results = await Task.WhenAll(tasks);
            var tracks = results.Where(t => t != null).Select(t => t!).ToList();

            return Results.Json(new
            {
                success = true,
                count = tracks.Count,
                tracks
            });
        });

        app.MapGet("/api/library/folders", () =>
        {
            return Results.Json(new
            {
                folders = LibraryScanner.GetCustomScannedDirs()
            });
        });

        // Universal zero-copy audio stream with Range HTTP 206 support
        app.MapGet("/api/library/stream", (HttpContext ctx) =>
        {
            var reqFile = ctx.Request.Query["file"].ToString();
            if (string.IsNullOrWhiteSpace(reqFile))
            {
                return Results.BadRequest("Paramètre file requis");
            }

            string fullPath;
            try
            {
                fullPath = Path.GetFullPath(reqFile);
            }
            catch
            {
                return Results.BadRequest("Chemin de fichier invalide");
            }

            // Security: prohibit streaming system OS files
            var winDir = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
            if (!string.IsNullOrEmpty(winDir) && fullPath.StartsWith(winDir, StringComparison.OrdinalIgnoreCase))
            {
                return Results.Forbid();
            }

            if (!File.Exists(fullPath))
            {
                return Results.NotFound("Fichier audio introuvable");
            }

            var ext = Path.GetExtension(fullPath).ToLowerInvariant();
            var mimeMap = new System.Collections.Generic.Dictionary<string, string>
            {
                [".mp3"] = "audio/mpeg",
                [".flac"] = "audio/flac",
                [".wav"] = "audio/wav",
                [".ogg"] = "audio/ogg",
                [".m4a"] = "audio/mp4",
                [".aac"] = "audio/aac",
                [".webm"] = "video/webm",
                [".opus"] = "audio/opus",
                [".wma"] = "audio/x-ms-wma",
                [".alac"] = "audio/alac",
                [".mp4"] = "video/mp4",
                [".mkv"] = "video/x-matroska",
                [".mov"] = "video/quicktime",
                [".avi"] = "video/x-msvideo",
                [".m4v"] = "video/x-m4v"
            };

            if (!mimeMap.TryGetValue(ext, out var contentType))
            {
                return Results.BadRequest("Format multimédia non autorisé");
            }

            return Results.File(fullPath, contentType: contentType, enableRangeProcessing: true);
        });

        // Dedicated cover artwork serving endpoint
        app.MapGet("/api/covers/{name}", (string name) =>
        {
            var safeName = Path.GetFileName(name);
            var coverPath = Path.Combine(appDataCovers, safeName);
            if (!File.Exists(coverPath)) return Results.NotFound();
            return Results.File(coverPath, "image/jpeg");
        });

        // Online song metadata and artwork search
        app.MapGet("/api/metadata/search", async (HttpContext ctx) =>
        {
            var query = ctx.Request.Query["query"].ToString();
            var artist = ctx.Request.Query["artist"].ToString();
            var title = ctx.Request.Query["title"].ToString();
            var meta = await MetadataFetcher.SearchOnlineMetadataAsync(query, artist, title);
            if (meta == null)
            {
                return Results.Json(new { found = false });
            }
            return Results.Json(new { found = true, metadata = meta });
        });

        // Lyrics lookup (local .lrc file or disk cache)
        app.MapGet("/api/lyrics", async (HttpContext ctx) =>
        {
            var filePath = ctx.Request.Query["file"].ToString();

            // 1. Check if .lrc exists adjacent to the audio file
            if (!string.IsNullOrWhiteSpace(filePath) && File.Exists(filePath))
            {
                var lrcPath = Path.ChangeExtension(filePath, ".lrc");
                if (File.Exists(lrcPath))
                {
                    try
                    {
                        var content = await File.ReadAllTextAsync(lrcPath);
                        return Results.Json(new { found = true, source = "local_file", syncedLyrics = content });
                    }
                    catch { }
                }
            }

            // 2. Check cached lyrics
            if (!string.IsNullOrWhiteSpace(filePath))
            {
                var hash = LibraryScanner.GetTrackHash(filePath);
                var cachedLrc = Path.Combine(BinaryManager.FlowLunaDataDir, "lyrics", $"{hash}.lrc");
                if (File.Exists(cachedLrc))
                {
                    try
                    {
                        var content = await File.ReadAllTextAsync(cachedLrc);
                        return Results.Json(new { found = true, source = "cache", syncedLyrics = content });
                    }
                    catch { }
                }
            }

            return Results.Json(new { found = false });
        });

        // Lyrics cache endpoint
        app.MapPost("/api/lyrics/cache", async (HttpContext ctx) =>
        {
            try
            {
                using var reader = new StreamReader(ctx.Request.Body);
                var body = await reader.ReadToEndAsync();
                using var doc = JsonDocument.Parse(body);
                var filePath = doc.RootElement.GetProperty("filePath").GetString();
                var lrc = doc.RootElement.GetProperty("lrc").GetString();

                if (!string.IsNullOrWhiteSpace(filePath) && !string.IsNullOrWhiteSpace(lrc))
                {
                    var hash = LibraryScanner.GetTrackHash(filePath);
                    var lyricsDir = Path.Combine(BinaryManager.FlowLunaDataDir, "lyrics");
                    Directory.CreateDirectory(lyricsDir);
                    var cachedLrc = Path.Combine(lyricsDir, $"{hash}.lrc");
                    await File.WriteAllTextAsync(cachedLrc, lrc);
                    return Results.Json(new { success = true });
                }
            }
            catch { }
            return Results.BadRequest();
        });

        // Video container chapters parser route (ffprobe)
        app.MapGet("/api/video/chapters", async (HttpContext ctx) =>
        {
            var filePath = ctx.Request.Query["filePath"].ToString();
            if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
            {
                return Results.Json(new { success = false, chapters = Array.Empty<object>() });
            }

            var ffprobePath = BinaryManager.GetFfprobePath();
            if (string.IsNullOrWhiteSpace(ffprobePath) || (!File.Exists(ffprobePath) && ffprobePath.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)))
            {
                return Results.Json(new { success = false, chapters = Array.Empty<object>() });
            }

            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = ffprobePath,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                psi.ArgumentList.Add("-v");
                psi.ArgumentList.Add("quiet");
                psi.ArgumentList.Add("-print_format");
                psi.ArgumentList.Add("json");
                psi.ArgumentList.Add("-show_chapters");
                psi.ArgumentList.Add(filePath);

                using var proc = new Process { StartInfo = psi };
                if (!proc.Start())
                {
                    return Results.Json(new { success = false, chapters = Array.Empty<object>() });
                }

                using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(8));
                var stdoutTask = proc.StandardOutput.ReadToEndAsync(cts.Token);
                var stderrTask = proc.StandardError.ReadToEndAsync(cts.Token);

                await Task.WhenAll(stdoutTask, stderrTask);
                await proc.WaitForExitAsync(cts.Token);

                var output = stdoutTask.Result;
                if (string.IsNullOrWhiteSpace(output))
                {
                    return Results.Json(new { success = false, chapters = Array.Empty<object>() });
                }

                using var doc = JsonDocument.Parse(output);
                if (doc.RootElement.TryGetProperty("chapters", out var chaptersEl) && chaptersEl.ValueKind == JsonValueKind.Array)
                {
                    var chapters = new System.Collections.Generic.List<object>();
                    int idx = 0;
                    foreach (var ch in chaptersEl.EnumerateArray())
                    {
                        long id = idx;
                        if (ch.TryGetProperty("id", out var idProp) && idProp.TryGetInt64(out var parsedId))
                        {
                            id = parsedId;
                        }

                        string title = $"Chapitre {idx + 1}";
                        if (ch.TryGetProperty("tags", out var tagsEl) && tagsEl.TryGetProperty("title", out var titleTag) && !string.IsNullOrWhiteSpace(titleTag.GetString()))
                        {
                            title = titleTag.GetString()!;
                        }
                        else if (ch.TryGetProperty("title", out var titleDirect) && !string.IsNullOrWhiteSpace(titleDirect.GetString()))
                        {
                            title = titleDirect.GetString()!;
                        }

                        double startTime = 0.0;
                        if (ch.TryGetProperty("start_time", out var startProp))
                        {
                            if (startProp.ValueKind == JsonValueKind.Number) startTime = startProp.GetDouble();
                            else if (startProp.ValueKind == JsonValueKind.String && double.TryParse(startProp.GetString(), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsedStart))
                                startTime = parsedStart;
                        }

                        double endTime = 0.0;
                        if (ch.TryGetProperty("end_time", out var endProp))
                        {
                            if (endProp.ValueKind == JsonValueKind.Number) endTime = endProp.GetDouble();
                            else if (endProp.ValueKind == JsonValueKind.String && double.TryParse(endProp.GetString(), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsedEnd))
                                endTime = parsedEnd;
                        }

                        chapters.Add(new
                        {
                            id,
                            title,
                            startTime,
                            endTime
                        });
                        idx++;
                    }
                    return Results.Json(new { success = true, chapters });
                }

                return Results.Json(new { success = true, chapters = Array.Empty<object>() });
            }
            catch
            {
                return Results.Json(new { success = false, chapters = Array.Empty<object>() });
            }
        });

        // Intro Skipper Endpoints : Snapping chirurgical aux silences audio / black frames
        app.MapGet("/api/video/fine-tune-markers", async (HttpContext ctx) =>
        {
            var filePath = ctx.Request.Query["filePath"].ToString();
            var startStr = ctx.Request.Query["start"].ToString();
            var endStr = ctx.Request.Query["end"].ToString();
            var windowStr = ctx.Request.Query["window"].ToString();

            if (string.IsNullOrWhiteSpace(filePath) ||
                !double.TryParse(startStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var start) ||
                !double.TryParse(endStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var end))
            {
                return Results.BadRequest(new { success = false, message = "Paramètres filePath, start et end requis" });
            }

            double window = double.TryParse(windowStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var w) ? w : 3.5;
            var res = await IntroSkipperService.FineTuneIntervalAsync(filePath, start, end, window, ctx.RequestAborted);
            return Results.Json(res);
        });

        // Intro Skipper Endpoints : Analyse multilingue des sous-titres (Recap / Preview)
        app.MapGet("/api/video/subtitles/analyze", async (HttpContext ctx) =>
        {
            var filePath = ctx.Request.Query["filePath"].ToString();
            if (string.IsNullOrWhiteSpace(filePath))
            {
                return Results.BadRequest(new { success = false, message = "Paramètre filePath requis" });
            }

            var res = await IntroSkipperService.AnalyzeSubtitlesAsync(filePath, ctx.RequestAborted);
            return Results.Json(res);
        });

        // Intro Skipper Endpoints : Corrélation acoustique locale multi-épisodes
        app.MapGet("/api/video/acoustic-match", async (HttpContext ctx) =>
        {
            var filePath = ctx.Request.Query["filePath"].ToString();
            if (string.IsNullOrWhiteSpace(filePath))
            {
                return Results.BadRequest(new { success = false, message = "Paramètre filePath requis" });
            }

            var res = await IntroSkipperService.MatchAudioOpeningAsync(filePath, null, ctx.RequestAborted);
            return Results.Json(res);
        });

        // 3. Downloader & Binaries Endpoints
        app.MapGet("/api/downloader/binaries-status", async () =>
        {
            var report = await BinaryManager.GetStatusReportAsync();
            return Results.Json(report);
        });

        app.MapPost("/api/downloader/update-ytdlp", async () =>
        {
            var (success, message) = await BinaryManager.UpdateYtdlpAsync();
            return Results.Json(new { success, message });
        });

        app.MapGet("/api/engine/libvlc-status", async () =>
        {
            var status = await BinaryManager.GetLibVlcStatusAsync();
            return Results.Json(status);
        });

        app.MapPost("/api/engine/update-libvlc", async () =>
        {
            var (success, message) = await BinaryManager.UpdateLibVlcAsync();
            return Results.Json(new { success, message });
        });

        // FlowLuna Software Auto-Update endpoints
        app.MapGet("/api/app/check-update", async () =>
        {
            var res = await BinaryManager.CheckAppUpdateAsync();
            return Results.Json(res);
        });

        app.MapPost("/api/app/download-update", async (HttpContext ctx) =>
        {
            using var reader = new StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            string? downloadUrl = null;
            string? version = null;
            if (!string.IsNullOrWhiteSpace(bodyText))
            {
                try
                {
                    using var doc = JsonDocument.Parse(bodyText);
                    if (doc.RootElement.TryGetProperty("downloadUrl", out var dp)) downloadUrl = dp.GetString();
                    if (doc.RootElement.TryGetProperty("version", out var vp)) version = vp.GetString();
                }
                catch { }
            }

            var res = await BinaryManager.StartAppUpdateDownloadAsync(downloadUrl, version);
            return Results.Json(res);
        });

        app.MapGet("/api/app/update-progress", () =>
        {
            var status = BinaryManager.GetAppUpdateProgress();
            return Results.Json(status);
        });

        app.MapPost("/api/app/apply-update", async (HttpContext ctx) =>
        {
            using var reader = new StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            string? installerPath = null;
            if (!string.IsNullOrWhiteSpace(bodyText))
            {
                try
                {
                    using var doc = JsonDocument.Parse(bodyText);
                    if (doc.RootElement.TryGetProperty("installerPath", out var ip)) installerPath = ip.GetString();
                }
                catch { }
            }

            var res = BinaryManager.ApplyAppUpdate(installerPath);
            return Results.Json(res);
        });

        // Real-time SSE download progress
        app.MapGet("/api/downloader/progress/{jobId}", async (string jobId, HttpContext ctx) =>
        {
            ctx.Response.Headers.Append("Content-Type", "text/event-stream");
            ctx.Response.Headers.Append("Cache-Control", "no-cache");
            ctx.Response.Headers.Append("Connection", "keep-alive");

            var initial = ActiveJobs.TryGetValue(jobId, out var existing)
                ? existing
                : new YtDlpProgressUpdate("starting", 0, Message: "Initialisation...");

            await ctx.Response.WriteAsync($"data: {JsonSerializer.Serialize(initial)}\n\n");
            await ctx.Response.Body.FlushAsync();

            var count = 0;
            while (!ctx.RequestAborted.IsCancellationRequested && count < 120)
            {
                await Task.Delay(500, ctx.RequestAborted);
                if (ActiveJobs.TryGetValue(jobId, out var current))
                {
                    await ctx.Response.WriteAsync($"data: {JsonSerializer.Serialize(current)}\n\n");
                    await ctx.Response.Body.FlushAsync();
                    if (current.Status is "finished" or "error") break;
                }
                count++;
            }
        });

        // Media Inspection
        app.MapPost("/api/downloader/inspect", async (HttpContext ctx) =>
        {
            using var reader = new StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            using var doc = JsonDocument.Parse(bodyText);
            var url = doc.RootElement.GetProperty("url").GetString();
            if (string.IsNullOrWhiteSpace(url)) return Results.BadRequest(new { error = "URL requise" });

            var result = await DownloaderEngine.InspectUrlAsync(url);
            return Results.Json(result);
        });

        // Direct Browser/PC Download
        app.MapGet("/api/downloader/download", async (HttpContext ctx) =>
        {
            var url = ctx.Request.Query["url"].ToString();
            var jobId = ctx.Request.Query["jobId"].ToString();
            var mediaType = ctx.Request.Query["type"].ToString();
            var audioFormat = ctx.Request.Query["audioFormat"].ToString();
            var audioBitrate = ctx.Request.Query["audioBitrate"].ToString();
            var videoFormat = ctx.Request.Query["videoFormat"].ToString();
            var videoQuality = ctx.Request.Query["videoQuality"].ToString();
            var title = ctx.Request.Query["title"].ToString();
            var artist = ctx.Request.Query["artist"].ToString();

            var destinationPath = ctx.Request.Query["destinationPath"].ToString();

            if (string.IsNullOrWhiteSpace(url)) return Results.BadRequest("Paramètre url requis");

            var req = new DownloadRequest(jobId, url, mediaType, audioFormat, audioBitrate, videoFormat, videoQuality, title, artist);

            try
            {
                var filePath = await DownloaderEngine.DownloadToTempAsync(req, prog =>
                {
                    if (!string.IsNullOrWhiteSpace(jobId)) ActiveJobs[jobId] = prog;
                });

                var ext = Path.GetExtension(filePath);
                var cleanTitle = string.IsNullOrWhiteSpace(title) ? "Media" : DownloaderEngine.CleanTrackTitle(title);
                var cleanArtist = string.IsNullOrWhiteSpace(artist) || artist.Equals("Artiste YouTube", StringComparison.OrdinalIgnoreCase) ? "" : artist.Trim();
                var isGeneric = string.IsNullOrWhiteSpace(cleanArtist) || cleanArtist.Equals("Artiste", StringComparison.OrdinalIgnoreCase);

                string baseName;
                if (!isGeneric && !cleanTitle.StartsWith(cleanArtist + " -", StringComparison.OrdinalIgnoreCase))
                {
                    baseName = $"{cleanArtist} - {cleanTitle}";
                }
                else
                {
                    baseName = cleanTitle;
                }

                var finalFileName = $"{DownloaderEngine.SanitizeFileName(baseName)}{ext}";

                // If destinationPath was chosen via Save Dialog, copy directly to destination
                if (!string.IsNullOrWhiteSpace(destinationPath))
                {
                    var destDir = Path.GetDirectoryName(destinationPath);
                    if (!string.IsNullOrWhiteSpace(destDir)) Directory.CreateDirectory(destDir);
                    File.Copy(filePath, destinationPath, true);
                    try { File.Delete(filePath); } catch {}
                    return Results.Ok(new { success = true, savedPath = destinationPath, fileName = Path.GetFileName(destinationPath) });
                }

                var mime = ext.ToLowerInvariant() switch
                {
                    ".flac" => "audio/flac",
                    ".wav" => "audio/wav",
                    ".m4a" => "audio/mp4",
                    ".ogg" => "audio/ogg",
                    ".mp4" => "video/mp4",
                    ".mkv" => "video/x-matroska",
                    ".webm" => "video/webm",
                    _ => "audio/mpeg"
                };

                return Results.File(filePath, contentType: mime, fileDownloadName: finalFileName);
            }
            catch (Exception ex)
            {
                if (!string.IsNullOrWhiteSpace(jobId))
                {
                    ActiveJobs[jobId] = new YtDlpProgressUpdate("error", 0, Message: ex.Message);
                }
                return Results.Problem(ex.Message);
            }
        });

        // Save Directly to FlowLuna Music Library
        app.MapPost("/api/downloader/save-to-app", async (HttpContext ctx) =>
        {
            using var reader = new StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var req = JsonSerializer.Deserialize<DownloadRequest>(bodyText);
            if (req == null || string.IsNullOrWhiteSpace(req.Url))
            {
                return Results.BadRequest(new { error = "Requête invalide ou URL manquante" });
            }

            try
            {
                var track = await DownloaderEngine.SaveDirectlyToAppLibraryAsync(req, prog =>
                {
                    if (!string.IsNullOrWhiteSpace(req.JobId)) ActiveJobs[req.JobId] = prog;
                });

                return Results.Json(new { success = true, track });
            }
            catch (Exception ex)
            {
                if (!string.IsNullOrWhiteSpace(req.JobId))
                {
                    ActiveJobs[req.JobId] = new YtDlpProgressUpdate("error", 0, Message: ex.Message);
                }
                return Results.Json(new { success = false, error = ex.Message });
            }
        });

        // 4. Audio Transcoder Endpoint
        app.MapPost("/api/audio/convert", async (HttpContext ctx) =>
        {
            var format = ctx.Request.Query["format"].ToString();
            if (string.IsNullOrWhiteSpace(format)) format = "mp3";
            var bitrate = ctx.Request.Query["bitrate"].ToString();
            if (string.IsNullOrWhiteSpace(bitrate)) bitrate = "320k";
            var title = ctx.Request.Query["title"].ToString();
            var artist = ctx.Request.Query["artist"].ToString();
            var album = ctx.Request.Query["album"].ToString();

            using var ms = new MemoryStream();
            await ctx.Request.Body.CopyToAsync(ms);
            var rawBytes = ms.ToArray();

            if (rawBytes.Length == 0)
            {
                return Results.BadRequest(new { error = "Données audio manquantes" });
            }

            try
            {
                var converted = await AudioTranscoder.TranscodeAudioAsync(rawBytes, format, bitrate, title, artist, album);
                var mime = format switch
                {
                    "flac" => "audio/flac",
                    "wav" => "audio/wav",
                    "m4a" => "audio/mp4",
                    "ogg" => "audio/ogg",
                    _ => "audio/mpeg"
                };

                return Results.File(converted, contentType: mime, fileDownloadName: $"{artist} - {title}.{format}");
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        });

        // Discord Rich Presence Endpoints
        app.MapPost("/api/discord/presence", async (HttpContext ctx) =>
        {
            try
            {
                using var reader = new StreamReader(ctx.Request.Body);
                var bodyText = await reader.ReadToEndAsync();
                var req = JsonSerializer.Deserialize<DiscordPresenceRequest>(bodyText, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (req == null) return Results.BadRequest();

                await DiscordRpcService.Instance.UpdatePresenceAsync(
                    req.Title ?? "Musique",
                    req.Artist ?? "Artiste Inconnu",
                    req.Album,
                    req.Duration,
                    req.Position,
                    req.IsPlaying
                );

                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        });

        app.MapPost("/api/discord/clear", async () =>
        {
            try
            {
                await DiscordRpcService.Instance.ClearPresenceAsync();
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        });

        // 5. AI Proxy & Model Management Endpoints
        app.MapPost("/api/ai/chat", async (HttpContext ctx) =>
        {
            try
            {
                using var reader = new StreamReader(ctx.Request.Body);
                var bodyText = await reader.ReadToEndAsync();
                using var doc = JsonDocument.Parse(bodyText);
                var root = doc.RootElement;

                if (!root.TryGetProperty("config", out var config) || !root.TryGetProperty("messages", out var messages))
                {
                    return Results.BadRequest(new { error = "Paramètres config et messages requis." });
                }

                JsonElement? options = root.TryGetProperty("options", out var opt) ? opt : null;
                var text = await AiProxyService.ExecuteAiChatAsync(config, messages, options, ctx.RequestAborted);
                return Results.Ok(new { success = true, text });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        app.MapPost("/api/ai/test", async (HttpContext ctx) =>
        {
            var sw = Stopwatch.StartNew();
            try
            {
                using var reader = new StreamReader(ctx.Request.Body);
                var bodyText = await reader.ReadToEndAsync();
                using var doc = JsonDocument.Parse(bodyText);
                var root = doc.RootElement;

                if (!root.TryGetProperty("config", out var config))
                {
                    return Results.BadRequest(new { success = false, message = "Configuration requise." });
                }

                using var pingDoc = JsonDocument.Parse("[{\"role\":\"user\",\"content\":\"Ping test FlowLuna: reponds uniquement par le mot OK.\"}]");
                using var optDoc = JsonDocument.Parse("{\"maxTokens\":10,\"temperature\":0.1}");

                var text = await AiProxyService.ExecuteAiChatAsync(config, pingDoc.RootElement, optDoc.RootElement, ctx.RequestAborted);
                sw.Stop();

                return Results.Ok(new
                {
                    success = true,
                    message = $"Connexion réussie en {sw.ElapsedMilliseconds}ms ! (Réponse : \"{text.Trim()}\")",
                    latencyMs = sw.ElapsedMilliseconds,
                    response = text.Trim()
                });
            }
            catch (Exception ex)
            {
                sw.Stop();
                return Results.Json(new
                {
                    success = false,
                    message = ex.Message
                }, statusCode: 500);
            }
        });

        app.MapGet("/api/ai/models", async (HttpContext ctx) =>
        {
            var provider = ctx.Request.Query["provider"].ToString().ToLowerInvariant();
            var endpoint = ctx.Request.Query["endpoint"].ToString();
            if (string.IsNullOrWhiteSpace(provider)) provider = "ollama";

            var models = await AiProxyService.FetchAvailableModelsAsync(provider, endpoint, ctx.RequestAborted);
            return Results.Ok(new { success = true, models });
        });

        // 6. Static React SPA files serving
        if (wwwroot != null)
        {
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(wwwroot),
                RequestPath = ""
            });

            // SPA fallback: any non-API route returns index.html. Never return index.html for /api routes!
            app.MapFallback(async (HttpContext ctx) =>
            {
                if (ctx.Request.Path.StartsWithSegments("/api"))
                {
                    ctx.Response.StatusCode = 404;
                    ctx.Response.ContentType = "application/json";
                    await ctx.Response.WriteAsync("{\"error\":\"Endpoint API introuvable.\"}");
                    return;
                }

                var indexFile = Path.Combine(wwwroot, "index.html");
                if (File.Exists(indexFile))
                {
                    ctx.Response.ContentType = "text/html";
                    await ctx.Response.SendFileAsync(indexFile);
                }
                else
                {
                    ctx.Response.StatusCode = 404;
                    await ctx.Response.WriteAsync("FlowLuna UI non trouvée.");
                }
            });
        }
    }

    public async Task StopAsync()
    {
        if (_app != null)
        {
            await _app.StopAsync();
            await _app.DisposeAsync();
        }
    }
}

public record DiscordPresenceRequest(
    string? Title,
    string? Artist,
    string? Album,
    double Duration,
    double Position,
    bool IsPlaying
);

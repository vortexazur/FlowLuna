using System;
using System.Collections.Concurrent;
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

        var builder = WebApplication.CreateEmptyBuilder(new WebApplicationOptions
        {
            Args = Array.Empty<string>()
        });

        builder.WebHost.UseKestrel(options =>
        {
            options.Listen(IPAddress.Loopback, Port);
        });

        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
            });
        });

        builder.Services.AddRouting();

        _app = builder.Build();
        _app.UseCors();

        // 1. Static media directories
        var appDataAudio = Path.Combine(BinaryManager.FlowLunaDataDir, "audio");
        var appDataVideos = Path.Combine(BinaryManager.FlowLunaDataDir, "videos");
        Directory.CreateDirectory(appDataAudio);
        Directory.CreateDirectory(appDataVideos);

        _app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(appDataAudio),
            RequestPath = "/audio"
        });

        _app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(appDataVideos),
            RequestPath = "/videos"
        });

        // 2. Library Endpoints
        _app.MapGet("/api/library/scan", async (HttpContext ctx) =>
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

        _app.MapPost("/api/library/add-folder", async (HttpContext ctx) =>
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

        _app.MapPost("/api/library/add-files", async (HttpContext ctx) =>
        {
            using var reader = new StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            using var doc = JsonDocument.Parse(bodyText);
            var filePathsElement = doc.RootElement.GetProperty("filePaths");

            var tracks = new System.Collections.Generic.List<ScannedAudioTrack>();
            foreach (var item in filePathsElement.EnumerateArray())
            {
                var fp = item.GetString();
                if (!string.IsNullOrWhiteSpace(fp) && File.Exists(fp))
                {
                    var track = await LibraryScanner.BuildTrackMetadataAsync(fp);
                    if (track != null) tracks.Add(track);
                }
            }

            return Results.Json(new
            {
                success = true,
                count = tracks.Count,
                tracks
            });
        });

        _app.MapGet("/api/library/folders", () =>
        {
            return Results.Json(new
            {
                folders = LibraryScanner.GetCustomScannedDirs()
            });
        });

        // Universal zero-copy audio stream with Range HTTP 206 support
        _app.MapGet("/api/library/stream", (HttpContext ctx) =>
        {
            var reqFile = ctx.Request.Query["file"].ToString();
            if (string.IsNullOrWhiteSpace(reqFile) || !File.Exists(reqFile))
            {
                return Results.NotFound("Fichier audio introuvable");
            }

            var ext = Path.GetExtension(reqFile).ToLowerInvariant();
            var mimeMap = new System.Collections.Generic.Dictionary<string, string>
            {
                [".mp3"] = "audio/mpeg",
                [".flac"] = "audio/flac",
                [".wav"] = "audio/wav",
                [".ogg"] = "audio/ogg",
                [".m4a"] = "audio/mp4",
                [".aac"] = "audio/aac",
                [".webm"] = "audio/webm",
                [".opus"] = "audio/opus",
                [".wma"] = "audio/x-ms-wma",
                [".alac"] = "audio/alac"
            };

            var contentType = mimeMap.TryGetValue(ext, out var mime) ? mime : "audio/mpeg";
            return Results.File(reqFile, contentType: contentType, enableRangeProcessing: true);
        });

        // 3. Downloader & Binaries Endpoints
        _app.MapGet("/api/downloader/binaries-status", async () =>
        {
            var report = await BinaryManager.GetStatusReportAsync();
            return Results.Json(report);
        });

        _app.MapPost("/api/downloader/update-ytdlp", async () =>
        {
            var (success, message) = await BinaryManager.UpdateYtdlpAsync();
            return Results.Json(new { success, message });
        });

        // Real-time SSE download progress
        _app.MapGet("/api/downloader/progress/{jobId}", async (string jobId, HttpContext ctx) =>
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
            while (!ctx.RequestAborted.IsCancellationRequested && count < 60)
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

        // 4. Audio Transcoder Endpoint
        _app.MapPost("/api/audio/convert", async (HttpContext ctx) =>
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

        // 5. Static React SPA files serving
        var possibleWwwRoots = new[]
        {
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot"),
            Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", "dist")),
            Path.Combine(Directory.GetCurrentDirectory(), "dist"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "dist")
        };

        var wwwroot = possibleWwwRoots.FirstOrDefault(Directory.Exists);
        if (wwwroot != null)
        {
            _app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(wwwroot),
                RequestPath = ""
            });

            // SPA fallback: any non-API route returns index.html
            _app.MapFallback(async (HttpContext ctx) =>
            {
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

        try
        {
            await _app.StartAsync();
            Console.WriteLine($"[FlowLuna HTTP] Serveur démarré sur {BaseUrl}");
        }
        catch
        {
            // Fallback port if 3000 is occupied
            Port = 3001;
            builder.WebHost.UseKestrel(opts => opts.Listen(IPAddress.Loopback, Port));
            _app = builder.Build();
            await _app.StartAsync();
            Console.WriteLine($"[FlowLuna HTTP] Serveur démarré sur fallback {BaseUrl}");
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

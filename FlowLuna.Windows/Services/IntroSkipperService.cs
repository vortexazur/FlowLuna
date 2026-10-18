using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace FlowLuna.Services;

public record FineTuneResult(
    bool Success,
    double OriginalStart,
    double AdjustedStart,
    double OriginalEnd,
    double AdjustedEnd,
    bool Snapped,
    string SnapType,
    double StartOffset,
    double EndOffset,
    string? Message = null
);

public record SubtitleMarkerResult(
    bool Success,
    double? RecapStart,
    double? RecapEnd,
    double? PreviewStart,
    double? PreviewEnd,
    string? Source = null
);

public record AcousticMatchResult(
    bool Success,
    double Start,
    double End,
    double Confidence,
    string? MatchedSibling = null,
    string? Message = null
);

/// <summary>
/// Service d'analyse et de détection fine des génériques et segments vidéo
/// Inspiré des algorithmes et heuristiques de haute précision de 'intro-skipper'
/// (Snapping aux silences/black frames, analyse de sous-titres multilingues, corrélation acoustique locale).
/// </summary>
public static class IntroSkipperService
{
    private static readonly ConcurrentDictionary<string, FineTuneResult> FineTuneCache = new();
    private static readonly ConcurrentDictionary<string, AcousticMatchResult> AcousticMatchCache = new();

    private static readonly Regex SilenceStartRegex = new(@"silence_start:\s*(?<time>[\d\.]+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex SilenceEndRegex = new(@"silence_end:\s*(?<time>[\d\.]+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex BlackDetectRegex = new(@"black_start:(?<start>[\d\.]+)\s+black_end:(?<end>[\d\.]+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // Multilingual patterns for Recap (Previously on...) and Preview (Next episode...) inspired by intro-skipper
    private static readonly Regex RecapPattern = new(
        @"(?:^|\b)(?:previously\s+on|last\s+time\s+on|recap|précédemment|dans\s+l'épisode\s+précédent|résumé|anteriormente\s+en|en\s+el\s+episodio\s+anterior|was\s+bisher\s+geschah|in\s+der\s+letzten\s+folge|前回のあらすじ|これまでのあらすじ)\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    private static readonly Regex PreviewPattern = new(
        @"(?:^|\b)(?:next\s+time\s+on|next\s+episode|preview|coming\s+up|prochain\s+épisode|dans\s+le\s+prochain\s+épisode|à\s+suivre|en\s+el\s+próximo\s+episodio|siguiente\s+episodio|adelanto|in\s+der\s+nächsten\s+folge|nächste\s+folge|vorschau|次回予告|次回|つづく)\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    /// <summary>
    /// Calage chirurgical des marqueurs sur les transitions de silence audio (ou black frames)
    /// Résout la dérive temporelle et évite les coupures brutales en milieu de phrase ou de musique.
    /// </summary>
    public static async Task<FineTuneResult> FineTuneIntervalAsync(
        string filePath,
        double rawStart,
        double rawEnd,
        double searchWindowSeconds = 3.5,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
        {
            return new FineTuneResult(false, rawStart, rawStart, rawEnd, rawEnd, false, "none", 0, 0, "Fichier introuvable");
        }

        var ffmpegPath = BinaryManager.GetFfmpegPath();
        if (string.IsNullOrWhiteSpace(ffmpegPath) || (!File.Exists(ffmpegPath) && ffmpegPath.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)))
        {
            return new FineTuneResult(false, rawStart, rawStart, rawEnd, rawEnd, false, "none", 0, 0, "FFmpeg non disponible");
        }

        var cacheKey = $"{filePath}_{Math.Round(rawStart, 1)}_{Math.Round(rawEnd, 1)}_{searchWindowSeconds}";
        if (FineTuneCache.TryGetValue(cacheKey, out var cached))
        {
            return cached;
        }

        double adjustedStart = rawStart;
        double adjustedEnd = rawEnd;
        bool startSnapped = false;
        bool endSnapped = false;
        string snapType = "none";

        try
        {
            // 1. Analyse de silence autour du START : [rawStart - searchWindow, rawStart + searchWindow]
            double startRangeMin = Math.Max(0, rawStart - searchWindowSeconds);
            double startRangeDuration = searchWindowSeconds * 2.0;

            var startSilences = await DetectSilencesAsync(ffmpegPath, filePath, startRangeMin, startRangeDuration, ct);
            if (startSilences.Count > 0)
            {
                // Trouver le point de transition (silence_end ou silence_start) le plus proche de rawStart
                double bestDist = double.MaxValue;
                double bestCandidate = rawStart;

                foreach (var (sStart, sEnd) in startSilences)
                {
                    // La fin du silence (silence_end) est le moment idéal où la musique d'opening démarre !
                    double distEnd = Math.Abs(sEnd - rawStart);
                    if (distEnd < bestDist && distEnd <= searchWindowSeconds)
                    {
                        bestDist = distEnd;
                        bestCandidate = sEnd;
                    }

                    // Ou le début du silence si un blanc précède l'opening
                    double distStart = Math.Abs(sStart - rawStart);
                    if (distStart < bestDist && distStart <= searchWindowSeconds)
                    {
                        bestDist = distStart;
                        bestCandidate = sStart;
                    }
                }

                if (bestDist <= searchWindowSeconds && Math.Abs(bestCandidate - rawStart) > 0.05)
                {
                    adjustedStart = Math.Round(bestCandidate, 2);
                    startSnapped = true;
                    snapType = "silence";
                }
            }

            // 2. Analyse de silence autour du END : [rawEnd - searchWindow, rawEnd + searchWindow]
            double endRangeMin = Math.Max(0, rawEnd - searchWindowSeconds);
            double endRangeDuration = searchWindowSeconds * 2.0;

            var endSilences = await DetectSilencesAsync(ffmpegPath, filePath, endRangeMin, endRangeDuration, ct);
            if (endSilences.Count > 0)
            {
                double bestDist = double.MaxValue;
                double bestCandidate = rawEnd;

                foreach (var (sStart, sEnd) in endSilences)
                {
                    // Le début du silence (silence_start) est le moment idéal où la musique se termine !
                    double distStart = Math.Abs(sStart - rawEnd);
                    if (distStart < bestDist && distStart <= searchWindowSeconds)
                    {
                        bestDist = distStart;
                        bestCandidate = sStart;
                    }

                    // Ou la fin du silence si l'épisode reprend juste après le blanc
                    double distEnd = Math.Abs(sEnd - rawEnd);
                    if (distEnd < bestDist && distEnd <= searchWindowSeconds)
                    {
                        bestDist = distEnd;
                        bestCandidate = sEnd;
                    }
                }

                if (bestDist <= searchWindowSeconds && Math.Abs(bestCandidate - rawEnd) > 0.05)
                {
                    adjustedEnd = Math.Round(bestCandidate, 2);
                    endSnapped = true;
                    snapType = "silence";
                }
            }

            // 3. Fallback Black Frames si aucun silence n'a snappé
            if (!startSnapped || !endSnapped)
            {
                var blackFrames = await DetectBlackFramesAsync(ffmpegPath, filePath, startRangeMin, startRangeDuration + (rawEnd - rawStart), ct);
                if (blackFrames.Count > 0)
                {
                    if (!startSnapped)
                    {
                        var nearestStartBlack = blackFrames
                            .Select(b => Math.Abs(b.End - rawStart) < Math.Abs(b.Start - rawStart) ? b.End : b.Start)
                            .Where(t => Math.Abs(t - rawStart) <= searchWindowSeconds)
                            .OrderBy(t => Math.Abs(t - rawStart))
                            .FirstOrDefault();

                        if (nearestStartBlack > 0 && Math.Abs(nearestStartBlack - rawStart) <= searchWindowSeconds)
                        {
                            adjustedStart = Math.Round(nearestStartBlack, 2);
                            startSnapped = true;
                            if (snapType == "none") snapType = "black";
                        }
                    }

                    if (!endSnapped)
                    {
                        var nearestEndBlack = blackFrames
                            .Select(b => Math.Abs(b.Start - rawEnd) < Math.Abs(b.End - rawEnd) ? b.Start : b.End)
                            .Where(t => Math.Abs(t - rawEnd) <= searchWindowSeconds)
                            .OrderBy(t => Math.Abs(t - rawEnd))
                            .FirstOrDefault();

                        if (nearestEndBlack > 0 && Math.Abs(nearestEndBlack - rawEnd) <= searchWindowSeconds)
                        {
                            adjustedEnd = Math.Round(nearestEndBlack, 2);
                            endSnapped = true;
                            if (snapType == "none") snapType = "black";
                        }
                    }
                }
            }

            // Valider que l'intervalle résultant reste cohérent (> 15s)
            if (adjustedEnd - adjustedStart < 15.0)
            {
                adjustedStart = rawStart;
                adjustedEnd = rawEnd;
                startSnapped = false;
                endSnapped = false;
                snapType = "none";
            }

            var result = new FineTuneResult(
                Success: true,
                OriginalStart: rawStart,
                AdjustedStart: adjustedStart,
                OriginalEnd: rawEnd,
                AdjustedEnd: adjustedEnd,
                Snapped: startSnapped || endSnapped,
                SnapType: snapType,
                StartOffset: Math.Round(adjustedStart - rawStart, 2),
                EndOffset: Math.Round(adjustedEnd - rawEnd, 2),
                Message: (startSnapped || endSnapped) ? $"Calé avec succès ({snapType})" : "Aucune coupure franche à proximité"
            );

            FineTuneCache[cacheKey] = result;
            return result;
        }
        catch (Exception ex)
        {
            return new FineTuneResult(false, rawStart, rawStart, rawEnd, rawEnd, false, "none", 0, 0, ex.Message);
        }
    }

    /// <summary>
    /// Exécute silencedetect sur une courte plage temporelle
    /// </summary>
    private static async Task<List<(double Start, double End)>> DetectSilencesAsync(
        string ffmpegPath,
        string filePath,
        double rangeStart,
        double duration,
        CancellationToken ct)
    {
        var silences = new List<(double Start, double End)>();

        var psi = new ProcessStartInfo
        {
            FileName = ffmpegPath,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        psi.ArgumentList.Add("-v");
        psi.ArgumentList.Add("info");
        psi.ArgumentList.Add("-ss");
        psi.ArgumentList.Add(rangeStart.ToString("F2", CultureInfo.InvariantCulture));
        psi.ArgumentList.Add("-t");
        psi.ArgumentList.Add(duration.ToString("F2", CultureInfo.InvariantCulture));
        psi.ArgumentList.Add("-i");
        psi.ArgumentList.Add(filePath);
        psi.ArgumentList.Add("-vn");
        psi.ArgumentList.Add("-sn");
        psi.ArgumentList.Add("-af");
        psi.ArgumentList.Add("silencedetect=noise=-30dB:d=0.15");
        psi.ArgumentList.Add("-f");
        psi.ArgumentList.Add("null");
        psi.ArgumentList.Add("-");

        using var proc = new Process { StartInfo = psi };
        if (!proc.Start()) return silences;

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(6));

        var stderr = await proc.StandardError.ReadToEndAsync(timeoutCts.Token);
        await proc.WaitForExitAsync(timeoutCts.Token);

        double? currentSilenceStart = null;
        foreach (var line in stderr.Split('\n'))
        {
            var matchStart = SilenceStartRegex.Match(line);
            if (matchStart.Success && double.TryParse(matchStart.Groups["time"].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var tStart))
            {
                currentSilenceStart = rangeStart + tStart;
            }

            var matchEnd = SilenceEndRegex.Match(line);
            if (matchEnd.Success && double.TryParse(matchEnd.Groups["time"].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var tEnd))
            {
                double finalEnd = rangeStart + tEnd;
                double finalStart = currentSilenceStart ?? (finalEnd - 0.2);
                silences.Add((finalStart, finalEnd));
                currentSilenceStart = null;
            }
        }

        return silences;
    }

    /// <summary>
    /// Exécute blackdetect sur une courte plage temporelle
    /// </summary>
    private static async Task<List<(double Start, double End)>> DetectBlackFramesAsync(
        string ffmpegPath,
        string filePath,
        double rangeStart,
        double duration,
        CancellationToken ct)
    {
        var blackIntervals = new List<(double Start, double End)>();

        var psi = new ProcessStartInfo
        {
            FileName = ffmpegPath,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        psi.ArgumentList.Add("-v");
        psi.ArgumentList.Add("info");
        psi.ArgumentList.Add("-ss");
        psi.ArgumentList.Add(rangeStart.ToString("F2", CultureInfo.InvariantCulture));
        psi.ArgumentList.Add("-t");
        psi.ArgumentList.Add(Math.Min(120, duration).ToString("F2", CultureInfo.InvariantCulture));
        psi.ArgumentList.Add("-i");
        psi.ArgumentList.Add(filePath);
        psi.ArgumentList.Add("-an");
        psi.ArgumentList.Add("-sn");
        psi.ArgumentList.Add("-vf");
        psi.ArgumentList.Add("blackdetect=d=0.1:pic_th=0.98");
        psi.ArgumentList.Add("-f");
        psi.ArgumentList.Add("null");
        psi.ArgumentList.Add("-");

        using var proc = new Process { StartInfo = psi };
        if (!proc.Start()) return blackIntervals;

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(8));

        var stderr = await proc.StandardError.ReadToEndAsync(timeoutCts.Token);
        await proc.WaitForExitAsync(timeoutCts.Token);

        foreach (var line in stderr.Split('\n'))
        {
            var match = BlackDetectRegex.Match(line);
            if (match.Success)
            {
                if (double.TryParse(match.Groups["start"].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var s) &&
                    double.TryParse(match.Groups["end"].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var e))
                {
                    blackIntervals.Add((rangeStart + s, rangeStart + e));
                }
            }
        }

        return blackIntervals;
    }

    /// <summary>
    /// Analyse des sous-titres (intégrés ou fichiers annexes .srt/.ass/.vtt)
    /// Détecte les récapitulatifs ("Previously on...", "Précédemment...") et teasers ("Prochain épisode...")
    /// </summary>
    public static async Task<SubtitleMarkerResult> AnalyzeSubtitlesAsync(string filePath, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
        {
            return new SubtitleMarkerResult(false, null, null, null, null, "Fichier introuvable");
        }

        try
        {
            var dir = Path.GetDirectoryName(filePath);
            var baseName = Path.GetFileNameWithoutExtension(filePath);
            var subtitleFiles = new List<string>();

            if (!string.IsNullOrEmpty(dir) && Directory.Exists(dir))
            {
                // Trouver les fichiers sidecars dans le dossier
                var exts = new[] { ".srt", ".ass", ".ssa", ".vtt" };
                foreach (var ext in exts)
                {
                    var exact = Path.Combine(dir, baseName + ext);
                    if (File.Exists(exact)) subtitleFiles.Add(exact);

                    var pattern = baseName + "*" + ext;
                    var matches = Directory.GetFiles(dir, pattern);
                    subtitleFiles.AddRange(matches.Where(f => !subtitleFiles.Contains(f)));
                }
            }

            // Lire les sous-titres sidecars
            foreach (var subFile in subtitleFiles)
            {
                var content = await File.ReadAllTextAsync(subFile, ct);
                var (recap, preview) = ParseSubtitleTextCues(content);
                if (recap != null || preview != null)
                {
                    return new SubtitleMarkerResult(
                        Success: true,
                        RecapStart: recap?.Start,
                        RecapEnd: recap?.End,
                        PreviewStart: preview?.Start,
                        PreviewEnd: preview?.End,
                        Source: Path.GetFileName(subFile)
                    );
                }
            }

            // Si aucun sidecar trouvé, extraction du 1er flux de sous-titres via ffmpeg en WebVTT
            var ffmpegPath = BinaryManager.GetFfmpegPath();
            if (!string.IsNullOrWhiteSpace(ffmpegPath) && File.Exists(ffmpegPath))
            {
                var psi = new ProcessStartInfo
                {
                    FileName = ffmpegPath,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                psi.ArgumentList.Add("-v");
                psi.ArgumentList.Add("quiet");
                psi.ArgumentList.Add("-i");
                psi.ArgumentList.Add(filePath);
                psi.ArgumentList.Add("-map");
                psi.ArgumentList.Add("0:s:0?");
                psi.ArgumentList.Add("-f");
                psi.ArgumentList.Add("webvtt");
                psi.ArgumentList.Add("-");

                using var proc = new Process { StartInfo = psi };
                if (proc.Start())
                {
                    using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                    timeoutCts.CancelAfter(TimeSpan.FromSeconds(6));

                    var vttContent = await proc.StandardOutput.ReadToEndAsync(timeoutCts.Token);
                    await proc.WaitForExitAsync(timeoutCts.Token);

                    if (!string.IsNullOrWhiteSpace(vttContent))
                    {
                        var (recap, preview) = ParseSubtitleTextCues(vttContent);
                        if (recap != null || preview != null)
                        {
                            return new SubtitleMarkerResult(
                                Success: true,
                                RecapStart: recap?.Start,
                                RecapEnd: recap?.End,
                                PreviewStart: preview?.Start,
                                PreviewEnd: preview?.End,
                                Source: "embedded"
                            );
                        }
                    }
                }
            }

            return new SubtitleMarkerResult(true, null, null, null, null, "Aucun segment textuel détecté");
        }
        catch (Exception ex)
        {
            return new SubtitleMarkerResult(false, null, null, null, null, ex.Message);
        }
    }

    private static ((double Start, double End)? Recap, (double Start, double End)? Preview) ParseSubtitleTextCues(string subtitleContent)
    {
        (double Start, double End)? recap = null;
        (double Start, double End)? preview = null;

        // Pattern générique de timestamp VTT / SRT : 00:01:23.456 --> 00:01:25.789 ou 00:01:23,456 --> 00:01:25,789
        var cueTimeRegex = new Regex(@"(?<start>\d{1,2}:\d{2}:\d{2}[\.,]\d{3})\s*-->\s*(?<end>\d{1,2}:\d{2}:\d{2}[\.,]\d{3})", RegexOptions.Compiled);
        var lines = subtitleContent.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);

        double curStart = -1;
        double curEnd = -1;

        for (int i = 0; i < lines.Length; i++)
        {
            var line = lines[i].Trim();
            var timeMatch = cueTimeRegex.Match(line);
            if (timeMatch.Success)
            {
                curStart = ParseTimestampToSeconds(timeMatch.Groups["start"].Value);
                curEnd = ParseTimestampToSeconds(timeMatch.Groups["end"].Value);
                continue;
            }

            if (curStart >= 0 && !string.IsNullOrWhiteSpace(line))
            {
                // Si la réplique correspond à un Recap et se situe dans les 3 premières minutes
                if (recap == null && curStart < 240 && RecapPattern.IsMatch(line))
                {
                    recap = (Math.Max(0, curStart - 2), curEnd + 5);
                }
                // Si la réplique correspond à un Preview et se situe au-delà de 8 minutes
                else if (preview == null && curStart > 480 && PreviewPattern.IsMatch(line))
                {
                    preview = (curStart, curEnd + 30);
                }
            }
        }

        return (recap, preview);
    }

    private static double ParseTimestampToSeconds(string timestamp)
    {
        timestamp = timestamp.Replace(',', '.');
        var parts = timestamp.Split(':');
        if (parts.Length == 3)
        {
            double h = double.Parse(parts[0], CultureInfo.InvariantCulture);
            double m = double.Parse(parts[1], CultureInfo.InvariantCulture);
            double s = double.Parse(parts[2], CultureInfo.InvariantCulture);
            return h * 3600 + m * 60 + s;
        }
        if (parts.Length == 2)
        {
            double m = double.Parse(parts[0], CultureInfo.InvariantCulture);
            double s = double.Parse(parts[1], CultureInfo.InvariantCulture);
            return m * 60 + s;
        }
        return 0;
    }

    /// <summary>
    /// Corrélation acoustique locale multi-épisodes (Acoustic Matching)
    /// Compare deux épisodes du même dossier/série pour trouver la signature audio identique du générique
    /// Fonctionne 100% hors-ligne pour toute série TV, anime ou émission récurrente !
    /// </summary>
    public static async Task<AcousticMatchResult> MatchAudioOpeningAsync(
        string filePath,
        IEnumerable<string>? siblingFilePaths = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
        {
            return new AcousticMatchResult(false, 0, 0, 0, null, "Fichier principal introuvable");
        }

        var ffmpegPath = BinaryManager.GetFfmpegPath();
        if (string.IsNullOrWhiteSpace(ffmpegPath) || !File.Exists(ffmpegPath))
        {
            return new AcousticMatchResult(false, 0, 0, 0, null, "FFmpeg non disponible");
        }

        if (AcousticMatchCache.TryGetValue(filePath, out var cached))
        {
            return cached;
        }

        // Constantes partagées avec le backend Node.js
        const double PearsonThreshold = 0.70;
        const int WindowSamples = 1800;   // 90 s × 20 Hz
        const int SampleRateHz = 20;
        const double OpMinDurationS = 60.0;
        const double OpMaxDurationS = 120.0;
        const int EnvelopeDurationS = 240;

        try
        {
            var dir = Path.GetDirectoryName(filePath);
            var allCandidates = (siblingFilePaths ?? (string.IsNullOrEmpty(dir) ? Array.Empty<string>() : Directory.GetFiles(dir)))
                .Where(f => !string.Equals(f, filePath, StringComparison.OrdinalIgnoreCase))
                .Where(f =>
                {
                    var ext = Path.GetExtension(f).ToLowerInvariant();
                    return ext is ".mkv" or ".mp4" or ".avi" or ".webm" or ".m4v";
                })
                .OrderBy(f => f)
                .ToList();

            if (allCandidates.Count == 0)
            {
                return new AcousticMatchResult(false, 0, 0, 0, null, "Aucun épisode frère trouvé dans le dossier");
            }

            // Sélection des frères par préfixe de nom et proximité de numéro d'épisode
            var candidates = ChooseSiblings(filePath, allCandidates, maxCandidates: 2);

            foreach (var sibling in candidates)
            {
                var env1 = await ExtractAudioEnergyEnvelopeAsync(ffmpegPath, filePath, EnvelopeDurationS, ct);
                var env2 = await ExtractAudioEnergyEnvelopeAsync(ffmpegPath, sibling, EnvelopeDurationS, ct);

                if (env1.Length < 100 || env2.Length < 100) continue;

                double bestScore = 0.0;
                int bestT1 = -1;
                int bestT2 = -1;

                for (int t1 = 200; t1 <= env1.Length - WindowSamples; t1 += 20)
                {
                    for (int t2 = 200; t2 <= env2.Length - WindowSamples; t2 += 20)
                    {
                        double corr = ComputeNormalizedCorrelation(env1, t1, env2, t2, WindowSamples);
                        if (corr > bestScore)
                        {
                            bestScore = corr;
                            bestT1 = t1;
                            bestT2 = t2;
                        }
                    }
                }

                if (bestScore >= PearsonThreshold && bestT1 >= 0)
                {
                    double opStart = Math.Round(bestT1 / (double)SampleRateHz, 1);

                    // Estimer la fin de l'OP : étendre la fenêtre corrélée tant que Pearson ≥ seuil
                    int stepSamples = SampleRateHz; // 1 seconde
                    int extLen = WindowSamples;
                    int maxExtLen = (int)Math.Round(OpMaxDurationS * SampleRateHz);

                    while (
                        extLen + stepSamples <= maxExtLen &&
                        bestT1 + extLen + stepSamples <= env1.Length &&
                        bestT2 + extLen + stepSamples <= env2.Length)
                    {
                        double extCorr = ComputeNormalizedCorrelation(env1, bestT1, env2, bestT2, extLen + stepSamples);
                        if (extCorr < PearsonThreshold) break;
                        extLen += stepSamples;
                    }

                    double rawOpEnd = opStart + extLen / (double)SampleRateHz;
                    // Bornes min/max
                    double opEnd = Math.Round(
                        Math.Max(opStart + OpMinDurationS, Math.Min(rawOpEnd, opStart + OpMaxDurationS)), 1);

                    var res = new AcousticMatchResult(
                        Success: true,
                        Start: opStart,
                        End: opEnd,
                        Confidence: Math.Round(bestScore, 2),
                        MatchedSibling: Path.GetFileName(sibling),
                        Message: $"Générique corrélé avec succès contre {Path.GetFileName(sibling)}"
                    );

                    AcousticMatchCache[filePath] = res;
                    return res;
                }
                // Corrélation insuffisante sur ce candidat → essayer le suivant
            }

            return new AcousticMatchResult(false, 0, 0, 0, Path.GetFileName(candidates.FirstOrDefault() ?? ""), "Corrélation sonore insuffisante sur tous les candidats");
        }
        catch (Exception ex)
        {
            return new AcousticMatchResult(false, 0, 0, 0, null, ex.Message);
        }
    }

    /// <summary>
    /// Choisit les épisodes frères les plus pertinents : même préfixe de nom et épisode voisin, max maxCandidates.
    /// </summary>
    private static List<string> ChooseSiblings(string filePath, List<string> allCandidates, int maxCandidates)
    {
        var baseName = Path.GetFileNameWithoutExtension(filePath);
        // Extraire le numéro d'épisode
        var epMatch = Regex.Match(baseName, @"(?:[Ss]\d+)?[Ee](\d+)|[-_ ](\d{1,4})(?:v\d+)?(?:\s|$)");
        int epNum = epMatch.Success
            ? int.Parse(epMatch.Groups[1].Success ? epMatch.Groups[1].Value : epMatch.Groups[2].Value)
            : -1;

        // Préfixe approximatif (sans numéro d'épisode)
        var prefix = Regex.Replace(baseName, @"(?:[Ss]\d+)?[Ee]\d+.*", "");
        prefix = Regex.Replace(prefix, @"[-_ ]\d{1,4}(?:v\d+)?.*", "").ToLowerInvariant().Trim();
        var prefixShort = prefix.Length > 8 ? prefix.Substring(0, 8) : prefix;

        return allCandidates
            .Select(f =>
            {
                var fn = Path.GetFileNameWithoutExtension(f).ToLowerInvariant();
                bool hasSamePrefix = prefixShort.Length > 3 && fn.StartsWith(prefixShort);
                var sibEpMatch = Regex.Match(fn, @"(?:[Ss]\d+)?[Ee](\d+)|[-_ ](\d{1,4})(?:v\d+)?(?:\s|$)");
                int sibEp = sibEpMatch.Success
                    ? int.Parse(sibEpMatch.Groups[1].Success ? sibEpMatch.Groups[1].Value : sibEpMatch.Groups[2].Value)
                    : -1;
                int epDist = (epNum >= 0 && sibEp >= 0) ? Math.Abs(sibEp - epNum) : 999;
                return (f, score: (hasSamePrefix ? 0 : 100) + epDist);
            })
            .OrderBy(x => x.score)
            .Take(maxCandidates)
            .Select(x => x.f)
            .ToList();
    }


    private static async Task<float[]> ExtractAudioEnergyEnvelopeAsync(
        string ffmpegPath,
        string filePath,
        int durationSeconds,
        CancellationToken ct)
    {
        // Extraction audio sous-échantillonnée à 200 Hz PCM float (32-bit LE)
        // 200 Hz pendant 240s = 48 000 flottants (~192 Ko)
        var psi = new ProcessStartInfo
        {
            FileName = ffmpegPath,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        psi.ArgumentList.Add("-v");
        psi.ArgumentList.Add("quiet");
        psi.ArgumentList.Add("-ss");
        psi.ArgumentList.Add("0");
        psi.ArgumentList.Add("-t");
        psi.ArgumentList.Add(durationSeconds.ToString());
        psi.ArgumentList.Add("-i");
        psi.ArgumentList.Add(filePath);
        psi.ArgumentList.Add("-vn");
        psi.ArgumentList.Add("-sn");
        psi.ArgumentList.Add("-ac");
        psi.ArgumentList.Add("1");
        psi.ArgumentList.Add("-ar");
        psi.ArgumentList.Add("200");
        psi.ArgumentList.Add("-f");
        psi.ArgumentList.Add("f32le");
        psi.ArgumentList.Add("-");

        using var proc = new Process { StartInfo = psi };
        if (!proc.Start()) return Array.Empty<float>();

        using var ms = new MemoryStream();
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(10));

        var copyTask = proc.StandardOutput.BaseStream.CopyToAsync(ms, timeoutCts.Token);
        await proc.WaitForExitAsync(timeoutCts.Token);
        await copyTask;

        var bytes = ms.ToArray();
        int floatCount = bytes.Length / 4;
        if (floatCount == 0) return Array.Empty<float>();

        // Calculer l'énergie RMS par paquet de 10 échantillons (200 Hz / 10 = 20 Hz final)
        int envelopeLength = floatCount / 10;
        var envelope = new float[envelopeLength];

        for (int i = 0; i < envelopeLength; i++)
        {
            double sumSq = 0;
            for (int k = 0; k < 10; k++)
            {
                int byteOffset = (i * 10 + k) * 4;
                float sample = BitConverter.ToSingle(bytes, byteOffset);
                sumSq += sample * sample;
            }
            envelope[i] = (float)Math.Sqrt(sumSq / 10.0);
        }

        return envelope;
    }

    private static double ComputeNormalizedCorrelation(float[] a, int offsetA, float[] b, int offsetB, int length)
    {
        double sumA = 0, sumB = 0, sumAA = 0, sumBB = 0, sumAB = 0;
        for (int i = 0; i < length; i++)
        {
            float va = a[offsetA + i];
            float vb = b[offsetB + i];
            sumA += va;
            sumB += vb;
            sumAA += va * va;
            sumBB += vb * vb;
            sumAB += va * vb;
        }

        double meanA = sumA / length;
        double meanB = sumB / length;
        double varA = (sumAA / length) - (meanA * meanA);
        double varB = (sumBB / length) - (meanB * meanB);

        if (varA <= 1e-7 || varB <= 1e-7) return 0.0;

        double cov = (sumAB / length) - (meanA * meanB);
        return cov / Math.Sqrt(varA * varB);
    }
}

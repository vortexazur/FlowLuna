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
    string? Source = null,
    double? OpStart = null,
    double? OpEnd = null,
    string? OpMethod = null,
    double? EdStart = null,
    double? EdEnd = null,
    string? EdMethod = null,
    double? FirstDialogueAfterOp = null,
    double? FirstDialogueAfterEd = null
);

public record AcousticMatchResult(
    bool Success,
    double Start,
    double End,
    double Confidence,
    string? MatchedSibling = null,
    string? Message = null,
    double? EdStart = null,
    double? EdEnd = null
);

/// <summary>
/// Service d'analyse et de détection fine des génériques et segments vidéo
/// Inspiré des algorithmes et heuristiques de haute précision de 'intro-skipper'
/// (Snapping asymétrique aux silences/black frames, analyse ASS/SRT/VTT et trous de dialogues 89-90s, corrélation acoustique O(1) à 50ms).
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

    private static readonly Regex AssDialogueRegex = new(
        @"^Dialogue:\s*\d+\s*,\s*(?<start>\d+:\d{2}:\d{2}[\.,]\d{1,3})\s*,\s*(?<end>\d+:\d{2}:\d{2}[\.,]\d{1,3})\s*,\s*(?<style>[^,]*)\s*,\s*(?<actor>[^,]*)\s*,\s*[^,]*\s*,\s*[^,]*\s*,\s*[^,]*\s*,\s*(?<effect>[^,]*)\s*,(?<text>.*)$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    private static readonly Regex OpStyleRegex = new(
        @"(?:^|[\s_\-\(\[])(op|opening|ncop|op[\s_\-]?(?:romaji|kanji|trad|fr|en|jp|kara|lyrics|\d+)|karaoke[\s_\-]?op)(?:$|[\s_\-\)\]])",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    private static readonly Regex EdStyleRegex = new(
        @"(?:^|[\s_\-\(\[])(ed|ending|nced|ed[\s_\-]?(?:romaji|kanji|trad|fr|en|jp|kara|lyrics|\d+)|karaoke[\s_\-]?ed)(?:$|[\s_\-\)\]])",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    private static readonly Regex SongStyleRegex = new(
        @"(?:^|[\s_\-\(\[])(song|lyrics|karaoke|romaji|kanji|paroles|chanson|theme|k[\s_\-]?timed)(?:$|[\s_\-\)\]])",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    private static readonly Regex SignStyleRegex = new(
        @"(?:^|[\s_\-\(\[])(sign|signs|typeset|ts|title|eyecatch|logo|board|caption|screen|note)(?:$|[\s_\-\)\]])",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    /// <summary>
    /// Calage chirurgical asymétrique des marqueurs sur les transitions de silence audio (ou black frames)
    /// Résout la dérive temporelle et évite les coupures brutales en milieu de phrase ou de musique.
    /// </summary>
    public static async Task<FineTuneResult> FineTuneIntervalAsync(
        string filePath,
        double rawStart,
        double rawEnd,
        double searchWindowSeconds = 3.5,
        CancellationToken ct = default,
        double? firstDialogueAfter = null)
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

        var dlgKey = firstDialogueAfter.HasValue ? Math.Round(firstDialogueAfter.Value, 2).ToString(CultureInfo.InvariantCulture) : "none";
        var cacheKey = $"{filePath}_{Math.Round(rawStart, 1)}_{Math.Round(rawEnd, 1)}_{searchWindowSeconds}_{dlgKey}";
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
            double startRangeMin = Math.Max(0, rawStart - searchWindowSeconds);
            double startRangeDuration = searchWindowSeconds * 2.0;
            double endRangeMin = Math.Max(0, rawEnd - searchWindowSeconds);
            double endRangeDuration = searchWindowSeconds * 2.0;

            var startSilencesTask = DetectSilencesAsync(ffmpegPath, filePath, startRangeMin, startRangeDuration, ct);
            var endSilencesTask = DetectSilencesAsync(ffmpegPath, filePath, endRangeMin, endRangeDuration, ct);
            await Task.WhenAll(startSilencesTask, endSilencesTask);

            var startSilences = startSilencesTask.Result;
            var endSilences = endSilencesTask.Result;

            // 1. Sélection directionnelle de T_start : privilégier sEnd (attaque musicale)
            if (startSilences.Count > 0)
            {
                double bestScore = double.MaxValue;
                double bestCandidate = rawStart;

                foreach (var (sStart, sEnd) in startSilences)
                {
                    double distEnd = Math.Abs(sEnd - rawStart);
                    if (distEnd <= searchWindowSeconds && distEnd > 0.04)
                    {
                        double effEnd = distEnd - 0.35;
                        if (effEnd < bestScore)
                        {
                            bestScore = effEnd;
                            bestCandidate = sEnd;
                        }
                    }

                    double distStart = Math.Abs(sStart - rawStart);
                    if (distStart <= searchWindowSeconds && distStart > 0.04 && distStart < bestScore)
                    {
                        bestScore = distStart;
                        bestCandidate = sStart;
                    }
                }

                if (bestScore < double.MaxValue)
                {
                    adjustedStart = Math.Round(bestCandidate, 2);
                    startSnapped = true;
                    snapType = "silence";
                }
            }

            // Garde-fou anti-coupure de réplique sur T_end
            double maxAllowedEnd = (firstDialogueAfter.HasValue && firstDialogueAfter.Value >= rawEnd - searchWindowSeconds)
                ? firstDialogueAfter.Value - 0.15
                : double.PositiveInfinity;

            double rawDuration = rawEnd - adjustedStart;
            bool isNearCanonical = rawDuration >= 84.5 && rawDuration <= 94.5;

            // 2. Sélection directionnelle de T_end : favoriser la reprise post-silence et la durée canonique (88.2s - 90.8s)
            if (endSilences.Count > 0)
            {
                double bestScore = double.MaxValue;
                double bestCandidate = rawEnd;

                foreach (var (sStart, sEnd) in endSilences)
                {
                    double silenceLen = sEnd - sStart;
                    var candidates = silenceLen <= 1.4
                        ? new[] { (Pt: sEnd, RoleBonus: -0.22), (Pt: sStart, RoleBonus: 0.0) }
                        : new[] { (Pt: sStart, RoleBonus: -0.10), (Pt: sEnd, RoleBonus: 0.0) };

                    foreach (var (pt, roleBonus) in candidates)
                    {
                        if (pt > maxAllowedEnd) continue;
                        double dist = Math.Abs(pt - rawEnd);
                        if (dist > searchWindowSeconds || dist <= 0.04) continue;

                        double candidateDuration = pt - adjustedStart;
                        double canonicalBias = 0.0;
                        if (isNearCanonical)
                        {
                            if (candidateDuration >= 88.2 && candidateDuration <= 90.8) canonicalBias = -0.35;
                            else if (candidateDuration < 86.5) canonicalBias = 0.85;
                        }

                        double effScore = dist + roleBonus + canonicalBias;
                        if (effScore < bestScore)
                        {
                            bestScore = effScore;
                            bestCandidate = pt;
                        }
                    }
                }

                if (bestScore < double.MaxValue)
                {
                    adjustedEnd = Math.Round(bestCandidate, 2);
                    endSnapped = true;
                    if (snapType == "none") snapType = "silence";
                }
            }

            // 3. Fallback Black Frames ciblé sur les fenêtres de 7s si aucun silence n'a snappé
            if (!startSnapped)
            {
                var startBlacks = await DetectBlackFramesAsync(ffmpegPath, filePath, startRangeMin, startRangeDuration, ct);
                if (startBlacks.Count > 0)
                {
                    var nearestStartBlack = startBlacks
                        .Select(b => Math.Abs(b.End - rawStart) - 0.15 < Math.Abs(b.Start - rawStart) ? b.End : b.Start)
                        .Where(t => Math.Abs(t - rawStart) <= searchWindowSeconds && Math.Abs(t - rawStart) > 0.04)
                        .OrderBy(t => Math.Abs(t - rawStart))
                        .FirstOrDefault();

                    if (nearestStartBlack > 0)
                    {
                        adjustedStart = Math.Round(nearestStartBlack, 2);
                        startSnapped = true;
                        if (snapType == "none") snapType = "black";
                    }
                }
            }

            if (!endSnapped)
            {
                var endBlacks = await DetectBlackFramesAsync(ffmpegPath, filePath, endRangeMin, endRangeDuration, ct);
                if (endBlacks.Count > 0)
                {
                    var nearestEndBlack = endBlacks
                        .Select(b => (b.End - b.Start <= 1.4) ? b.End : b.Start)
                        .Where(t => t <= maxAllowedEnd && Math.Abs(t - rawEnd) <= searchWindowSeconds && Math.Abs(t - rawEnd) > 0.04)
                        .OrderBy(t => Math.Abs(t - rawEnd))
                        .FirstOrDefault();

                    if (nearestEndBlack > 0)
                    {
                        adjustedEnd = Math.Round(nearestEndBlack, 2);
                        endSnapped = true;
                        if (snapType == "none") snapType = "black";
                    }
                }
            }

            // Garde-fou absolu anti-coupure de réplique
            if (adjustedEnd > maxAllowedEnd && maxAllowedEnd > adjustedStart + 15.0)
            {
                adjustedEnd = Math.Round(maxAllowedEnd, 2);
                endSnapped = true;
                if (snapType == "none") snapType = "silence";
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
    /// Analyse des sous-titres (intégrés ou fichiers annexes .ass/.ssa/.srt/.vtt)
    /// Détecte OP, ED (styles ASS, karaoké, trous de dialogues ~89-90s), Recap, Preview et le 1er dialogue post-OP/ED
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
                // Prioriser .ass et .ssa pour capter les styles OP/ED et le karaoké
                var exts = new[] { ".ass", ".ssa", ".srt", ".vtt" };
                foreach (var ext in exts)
                {
                    var exact = Path.Combine(dir, baseName + ext);
                    if (File.Exists(exact)) subtitleFiles.Add(exact);

                    var pattern = baseName + "*" + ext;
                    var matches = Directory.GetFiles(dir, pattern);
                    subtitleFiles.AddRange(matches.Where(f => !subtitleFiles.Contains(f)));
                }
            }

            foreach (var subFile in subtitleFiles)
            {
                var content = await File.ReadAllTextAsync(subFile, ct);
                var parsed = ParseSubtitleTextCues(content, Path.GetFileName(subFile));
                if (parsed.RecapStart != null || parsed.PreviewStart != null || parsed.OpStart != null || parsed.EdStart != null)
                {
                    return parsed;
                }
            }

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
                        var parsed = ParseSubtitleTextCues(vttContent, "embedded");
                        if (parsed.RecapStart != null || parsed.PreviewStart != null || parsed.OpStart != null || parsed.EdStart != null)
                        {
                            return parsed;
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

    private record ParsedSubCue(
        double Start,
        double End,
        string CleanText,
        bool IsOpSong,
        bool IsEdSong,
        bool IsGenericSong,
        bool IsSign
    );

    private static SubtitleMarkerResult ParseSubtitleTextCues(string subtitleContent, string sourceName)
    {
        var cueTimeRegex = new Regex(@"(?<start>\d{1,2}:\d{2}:\d{2}[\.,]\d{1,3})\s*-->\s*(?<end>\d{1,2}:\d{2}:\d{2}[\.,]\d{1,3})", RegexOptions.Compiled);
        var overrideTagRegex = new Regex(@"\{[^\}]*\}|<[^>]*>", RegexOptions.Compiled);
        var lines = subtitleContent.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);

        var cues = new List<ParsedSubCue>();
        double curStart = -1;
        double curEnd = -1;
        var curTextLines = new List<string>();

        void FlushVttCue()
        {
            if (curStart >= 0 && curTextLines.Count > 0)
            {
                var rawText = string.Join(" ", curTextLines).Trim();
                var cleanText = overrideTagRegex.Replace(rawText, "").Trim();
                if (!string.IsNullOrEmpty(cleanText))
                {
                    bool hasMusic = rawText.IndexOfAny(new[] { '♪', '♫', '♬' }) >= 0 || Regex.IsMatch(rawText, @"\\k[fo]?", RegexOptions.IgnoreCase);
                    cues.Add(new ParsedSubCue(curStart, curEnd, cleanText, false, false, hasMusic, false));
                }
            }
            curStart = -1;
            curEnd = -1;
            curTextLines.Clear();
        }

        foreach (var rawLine in lines)
        {
            var assMatch = AssDialogueRegex.Match(rawLine);
            if (assMatch.Success)
            {
                FlushVttCue();
                double start = ParseTimestampToSeconds(assMatch.Groups["start"].Value);
                double end = ParseTimestampToSeconds(assMatch.Groups["end"].Value);
                var style = assMatch.Groups["style"].Value.Trim();
                var actor = assMatch.Groups["actor"].Value.Trim();
                var effect = assMatch.Groups["effect"].Value.Trim();
                var rawText = assMatch.Groups["text"].Value.Trim();
                var cleanText = overrideTagRegex.Replace(rawText, "").Replace("\\N", " ").Replace("\\n", " ").Trim();
                if (string.IsNullOrEmpty(cleanText) || end <= start) continue;

                var meta = $"{style} {actor} {effect}";
                bool isOpSong = OpStyleRegex.IsMatch(meta);
                bool isEdSong = EdStyleRegex.IsMatch(meta);
                bool hasMusic = rawText.IndexOfAny(new[] { '♪', '♫', '♬' }) >= 0 || Regex.IsMatch(rawText, @"\\k[fo]?", RegexOptions.IgnoreCase);
                bool isGenericSong = isOpSong || isEdSong || SongStyleRegex.IsMatch(meta) || hasMusic;
                bool isSign = !isGenericSong && SignStyleRegex.IsMatch(meta);

                cues.Add(new ParsedSubCue(start, end, cleanText, isOpSong, isEdSong, isGenericSong, isSign));
                continue;
            }

            var line = rawLine.Trim();
            var timeMatch = cueTimeRegex.Match(line);
            if (timeMatch.Success)
            {
                FlushVttCue();
                curStart = ParseTimestampToSeconds(timeMatch.Groups["start"].Value);
                curEnd = ParseTimestampToSeconds(timeMatch.Groups["end"].Value);
                continue;
            }

            if (curStart >= 0)
            {
                if (string.IsNullOrWhiteSpace(line)) FlushVttCue();
                else curTextLines.Add(line);
            }
        }
        FlushVttCue();

        if (cues.Count == 0)
        {
            return new SubtitleMarkerResult(true, null, null, null, null, sourceName);
        }

        cues.Sort((a, b) => a.Start.CompareTo(b.Start));

        (double Start, double End)? recap = null;
        (double Start, double End)? preview = null;

        foreach (var c in cues)
        {
            if (recap == null && c.Start < 240 && RecapPattern.IsMatch(c.CleanText))
            {
                recap = (Math.Max(0, c.Start - 2), c.End + 5);
            }
            else if (preview == null && c.Start > 480 && PreviewPattern.IsMatch(c.CleanText))
            {
                preview = (c.Start, c.End + 30);
            }
        }

        var dialogueCues = cues.Where(c => !c.IsOpSong && !c.IsEdSong && !c.IsGenericSong && !c.IsSign).ToList();
        double? opStart = null, opEnd = null, edStart = null, edEnd = null;
        string? opMethod = null, edMethod = null;

        // 1. Détection OP par styles ASS / Paroles (0s -> 390s)
        var opSongs = cues.Where(c => c.Start <= 390 && (c.IsOpSong || (c.IsGenericSong && !c.IsEdSong))).ToList();
        if (opSongs.Count >= 3)
        {
            double firstLyric = opSongs.First().Start;
            double lastLyric = opSongs.Max(c => c.End);
            if (lastLyric - firstLyric is >= 35 and <= 115)
            {
                var prevDlg = dialogueCues.LastOrDefault(d => d.End <= firstLyric + 1.5);
                var nextDlg = dialogueCues.FirstOrDefault(d => d.Start >= lastLyric - 1.5);
                double s = firstLyric, e = lastLyric;

                if (prevDlg != null && nextDlg != null && (nextDlg.Start - prevDlg.End) is >= 85.0 and <= 94.5)
                {
                    s = Math.Round(prevDlg.End + 0.2, 2);
                    e = Math.Round(nextDlg.Start - 0.15, 2);
                }

                if (e - s is >= 55 and <= 120)
                {
                    opStart = Math.Round(s, 2);
                    opEnd = Math.Round(e, 2);
                    opMethod = opSongs.Any(c => c.IsOpSong) ? "ass-style" : "lyrics";
                }
            }
        }

        // 2. Détection OP par Trou de Dialogues Canonique (~85s à 94s)
        if (opStart == null && dialogueCues.Count >= 5)
        {
            if (dialogueCues[0].Start is >= 87.0 and <= 92.5)
            {
                opStart = 0;
                opEnd = Math.Round(dialogueCues[0].Start - 0.15, 2);
                opMethod = "dialogue-gap";
            }
            else
            {
                double bestGapDist = double.MaxValue;
                for (int i = 0; i < dialogueCues.Count - 1; i++)
                {
                    double pEnd = dialogueCues[i].End;
                    double nStart = dialogueCues[i + 1].Start;
                    if (pEnd < 10) continue;
                    if (pEnd > 300) break;
                    double gap = nStart - pEnd;
                    if (gap is >= 85.0 and <= 94.0 && Math.Abs(gap - 89.8) < bestGapDist)
                    {
                        bestGapDist = Math.Abs(gap - 89.8);
                        opStart = Math.Round(pEnd + 0.2, 2);
                        opEnd = Math.Round(nStart - 0.15, 2);
                        opMethod = "dialogue-gap";
                    }
                }
            }
        }

        // 3. Détection ED par styles ASS / Paroles ou Trou de Dialogues (> 900s)
        var edSongs = cues.Where(c => c.Start >= 900 && (c.IsEdSong || (c.IsGenericSong && !c.IsOpSong))).ToList();
        if (edSongs.Count >= 3)
        {
            double firstLyric = edSongs.First().Start;
            double lastLyric = edSongs.Max(c => c.End);
            if (lastLyric - firstLyric is >= 35 and <= 115)
            {
                edStart = Math.Round(firstLyric, 2);
                edEnd = Math.Round(lastLyric, 2);
                edMethod = edSongs.Any(c => c.IsEdSong) ? "ass-style" : "lyrics";
            }
        }
        else if (dialogueCues.Count >= 5)
        {
            for (int i = dialogueCues.Count - 2; i >= 0; i--)
            {
                double pEnd = dialogueCues[i].End;
                double nStart = dialogueCues[i + 1].Start;
                if (pEnd < 900) break;
                double gap = nStart - pEnd;
                if (gap is >= 85.0 and <= 94.0)
                {
                    edStart = Math.Round(pEnd + 0.2, 2);
                    edEnd = Math.Round(nStart - 0.15, 2);
                    edMethod = "dialogue-gap";
                    break;
                }
            }
        }

        double? firstDlgAfterOp = null;
        if (opEnd.HasValue)
        {
            var dlg = dialogueCues.FirstOrDefault(d => d.Start >= opEnd.Value - 2.5);
            if (dlg != null) firstDlgAfterOp = Math.Round(dlg.Start, 2);
        }

        double? firstDlgAfterEd = null;
        if (edEnd.HasValue)
        {
            var dlg = dialogueCues.FirstOrDefault(d => d.Start >= edEnd.Value - 2.5);
            if (dlg != null) firstDlgAfterEd = Math.Round(dlg.Start, 2);
        }

        return new SubtitleMarkerResult(
            Success: true,
            RecapStart: recap?.Start,
            RecapEnd: recap?.End,
            PreviewStart: preview?.Start,
            PreviewEnd: preview?.End,
            Source: sourceName,
            OpStart: opStart,
            OpEnd: opEnd,
            OpMethod: opMethod,
            EdStart: edStart,
            EdEnd: edEnd,
            EdMethod: edMethod,
            FirstDialogueAfterOp: firstDlgAfterOp,
            FirstDialogueAfterEd: firstDlgAfterEd
        );
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
    /// Sommes préfixées O(1), recherche dès 0.0s, affinage à 50 ms et bornage par fenêtre locale de 3.0s
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

            var candidates = ChooseSiblings(filePath, allCandidates, maxCandidates: 2);

            foreach (var sibling in candidates)
            {
                var env1 = await ExtractAudioEnergyEnvelopeAsync(ffmpegPath, filePath, EnvelopeDurationS, ct);
                var env2 = await ExtractAudioEnergyEnvelopeAsync(ffmpegPath, sibling, EnvelopeDurationS, ct);

                var match = FindAcousticCorrelatedInterval(env1, env2);
                if (match.HasValue)
                {
                    var res = new AcousticMatchResult(
                        Success: true,
                        Start: match.Value.Start,
                        End: match.Value.End,
                        Confidence: match.Value.Confidence,
                        MatchedSibling: Path.GetFileName(sibling),
                        Message: $"Générique corrélé avec succès contre {Path.GetFileName(sibling)}"
                    );

                    AcousticMatchCache[filePath] = res;
                    return res;
                }
            }

            return new AcousticMatchResult(false, 0, 0, 0, Path.GetFileName(candidates.FirstOrDefault() ?? ""), "Corrélation sonore insuffisante sur tous les candidats");
        }
        catch (Exception ex)
        {
            return new AcousticMatchResult(false, 0, 0, 0, null, ex.Message);
        }
    }

    private static (double Start, double End, double Confidence)? FindAcousticCorrelatedInterval(float[] env1, float[] env2)
    {
        const double PearsonThreshold = 0.70;
        const int BaseWindowSamples = 1720; // 86 s × 20 Hz
        const int EdgeWin = 60;             // 3.0 s × 20 Hz
        const int SampleRateHz = 20;
        const double OpMinDurationS = 60.0;
        const double OpMaxDurationS = 115.0;

        int n1 = env1.Length;
        int n2 = env2.Length;
        if (n1 < BaseWindowSamples + 20 || n2 < BaseWindowSamples + 20) return null;

        var ps1 = new double[n1 + 1];
        var psSq1 = new double[n1 + 1];
        for (int i = 0; i < n1; i++)
        {
            double v = env1[i];
            ps1[i + 1] = ps1[i] + v;
            psSq1[i + 1] = psSq1[i] + v * v;
        }

        var ps2 = new double[n2 + 1];
        var psSq2 = new double[n2 + 1];
        for (int i = 0; i < n2; i++)
        {
            double v = env2[i];
            ps2[i + 1] = ps2[i] + v;
            psSq2[i + 1] = psSq2[i] + v * v;
        }

        double FastPearson(int oA, int oB, int len)
        {
            if (oA < 0 || oB < 0 || oA + len > n1 || oB + len > n2 || len <= 0) return 0.0;
            double sA = ps1[oA + len] - ps1[oA];
            double sAA = psSq1[oA + len] - psSq1[oA];
            double sB = ps2[oB + len] - ps2[oB];
            double sBB = psSq2[oB + len] - psSq2[oB];

            double mA = sA / len;
            double mB = sB / len;
            double vA = (sAA / len) - (mA * mA);
            double vB = (sBB / len) - (mB * mB);
            if (vA <= 1e-7 || vB <= 1e-7) return 0.0;

            double sAB = 0;
            for (int i = 0; i < len; i++)
            {
                sAB += env1[oA + i] * env2[oB + i];
            }
            return ((sAB / len) - (mA * mB)) / Math.Sqrt(vA * vB);
        }

        double bestScore = 0.0;
        int bestT1 = -1;
        int bestT2 = -1;
        const int coarseStep = 10; // 0.5s

        for (int t1 = 0; t1 <= n1 - BaseWindowSamples; t1 += coarseStep)
        {
            for (int t2 = 0; t2 <= n2 - BaseWindowSamples; t2 += coarseStep)
            {
                double corr = FastPearson(t1, t2, BaseWindowSamples);
                if (corr > bestScore)
                {
                    bestScore = corr;
                    bestT1 = t1;
                    bestT2 = t2;
                }
            }
        }

        if (bestScore < PearsonThreshold || bestT1 < 0 || bestT2 < 0) return null;

        int minT1 = Math.Max(0, bestT1 - coarseStep);
        int maxT1 = Math.Min(n1 - BaseWindowSamples, bestT1 + coarseStep);
        int minT2 = Math.Max(0, bestT2 - coarseStep);
        int maxT2 = Math.Min(n2 - BaseWindowSamples, bestT2 + coarseStep);

        for (int t1 = minT1; t1 <= maxT1; t1++)
        {
            for (int t2 = minT2; t2 <= maxT2; t2++)
            {
                double corr = FastPearson(t1, t2, BaseWindowSamples);
                if (corr > bestScore)
                {
                    bestScore = corr;
                    bestT1 = t1;
                    bestT2 = t2;
                }
            }
        }

        while (bestT1 >= 2 && bestT2 >= 2 && FastPearson(bestT1 - 2, bestT2 - 2, EdgeWin) >= 0.58)
        {
            bestT1 -= 2;
            bestT2 -= 2;
        }

        int trimStartCount = 0;
        while (trimStartCount < 80 && bestT1 + EdgeWin < n1 && bestT2 + EdgeWin < n2 && FastPearson(bestT1, bestT2, EdgeWin) < 0.45)
        {
            bestT1 += 2;
            bestT2 += 2;
            trimStartCount += 2;
        }

        int extLen = BaseWindowSamples - trimStartCount;
        int maxExtLen = (int)Math.Round(OpMaxDurationS * SampleRateHz);
        int minExtLen = (int)Math.Round(OpMinDurationS * SampleRateHz);

        const int FrontierWin = 24; // 1.2s à 20 Hz
        while (extLen > minExtLen && FastPearson(bestT1 + extLen - FrontierWin, bestT2 + extLen - FrontierWin, FrontierWin) < 0.65)
        {
            extLen -= 2;
        }

        while (extLen + 2 <= maxExtLen && bestT1 + extLen + 2 <= n1 && bestT2 + extLen + 2 <= n2)
        {
            if (FastPearson(bestT1 + extLen + 2 - FrontierWin, bestT2 + extLen + 2 - FrontierWin, FrontierWin) < 0.68) break;
            extLen += 2;
        }

        double opStart = Math.Round(bestT1 / (double)SampleRateHz, 1);
        double rawOpEnd = (bestT1 + extLen) / (double)SampleRateHz;
        double opEnd = Math.Round(Math.Max(opStart + OpMinDurationS, Math.Min(rawOpEnd, opStart + OpMaxDurationS)), 1);

        return (opStart, opEnd, Math.Round(bestScore, 2));
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
}

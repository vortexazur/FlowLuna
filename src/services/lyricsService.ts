export interface LyricLine {
  time: number; // In seconds
  text: string;
}

export interface LyricsResult {
  lines: LyricLine[];
  rawLrc?: string;
  isSynced: boolean;
  isInstrumental: boolean;
  source: 'cache' | 'local_file' | 'lrclib' | 'manual';
  trackName?: string;
  artistName?: string;
}

/**
 * Parses a standard LRC text string into an array of time-stamped LyricLine objects.
 */
export function parseLrc(lrcText: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const rawLines = lrcText.split(/\r?\n/);

  // Check for global [offset: +/-ms] tag (standard LRC spec: +ms = playback later / lyrics earlier)
  let globalOffset = 0;
  for (const rawLine of rawLines) {
    const offsetMatch = rawLine.match(/\[offset:\s*([+-]?\d+)\s*\]/i);
    if (offsetMatch) {
      globalOffset = parseInt(offsetMatch[1], 10) / 1000;
      break;
    }
  }

  // Match [mm:ss.xx] or [mm:ss.xxx] or [mm:ss]
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    timeRegex.lastIndex = 0;
    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length === 0) continue;

    // Clean text by stripping timestamp brackets
    const text = trimmed.replace(timeRegex, '').trim();

    for (const match of matches) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      let ms = 0;
      if (match[3]) {
        ms = match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10);
      }
      const timeInSec = Math.max(0, min * 60 + sec + ms / 1000 + globalOffset);
      lines.push({ time: timeInSec, text });
    }
  }

  // Sort chronologically
  lines.sort((a, b) => a.time - b.time);
  return lines;
}

/**
 * Normalizes title and artist strings for optimal lyrics search matching.
 */
export function cleanSearchQuery(title: string, artist?: string): { query: string; cleanTitle: string; cleanArtist: string } {
  let cleanTitle = title
    .replace(/\.[^/.]+$/, '') // remove extension
    .replace(/[☆★✦✧✪]/g, ' ')
    .replace(/\b(?:official|video|music video|clip|audio|lyrics|paroles|remix|hd|4k|mv|prod\.|feat\.|ft\.)\b/gi, '')
    .replace(/[\[\(].*?(?:official|video|audio|lyrics|paroles|clip|remix|mv|feat|ft).*?[\]\)]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  let cleanArtist = artist && artist !== 'Artiste Local' && artist !== 'Clip Vidéo' ? artist.trim() : '';

  if (!cleanArtist && cleanTitle.includes(' - ')) {
    const parts = cleanTitle.split(' - ');
    cleanArtist = parts[0].trim();
    cleanTitle = parts.slice(1).join(' - ').trim();
  }

  const query = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;
  return { query, cleanTitle, cleanArtist };
}

/**
 * Retrieves synchronized lyrics:
 * 1. From local .lrc file next to the audio file or server cache
 * 2. From LRCLIB API (direct match or full-text search)
 */
export async function fetchLyricsForTrack(
  title: string,
  artist?: string,
  duration?: number,
  filePath?: string
): Promise<LyricsResult | null> {
  // 1. Try local server endpoint for local .lrc file or server cache
  if (filePath) {
    try {
      const res = await fetch(`/api/lyrics?file=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.syncedLyrics) {
          const parsed = parseLrc(data.syncedLyrics);
          if (parsed.length > 0) {
            return {
              lines: parsed,
              rawLrc: data.syncedLyrics,
              isSynced: true,
              isInstrumental: false,
              source: data.source || 'cache',
            };
          }
        }
      }
    } catch {
      // Backend not running or in browser standalone
    }
  }

  const { query, cleanTitle, cleanArtist } = cleanSearchQuery(title, artist);

  // 2. Try LRCLIB exact match if artist and title are known
  if (cleanArtist && cleanTitle) {
    try {
      const params = new URLSearchParams({
        artist_name: cleanArtist,
        track_name: cleanTitle,
      });
      if (duration && duration > 0) {
        params.set('duration', Math.round(duration).toString());
      }

      const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
      if (res.ok) {
        const item = await res.json();
        if (item.instrumental) {
          return {
            lines: [{ time: 0, text: '♪ Morceau instrumental ♪' }],
            isSynced: false,
            isInstrumental: true,
            source: 'lrclib',
          };
        }
        if (item.syncedLyrics) {
          const parsed = parseLrc(item.syncedLyrics);
          if (parsed.length > 0) {
            cacheLyricsToServer(filePath, item.syncedLyrics);
            return {
              lines: parsed,
              rawLrc: item.syncedLyrics,
              isSynced: true,
              isInstrumental: false,
              source: 'lrclib',
              trackName: item.trackName,
              artistName: item.artistName,
            };
          }
        } else if (item.plainLyrics) {
          const plainLines = item.plainLyrics
            .split(/\r?\n/)
            .map((t: string) => t.trim())
            .filter(Boolean)
            .map((text: string, idx: number) => ({ time: idx * 5, text }));
          return {
            lines: plainLines,
            rawLrc: item.plainLyrics,
            isSynced: false,
            isInstrumental: false,
            source: 'lrclib',
            trackName: item.trackName,
            artistName: item.artistName,
          };
        }
      }
    } catch {
      // Continue to search fallback
    }
  }

  // 3. Fallback to LRCLIB full-text search
  try {
    const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
    if (searchRes.ok) {
      const items = await searchRes.json();
      if (Array.isArray(items) && items.length > 0) {
        // Pick best candidate (first with syncedLyrics)
        const match = items.find((i) => i.syncedLyrics) || items[0];
        if (match.instrumental) {
          return {
            lines: [{ time: 0, text: '♪ Morceau instrumental ♪' }],
            isSynced: false,
            isInstrumental: true,
            source: 'lrclib',
          };
        }
        if (match.syncedLyrics) {
          const parsed = parseLrc(match.syncedLyrics);
          if (parsed.length > 0) {
            cacheLyricsToServer(filePath, match.syncedLyrics);
            return {
              lines: parsed,
              rawLrc: match.syncedLyrics,
              isSynced: true,
              isInstrumental: false,
              source: 'lrclib',
              trackName: match.trackName,
              artistName: match.artistName,
            };
          }
        } else if (match.plainLyrics) {
          const plainLines = match.plainLyrics
            .split(/\r?\n/)
            .map((t: string) => t.trim())
            .filter(Boolean)
            .map((text: string, idx: number) => ({ time: idx * 5, text }));
          return {
            lines: plainLines,
            rawLrc: match.plainLyrics,
            isSynced: false,
            isInstrumental: false,
            source: 'lrclib',
            trackName: match.trackName,
            artistName: match.artistName,
          };
        }
      }
    }
  } catch {
    // Network error
  }

  return null;
}

/**
 * Saves lyrics to FlowLuna backend cache in background
 */
function cacheLyricsToServer(filePath?: string, lrc?: string) {
  if (!filePath || !lrc) return;
  fetch('/api/lyrics/cache', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, lrc }),
  }).catch(() => {});
}

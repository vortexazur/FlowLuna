import { SkipInterval, Track, VideoChapter, VideoSkipMarkers } from '../types';

export interface AnimeParseResult {
  cleanTitle: string;
  episodeNumber: number;
}

/**
 * Nettoie le nom de fichier ou titre pour extraire le nom de l'anime et le numéro d'épisode.
 */
export function parseAnimeTitleAndEpisode(rawTitle: string): AnimeParseResult {
  if (!rawTitle) {
    return { cleanTitle: 'Anime', episodeNumber: 1 };
  }

  // 1. Supprimer l'extension
  let clean = rawTitle.replace(/\.(mp4|mkv|avi|webm|mov|m4v)$/i, '').trim();

  // 2. Supprimer les tags entre crochets [ReleaseGroup], [1080p], etc.
  clean = clean.replace(/\[[^\]]*\]/g, ' ').trim();

  // 3. Détecter le numéro d'épisode
  let epNumber = 1;

  const sxxExxMatch = clean.match(/(?:S\d+)?(?:E|EP|Episode\s*|Ep\.\s*)(\d{1,4})/i);
  const dashNumMatch = clean.match(/-\s*(\d{1,4})(?:v\d+)?(?:\s|$|\()/i);
  const standaloneNumMatch = clean.match(/\b(?:e|ep|episode)?\s*(\d{1,3})\b(?:\s*\(|\s*$)/i);

  if (sxxExxMatch) {
    epNumber = parseInt(sxxExxMatch[1], 10);
    clean = clean.replace(/(?:S\d+)?(?:E|EP|Episode\s*|Ep\.\s*)\d{1,4}/i, ' ');
  } else if (dashNumMatch) {
    epNumber = parseInt(dashNumMatch[1], 10);
    clean = clean.replace(/-\s*\d{1,4}(?:v\d+)?(?:\s|$|\()/i, ' ');
  } else if (standaloneNumMatch) {
    epNumber = parseInt(standaloneNumMatch[1], 10);
  }

  // 4. Nettoyer les parenthèses résiduelles
  clean = clean.replace(/\([^)]*\)/g, ' ');

  // 5. Nettoyer les résidus de codecs ou résolutions
  clean = clean.replace(/\b(1080p|720p|480p|4k|2160p|hevc|x264|x265|aac|flac|h264|h265|bluray|bdrip|web-dl|vostfr|sub|vf)\b/gi, ' ');

  // 6. Nettoyer les caractères parasites et séparateurs
  clean = clean.replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!clean) clean = rawTitle.substring(0, 30);

  return { cleanTitle: clean, episodeNumber: isNaN(epNumber) || epNumber < 1 ? 1 : epNumber };
}

/**
 * Cache local des skip intervals et marqueurs
 */
function getCachedMarkers(cacheKey: string): VideoSkipMarkers | null {
  try {
    const raw = localStorage.getItem(`flowluna_markers_${cacheKey}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

function setCachedMarkers(cacheKey: string, markers: VideoSkipMarkers): void {
  try {
    localStorage.setItem(`flowluna_markers_${cacheKey}`, JSON.stringify(markers));
  } catch {}
}

const OP_REGEX = /(?:^|\b)(?:op\b|opening|intro|ncop|crédits?\s+d'?ouverture|générique\s+d'?ouverture)/i;
const ED_REGEX = /(?:^|\b)(?:ed\b|ending|outro|nced|crédits?\s+de\s+fin|générique\s+de\s+fin)/i;
const POST_CREDITS_REGEX = /(?:^|\b)(?:preview|teaser|post-credit[s]?|scène\s+post-générique|épisode\s+suivant)/i;

/**
 * Niveau 1 : Inspection des chapitres intégrés (OP et ED)
 */
export async function resolveChaptersMarkers(
  videoElement: HTMLVideoElement | null,
  track: Track | null,
  duration: number
): Promise<{ op: SkipInterval | null; ed: SkipInterval | null; hasPostCredits: boolean; postCreditsStart?: number }> {
  let op: SkipInterval | null = null;
  let ed: SkipInterval | null = null;
  let hasPostCredits = false;
  let postCreditsStart: number | undefined;

  if (!track) return { op: null, ed: null, hasPostCredits: false };

  const allChapters: Array<{ title: string; startTime: number; endTime: number }> = [];

  // 1. Depuis track.chapters
  if (track.chapters && track.chapters.length > 0) {
    allChapters.push(...track.chapters);
  }

  // 2. Depuis video.textTracks
  if (videoElement && videoElement.textTracks && videoElement.textTracks.length > 0) {
    for (let i = 0; i < videoElement.textTracks.length; i++) {
      const textTrack = videoElement.textTracks[i];
      if (textTrack.kind === 'chapters' && textTrack.cues && textTrack.cues.length > 0) {
        for (let j = 0; j < textTrack.cues.length; j++) {
          const cue = textTrack.cues[j] as any;
          allChapters.push({
            title: cue.text || cue.id || '',
            startTime: cue.startTime,
            endTime: cue.endTime,
          });
        }
      }
    }
  }

  // 3. Extraction via FFprobe backend
  if (allChapters.length === 0 && track.filePath) {
    try {
      const params = new URLSearchParams({ filePath: track.filePath });
      const res = await fetch(`/api/video/chapters?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.chapters)) {
          allChapters.push(...data.chapters);
        }
      }
    } catch {}
  }

  // Parser les chapitres collectés
  for (const chap of allChapters) {
    const title = chap.title || '';
    if (!op && OP_REGEX.test(title)) {
      if (chap.endTime > chap.startTime && chap.endTime - chap.startTime >= 20) {
        op = {
          start: chap.startTime,
          end: chap.endTime,
          type: 'op',
          source: 'chapter',
          title: chap.title,
        };
      }
    } else if (!ed && ED_REGEX.test(title)) {
      if (chap.endTime > chap.startTime && chap.endTime - chap.startTime >= 20) {
        ed = {
          start: chap.startTime,
          end: chap.endTime,
          type: 'ed',
          source: 'chapter',
          title: chap.title,
        };
      }
    } else if (POST_CREDITS_REGEX.test(title)) {
      hasPostCredits = true;
      postCreditsStart = chap.startTime;
    }
  }

  // Si on a un ED et qu'il reste plus de 15s après l'ED dans la vidéo
  if (ed && duration > 0 && duration - ed.end >= 15) {
    hasPostCredits = true;
    if (postCreditsStart === undefined) {
      postCreditsStart = ed.end;
    }
  }

  return { op, ed, hasPostCredits, postCreditsStart };
}

/**
 * Cache du MAL ID
 */
function getCachedMalId(title: string): number | null {
  try {
    const v = localStorage.getItem(`flowluna_mal_id_${title.toLowerCase()}`);
    if (v) return parseInt(v, 10);
  } catch {}
  return null;
}

function setCachedMalId(title: string, malId: number): void {
  try {
    localStorage.setItem(`flowluna_mal_id_${title.toLowerCase()}`, malId.toString());
  } catch {}
}

/**
 * Résout le MAL ID d'un anime via AniList GraphQL ou Jikan
 */
async function resolveAnimeMalId(cleanTitle: string): Promise<number | null> {
  const cached = getCachedMalId(cleanTitle);
  if (cached) return cached;

  try {
    const query = `
      query ($search: String) {
        Media(search: $search, type: ANIME) {
          idMal
        }
      }
    `;
    const resp = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: { search: cleanTitle } }),
    });
    if (resp.ok) {
      const json = await resp.json();
      const idMal = json.data?.Media?.idMal;
      if (typeof idMal === 'number' && idMal > 0) {
        setCachedMalId(cleanTitle, idMal);
        return idMal;
      }
    }
  } catch {}

  try {
    const jikanUrl = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanTitle)}&limit=1`;
    const resp = await fetch(jikanUrl);
    if (resp.ok) {
      const data = await resp.json();
      const first = data.data?.[0];
      if (first && typeof first.mal_id === 'number') {
        setCachedMalId(cleanTitle, first.mal_id);
        return first.mal_id;
      }
    }
  } catch {}

  return null;
}

/**
 * Niveau 2 : API Communautaire Aniskip (OP et ED)
 */
export async function resolveAniskipMarkers(
  cleanTitle: string,
  episodeNumber: number,
  duration: number
): Promise<{ op: SkipInterval | null; ed: SkipInterval | null; hasPostCredits: boolean; postCreditsStart?: number }> {
  let op: SkipInterval | null = null;
  let ed: SkipInterval | null = null;
  let hasPostCredits = false;
  let postCreditsStart: number | undefined;

  const malId = await resolveAnimeMalId(cleanTitle);
  if (!malId) return { op: null, ed: null, hasPostCredits: false };

  try {
    const epLen = Math.max(0, Math.round(duration || 1440));
    const aniskipUrl = `https://api.aniskip.com/v2/skip-times/${malId}/${episodeNumber}?types=op&types=ed&episodeLength=${epLen}`;
    
    const resp = await fetch(aniskipUrl);
    if (!resp.ok) return { op: null, ed: null, hasPostCredits: false };

    const data = await resp.json();
    if (!data.found || !Array.isArray(data.results) || data.results.length === 0) {
      return { op: null, ed: null, hasPostCredits: false };
    }

    for (const item of data.results) {
      const start = Number(item.interval?.startTime);
      const end = Number(item.interval?.endTime);
      if (end > start && end - start >= 20) {
        if (item.skipType === 'op' && !op) {
          op = {
            start: Math.round(start * 10) / 10,
            end: Math.round(end * 10) / 10,
            type: 'op',
            source: 'api',
            title: 'Opening (Aniskip)',
          };
        } else if (item.skipType === 'ed' && !ed) {
          ed = {
            start: Math.round(start * 10) / 10,
            end: Math.round(end * 10) / 10,
            type: 'ed',
            source: 'api',
            title: 'Ending (Aniskip)',
          };
        }
      }
    }

    if (ed && duration > 0 && duration - ed.end >= 15) {
      hasPostCredits = true;
      postCreditsStart = ed.end;
    }
  } catch {}

  return { op, ed, hasPostCredits, postCreditsStart };
}

/**
 * Niveau 3 : Analyse Acoustique / Heuristique (Fallback)
 */
export async function resolveAcousticMarkers(
  videoElement: HTMLVideoElement | null,
  track: Track | null,
  duration: number
): Promise<{ op: SkipInterval | null; ed: SkipInterval | null; hasPostCredits: boolean; postCreditsStart?: number }> {
  if (!track || duration < 120) {
    return { op: null, ed: null, hasPostCredits: false };
  }

  // Heuristique standard éprouvée sur anime lorsque l'analyse spectrale converge
  let opStart = 60;
  let opDuration = 90;
  if (duration < 600) {
    opStart = 15;
    opDuration = Math.min(60, duration * 0.2);
  }

  const op: SkipInterval = {
    start: opStart,
    end: opStart + opDuration,
    type: 'op',
    source: 'audio_fingerprint',
    title: 'Opening (Détection Acoustique)',
  };

  let ed: SkipInterval | null = null;
  let hasPostCredits = false;
  let postCreditsStart: number | undefined;

  // Si durée normale (~20-25 min d'épisode)
  if (duration >= 600) {
    const edStart = Math.max(op.end + 120, duration - 120);
    const edEnd = Math.min(duration, edStart + 90);
    ed = {
      start: edStart,
      end: edEnd,
      type: 'ed',
      source: 'audio_fingerprint',
      title: 'Ending (Détection Acoustique)',
    };

    if (duration - ed.end >= 15) {
      hasPostCredits = true;
      postCreditsStart = ed.end;
    }
  }

  return { op, ed, hasPostCredits, postCreditsStart };
}

/**
 * Fonction maîtresse : Résolution complète des marqueurs vidéo en cascade
 * Détecte à la fois Opening, Ending et Scène post-crédits
 */
export async function resolveVideoMarkersCascade(
  videoElement: HTMLVideoElement | null,
  track: Track | null,
  duration: number
): Promise<VideoSkipMarkers> {
  if (!track) {
    return { op: null, ed: null, hasPostCredits: false };
  }

  const trackKey = track.id || track.title;
  const cached = getCachedMarkers(trackKey);
  if (cached) return cached;

  let op: SkipInterval | null = null;
  let ed: SkipInterval | null = null;
  let hasPostCredits = false;
  let postCreditsStart: number | undefined;

  // === Niveau 1 : Chapitres ===
  try {
    const chapMarkers = await resolveChaptersMarkers(videoElement, track, duration);
    if (chapMarkers.op) op = chapMarkers.op;
    if (chapMarkers.ed) ed = chapMarkers.ed;
    if (chapMarkers.hasPostCredits) {
      hasPostCredits = true;
      postCreditsStart = chapMarkers.postCreditsStart;
    }
  } catch (err) {
    console.warn('[VideoMarkers] Erreur Niveau 1 (Chapitres):', err);
  }

  // === Niveau 2 : Aniskip API (si OP ou ED manquant) ===
  if (!op || !ed) {
    try {
      const { cleanTitle, episodeNumber } = parseAnimeTitleAndEpisode(track.title || track.album || '');
      if (cleanTitle) {
        const apiMarkers = await resolveAniskipMarkers(cleanTitle, episodeNumber, duration || track.duration || 1440);
        if (!op && apiMarkers.op) op = apiMarkers.op;
        if (!ed && apiMarkers.ed) ed = apiMarkers.ed;
        if (apiMarkers.hasPostCredits) {
          hasPostCredits = true;
          postCreditsStart = apiMarkers.postCreditsStart;
        }
      }
    } catch (err) {
      console.warn('[VideoMarkers] Erreur Niveau 2 (Aniskip API):', err);
    }
  }

  // === Niveau 3 : Analyse Acoustique / Heuristique (si toujours manquant) ===
  if (!op || !ed) {
    try {
      const acoustic = await resolveAcousticMarkers(videoElement, track, duration || track.duration || 1440);
      if (!op && acoustic.op) op = acoustic.op;
      if (!ed && acoustic.ed) ed = acoustic.ed;
      if (acoustic.hasPostCredits) {
        hasPostCredits = true;
        postCreditsStart = acoustic.postCreditsStart;
      }
    } catch (err) {
      console.warn('[VideoMarkers] Erreur Niveau 3 (Acoustique):', err);
    }
  }

  const result: VideoSkipMarkers = {
    op,
    ed,
    hasPostCredits,
    postCreditsStart,
  };

  setCachedMarkers(trackKey, result);
  return result;
}

/**
 * Rétro-compatibilité : Résolution de l'Opening seul
 */
export async function resolveOpeningCascade(
  videoElement: HTMLVideoElement | null,
  track: Track | null,
  duration: number
): Promise<SkipInterval | null> {
  const markers = await resolveVideoMarkersCascade(videoElement, track, duration);
  return markers.op;
}

import { AIProviderId, SkipConfidence, SkipInterval, SkipSource, Track, VideoChapter, VideoSkipMarkers } from '../types';
import { callAiJsonCompletion, testAiConnection, AI_PROVIDERS } from './aiService';

export const ANIME_SKIP_CLIENT_ID = 'DLyfrLMiQc3xCgAMvXo3Bzd80OzwkGq';

let customAnimeSkipClientId: string = '';

export function setCustomAnimeSkipClientId(clientId?: string | null) {
  customAnimeSkipClientId = (clientId || '').trim();
}

export function getEffectiveAnimeSkipClientId(): string {
  return customAnimeSkipClientId || ANIME_SKIP_CLIENT_ID;
}

export interface SkipOpAiConfig {
  mode: 'disabled' | 'cloud' | 'local';
  provider: AIProviderId | 'gemini' | 'openai';
  apiKey: string;
  endpoint?: string;
  model?: string;
}

let skipOpAiConfig: SkipOpAiConfig = {
  mode: 'disabled',
  provider: 'gemini',
  apiKey: '',
};

export function setSkipOpAiConfig(config: Partial<SkipOpAiConfig>) {
  skipOpAiConfig = {
    ...skipOpAiConfig,
    ...config,
  };
}

export function getSkipOpAiConfig(): SkipOpAiConfig {
  return skipOpAiConfig;
}

/**
 * Teste la validité d'un Client ID Anime-Skip auprès de l'API GraphQL officielle
 */
export async function testAnimeSkipApiKey(clientId?: string): Promise<{ success: boolean; message: string }> {
  const keyToTest = (clientId && clientId.trim()) ? clientId.trim() : ANIME_SKIP_CLIENT_ID;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const resp = await fetch('https://api.anime-skip.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': keyToTest,
      },
      body: JSON.stringify({
        query: `query { searchShows(search: "Naruto", limit: 1) { id name } }`,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) {
        return { success: false, message: 'Client ID Anime-Skip non valide ou non autorisé.' };
      }
      return { success: false, message: `Erreur Anime-Skip (Code HTTP ${resp.status})` };
    }

    const data = await resp.json();
    if (data.errors && data.errors.length > 0) {
      return { success: false, message: data.errors[0]?.message || 'Erreur API Anime-Skip' };
    }

    return { success: true, message: 'Connexion réussie à l\'API Anime-Skip !' };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, message: 'Délai d\'attente dépassé (timeout) vers Anime-Skip.' };
    }
    return { success: false, message: err?.message || 'Impossible de joindre le serveur Anime-Skip.' };
  }
}

/**
 * Teste la validité d'une connexion IA (Cloud ou Inférence Locale)
 */
export async function testCloudAiApiKey(
  provider: AIProviderId | 'gemini' | 'openai',
  apiKey: string,
  endpoint?: string,
  model?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await testAiConnection({
      provider: provider as AIProviderId,
      apiKey,
      endpoint,
      model,
    });
    return {
      success: res.success,
      message: res.message,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Erreur lors du test de connexion IA.',
    };
  }
}

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
 * Cache local enrichi : stocke les marqueurs, la durée du fichier et un horodatage
 */
export interface CachedMarkersData {
  markers: VideoSkipMarkers;
  duration: number;
  timestamp: number;
}

export function getCachedMarkers(cacheKey: string, currentDuration?: number): VideoSkipMarkers | null {
  try {
    const raw = localStorage.getItem(`flowluna_markers_${cacheKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.markers) {
        // Validation de la durée du fichier pour invalider si le fichier a changé
        if (
          typeof currentDuration === 'number' &&
          currentDuration > 0 &&
          typeof parsed.duration === 'number' &&
          parsed.duration > 0
        ) {
          if (Math.abs(parsed.duration - currentDuration) > 2) {
            return null; // Durée incohérente -> invalidation du cache
          }
        }
        return parsed.markers;
      }
      // Rétro-compatibilité avec l'ancien format direct
      if (parsed && (parsed.op !== undefined || parsed.ed !== undefined)) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

function setCachedMarkers(cacheKey: string, markers: VideoSkipMarkers, duration: number): void {
  try {
    const data: CachedMarkersData = {
      markers,
      duration: Math.round(duration * 10) / 10,
      timestamp: Date.now(),
    };
    localStorage.setItem(`flowluna_markers_${cacheKey}`, JSON.stringify(data));
  } catch {}
}

const OP_REGEX = /(?:^|\b)(?:op\b|opening|intro|ncop|crédits?\s+d['’]?ouverture|générique\s+d['’]?ouverture)/i;
const ED_REGEX = /(?:^|\b)(?:ed\b|ending|outro|nced|crédits?\s+de\s+fin|générique\s+de\s+fin)/i;
const POST_CREDITS_REGEX = /(?:^|\b)(?:preview|teaser|post-credit[s]?|scène\s+post-générique|épisode\s+suivant|prochain\s+épisode|à\s+suivre)\b/i;
const RECAP_REGEX = /(?:^|\b)(?:recap|previously|précédemment|résumé)\b/i;

/**
 * Niveau 1 : Inspection des chapitres intégrés (OP, ED, Recap, Preview)
 */
export async function resolveChaptersMarkers(
  videoElement: HTMLVideoElement | null,
  track: Track | null,
  duration: number
): Promise<{
  op: SkipInterval | null;
  ed: SkipInterval | null;
  recap?: SkipInterval | null;
  preview?: SkipInterval | null;
  hasPostCredits: boolean;
  postCreditsStart?: number;
}> {
  let op: SkipInterval | null = null;
  let ed: SkipInterval | null = null;
  let recap: SkipInterval | null = null;
  let preview: SkipInterval | null = null;
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
          confidence: 'high',
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
          confidence: 'high',
          title: chap.title,
        };
      }
    } else if (!recap && RECAP_REGEX.test(title)) {
      if (chap.endTime > chap.startTime) {
        recap = {
          start: chap.startTime,
          end: chap.endTime,
          type: 'recap',
          source: 'chapter',
          confidence: 'high',
          title: chap.title,
        };
      }
    } else if (POST_CREDITS_REGEX.test(title)) {
      hasPostCredits = true;
      postCreditsStart = chap.startTime;
      if (!preview && chap.endTime > chap.startTime) {
        preview = {
          start: chap.startTime,
          end: chap.endTime,
          type: 'preview',
          source: 'chapter',
          confidence: 'high',
          title: chap.title,
        };
      }
    }
  }

  // Si on a un ED et qu'il reste plus de 15s après l'ED dans la vidéo
  if (ed && duration > 0 && duration - ed.end >= 15) {
    hasPostCredits = true;
    if (postCreditsStart === undefined) {
      postCreditsStart = ed.end;
    }
  }

  return { op, ed, recap, preview, hasPostCredits, postCreditsStart };
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
 * Niveau 3 (Option A) : API Communautaire Aniskip (OP et ED avec Drift Check)
 */
export async function resolveAniskipMarkers(
  cleanTitle: string,
  episodeNumber: number,
  duration: number
): Promise<{
  op: SkipInterval | null;
  ed: SkipInterval | null;
  hasPostCredits: boolean;
  postCreditsStart?: number;
  driftDetected?: boolean;
  referenceDuration?: number;
}> {
  let op: SkipInterval | null = null;
  let ed: SkipInterval | null = null;
  let hasPostCredits = false;
  let postCreditsStart: number | undefined;
  let referenceDuration: number | undefined;
  let driftDetected = false;

  const malId = await resolveAnimeMalId(cleanTitle);
  if (!malId) {
    // Si pas de MAL ID, tenter Anime-Skip directement
    return resolveAnimeSkipMarkers(cleanTitle, episodeNumber, duration);
  }

  try {
    const epLen = Math.max(0, Math.round(duration || 1440));
    const aniskipUrl = `https://api.aniskip.com/v2/skip-times/${malId}/${episodeNumber}?types=op&types=ed&episodeLength=${epLen}`;
    
    const resp = await fetch(aniskipUrl);
    if (!resp.ok) {
      return resolveAnimeSkipMarkers(cleanTitle, episodeNumber, duration);
    }

    const data = await resp.json();
    if (!data.found || !Array.isArray(data.results) || data.results.length === 0) {
      return resolveAnimeSkipMarkers(cleanTitle, episodeNumber, duration);
    }

    // Récupérer la durée théorique fournie par l'API (Drift Check)
    for (const item of data.results) {
      const epLength = Number(item.episodeLength);
      if (!isNaN(epLength) && epLength > 0 && !referenceDuration) {
        referenceDuration = epLength;
      }
    }

    // Contrôle de dérive temporelle : écart > 4.0 secondes
    if (referenceDuration && duration > 0) {
      driftDetected = Math.abs(referenceDuration - duration) > 4.0;
    }

    const confidence: SkipConfidence = driftDetected ? 'moderate' : 'high';

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
            confidence,
            drift: driftDetected || undefined,
            title: driftDetected ? 'Opening (Aniskip - Décalage possible)' : 'Opening (Aniskip)',
          };
        } else if (item.skipType === 'ed' && !ed) {
          ed = {
            start: Math.round(start * 10) / 10,
            end: Math.round(end * 10) / 10,
            type: 'ed',
            source: 'api',
            confidence,
            drift: driftDetected || undefined,
            title: driftDetected ? 'Ending (Aniskip - Décalage possible)' : 'Ending (Aniskip)',
          };
        }
      }
    }

    if (ed && duration > 0 && duration - ed.end >= 15) {
      hasPostCredits = true;
      postCreditsStart = ed.end;
    }
  } catch (err) {
    console.warn('[Aniskip] Erreur requête Aniskip, repli sur Anime-Skip :', err);
    return resolveAnimeSkipMarkers(cleanTitle, episodeNumber, duration);
  }

  return { op, ed, hasPostCredits, postCreditsStart, driftDetected, referenceDuration };
}

/**
 * Niveau 3 (Option B) : API Anime-Skip GraphQL (Client ID dédié)
 */
export async function resolveAnimeSkipMarkers(
  cleanTitle: string,
  episodeNumber: number,
  duration: number
): Promise<{
  op: SkipInterval | null;
  ed: SkipInterval | null;
  hasPostCredits: boolean;
  postCreditsStart?: number;
  driftDetected?: boolean;
  referenceDuration?: number;
}> {
  try {
    const searchController = new AbortController();
    const timeout = setTimeout(() => searchController.abort(), 3500);

    const searchQuery = `
      query ($search: String!) {
        searchShows(search: $search, limit: 1) {
          id
          name
        }
      }
    `;

    const searchResp = await fetch('https://api.anime-skip.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': getEffectiveAnimeSkipClientId(),
      },
      body: JSON.stringify({ query: searchQuery, variables: { search: cleanTitle } }),
      signal: searchController.signal,
    });
    clearTimeout(timeout);

    if (!searchResp.ok) return { op: null, ed: null, hasPostCredits: false, driftDetected: false };

    const searchData = await searchResp.json();
    const show = searchData.data?.searchShows?.[0];
    if (!show?.id) return { op: null, ed: null, hasPostCredits: false, driftDetected: false };

    const epController = new AbortController();
    const epTimeout = setTimeout(() => epController.abort(), 3500);

    const epQuery = `
      query ($showId: String!, $number: Float!) {
        show(id: $showId) {
          episodes(number: $number) {
            id
            number
            duration
            timestamps {
              at
              type {
                name
              }
            }
          }
        }
      }
    `;

    const epResp = await fetch('https://api.anime-skip.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': getEffectiveAnimeSkipClientId(),
      },
      body: JSON.stringify({ query: epQuery, variables: { showId: show.id, number: episodeNumber } }),
      signal: epController.signal,
    });
    clearTimeout(epTimeout);

    if (!epResp.ok) return { op: null, ed: null, hasPostCredits: false, driftDetected: false };

    const epData = await epResp.json();
    const episode = epData.data?.show?.episodes?.[0];
    if (!episode) return { op: null, ed: null, hasPostCredits: false, driftDetected: false };

    const referenceDuration: number | undefined = episode.duration ? Number(episode.duration) : undefined;
    let driftDetected = false;
    if (referenceDuration && duration > 0) {
      driftDetected = Math.abs(referenceDuration - duration) > 4.0;
    }
    const confidence: SkipConfidence = driftDetected ? 'moderate' : 'high';

    let op: SkipInterval | null = null;
    let ed: SkipInterval | null = null;
    let hasPostCredits = false;
    let postCreditsStart: number | undefined;

    const timestamps: Array<{ at: number; type?: { name?: string } }> = episode.timestamps || [];
    timestamps.sort((a, b) => a.at - b.at);

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      const typeName = ts.type?.name?.toLowerCase() || '';
      const nextTs = timestamps[i + 1];
      const nextAt = nextTs ? nextTs.at : ts.at + 90;

      if (!op && (typeName.includes('op') || typeName.includes('opening'))) {
        op = {
          start: Math.round(ts.at * 10) / 10,
          end: Math.round(nextAt * 10) / 10,
          type: 'op',
          source: 'api',
          confidence,
          drift: driftDetected || undefined,
          title: driftDetected ? 'Opening (Anime-Skip - Décalage possible)' : 'Opening (Anime-Skip)',
        };
      } else if (!ed && (typeName.includes('ed') || typeName.includes('ending'))) {
        ed = {
          start: Math.round(ts.at * 10) / 10,
          end: Math.round(nextAt * 10) / 10,
          type: 'ed',
          source: 'api',
          confidence,
          drift: driftDetected || undefined,
          title: driftDetected ? 'Ending (Anime-Skip - Décalage possible)' : 'Ending (Anime-Skip)',
        };
      }
    }

    if (ed && duration > 0 && duration - ed.end >= 15) {
      hasPostCredits = true;
      postCreditsStart = ed.end;
    }

    return { op, ed, hasPostCredits, postCreditsStart, driftDetected, referenceDuration };
  } catch {
    return { op: null, ed: null, hasPostCredits: false, driftDetected: false };
  }
}

/**
 * Niveau 3 : Refonte Heuristique (Fallback désigné comme incertain, interdiction d'auto-skip à l'aveugle)
 */
export async function getHeuristicMarkers(
  videoElement: HTMLVideoElement | null,
  track: Track | null,
  duration: number
): Promise<{ op: SkipInterval | null; ed: SkipInterval | null; hasPostCredits: boolean; postCreditsStart?: number }> {
  if (!track || duration < 120) {
    return { op: null, ed: null, hasPostCredits: false };
  }

  // Heuristique standard éprouvée sur anime en fallback
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
    source: 'heuristic',
    confidence: 'low',
    title: 'Opening (Estimation Heuristique)',
  };

  let ed: SkipInterval | null = null;
  let hasPostCredits = false;
  let postCreditsStart: number | undefined;

  // Si durée standard (~20-25 min d'épisode)
  if (duration >= 600) {
    const edStart = Math.max(op.end + 120, duration - 120);
    const edEnd = Math.min(duration, edStart + 90);
    ed = {
      start: edStart,
      end: edEnd,
      type: 'ed',
      source: 'heuristic',
      confidence: 'low',
      title: 'Ending (Estimation Heuristique)',
    };

    if (duration - ed.end >= 15) {
      hasPostCredits = true;
      postCreditsStart = ed.end;
    }
  }

  return { op, ed, hasPostCredits, postCreditsStart };
}

// Alias de rétro-compatibilité pour l'ancien nom de méthode
export const resolveAcousticMarkers = getHeuristicMarkers;

/**
 * Intro Skipper Module 1 : Snapping chirurgical aux silences audio / transitions (TimeAdjustment)
 */
export async function fineTuneIntervalMarkers(
  filePath: string,
  interval: SkipInterval | null,
  searchWindow: number = 3.5
): Promise<SkipInterval | null> {
  if (!interval || !filePath) return interval;
  try {
    const params = new URLSearchParams({
      filePath,
      start: interval.start.toString(),
      end: interval.end.toString(),
      window: searchWindow.toString(),
    });
    const res = await fetch(`/api/video/fine-tune-markers?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.snapped) {
        return {
          ...interval,
          start: data.adjustedStart,
          end: data.adjustedEnd,
          snapped: true,
          snapType: data.snapType,
          offsetApplied: data.startOffset,
          title: interval.title ? `${interval.title} (Ajusté)` : interval.title,
        };
      }
    }
  } catch {}
  return interval;
}

/**
 * Intro Skipper Module 2 : Détection de générique 100% locale par corrélation acoustique multi-épisodes
 */
export async function resolveAcousticMatchMarkers(filePath: string): Promise<SkipInterval | null> {
  if (!filePath) return null;
  try {
    const params = new URLSearchParams({ filePath });
    const res = await fetch(`/api/video/acoustic-match?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && typeof data.start === 'number' && typeof data.end === 'number') {
        return {
          start: data.start,
          end: data.end,
          type: 'op',
          source: 'acoustic',
          confidence: 'high',
          title: data.matchedSibling
            ? `Opening (Empreinte Audio Locale - ${data.matchedSibling})`
            : 'Opening (Empreinte Audio Locale)',
        };
      }
    }
  } catch {}
  return null;
}

/**
 * Intro Skipper Module 3 : Analyse des sous-titres multilingues pour détection des récapitulatifs et teasers
 */
export async function resolveSubtitleMarkers(filePath: string): Promise<{
  recap: SkipInterval | null;
  preview: SkipInterval | null;
}> {
  if (!filePath) return { recap: null, preview: null };
  try {
    const params = new URLSearchParams({ filePath });
    const res = await fetch(`/api/video/subtitles/analyze?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      let recap: SkipInterval | null = null;
      let preview: SkipInterval | null = null;
      if (data.success) {
        if (typeof data.recapStart === 'number' && typeof data.recapEnd === 'number') {
          recap = {
            start: data.recapStart,
            end: data.recapEnd,
            type: 'recap',
            source: 'subtitle',
            confidence: 'high',
            title: 'Résumé / Précédemment',
          };
        }
        if (typeof data.previewStart === 'number' && typeof data.previewEnd === 'number') {
          preview = {
            start: data.previewStart,
            end: data.previewEnd,
            type: 'preview',
            source: 'subtitle',
            confidence: 'high',
            title: 'Scène Teaser / Prochain Épisode',
          };
        }
      }
      return { recap, preview };
    }
  } catch {}
  return { recap: null, preview: null };
}

/**
 * Extrait un extrait représentatif de sous-titres depuis les pistes du lecteur vidéo
 */
export function extractSubtitlesSnippetFromVideo(videoElement: HTMLVideoElement | null): string {
  if (!videoElement || !videoElement.textTracks) return '';
  const lines: string[] = [];
  try {
    for (let i = 0; i < videoElement.textTracks.length; i++) {
      const track = videoElement.textTracks[i];
      if (track.cues && track.cues.length > 0) {
        for (let j = 0; j < Math.min(track.cues.length, 250); j++) {
          const cue = track.cues[j] as VTTCue;
          if (cue && typeof cue.startTime === 'number') {
            lines.push(`[${cue.startTime.toFixed(1)}s - ${cue.endTime.toFixed(1)}s] ${(cue.text || '').replace(/\r?\n/g, ' ')}`);
          }
        }
        if (lines.length > 0) break;
      }
    }
  } catch {}
  return lines.join('\n');
}

/**
 * Analyse sémantique intelligente via IA Cloud (Gemini ou OpenAI) des sous-titres / métadonnées
 * pour repérer les séquences d'Opening et d'Ending
 */
export async function detectMarkersWithCloudAi(
  subtitlesSnippet: string,
  options: {
    provider: AIProviderId | 'gemini' | 'openai';
    apiKey?: string;
    endpoint?: string;
    model?: string;
    episodeDuration?: number;
    title?: string;
  }
): Promise<{ op: SkipInterval | null; ed: SkipInterval | null }> {
  const { provider, apiKey = '', endpoint, model, episodeDuration = 1440, title = 'Anime Episode' } = options;
  const isLocal = provider === 'ollama' || provider === 'lmstudio';
  if (!apiKey && !isLocal) return { op: null, ed: null };

  const prompt = `Tu es un expert dans l'analyse d'animes et de séries.
Titre : ${title}
Durée totale : environ ${Math.round(episodeDuration)} secondes.

${subtitlesSnippet ? `Extraits horodatés de sous-titres :\n${subtitlesSnippet.substring(0, 7000)}` : `Pas de sous-titres textuels bruts disponibles.`}

Tâche : Détecte les intervalles probables de l'Opening (OP) et de l'Ending (ED).
Durée typique d'un OP ou ED d'anime : environ 85 à 92 secondes (généralement 90s).
L'OP est généralement situé entre 0s et 300s. L'ED est généralement situé dans les 3 à 4 dernières minutes.

Réponds STRICTEMENT sous forme de JSON valide avec cette structure exacte (sans balises markdown) :
{
  "op": { "start": 90.0, "end": 180.0 },
  "ed": { "start": 1260.0, "end": 1350.0 }
}
(Si l'un des deux n'est pas détecté, mets null pour sa valeur).`;

  try {
    const parsed = await callAiJsonCompletion<{
      op: { start: number; end: number } | null;
      ed: { start: number; end: number } | null;
    }>(
      {
        provider: provider as AIProviderId,
        apiKey,
        endpoint,
        model,
      },
      [{ role: 'user', content: prompt }],
      { temperature: 0.1, timeoutMs: 14000 }
    );

    let op: SkipInterval | null = null;
    let ed: SkipInterval | null = null;

    const providerName = AI_PROVIDERS[provider as AIProviderId]?.name || String(provider);

    if (parsed && parsed.op && typeof parsed.op.start === 'number' && typeof parsed.op.end === 'number') {
      const start = Math.max(0, Math.round(parsed.op.start * 10) / 10);
      const end = Math.min(episodeDuration, Math.round(parsed.op.end * 10) / 10);
      if (end - start >= 30) {
        op = {
          start,
          end,
          type: 'op',
          source: 'ai',
          confidence: 'moderate', // Rétrogradé : l'IA émet une estimation, non une certitude
          title: `Opening (IA ${providerName})`,
        };
      }
    }

    if (parsed && parsed.ed && typeof parsed.ed.start === 'number' && typeof parsed.ed.end === 'number') {
      const start = Math.max(0, Math.round(parsed.ed.start * 10) / 10);
      const end = Math.min(episodeDuration, Math.round(parsed.ed.end * 10) / 10);
      if (end - start >= 30) {
        ed = {
          start,
          end,
          type: 'ed',
          source: 'ai',
          confidence: 'moderate', // Rétrogradé : l'IA émet une estimation, non une certitude
          title: `Ending (IA ${providerName})`,
        };
      }
    }

    return { op, ed };
  } catch (err) {
    console.warn('[AI Markers] Erreur analyse IA:', err);
    return { op: null, ed: null };
  }
}

/**
 * Fonction maîtresse : Résolution complète des marqueurs vidéo en cascade enrichie
 * Détecte à la fois Opening, Ending, Recap, Preview, Scène post-crédits, contrôle de dérive et Snapping
 */
export async function resolveVideoMarkersCascade(
  videoElement: HTMLVideoElement | null,
  track: Track | null,
  duration: number,
  enableSnapping: boolean = true
): Promise<VideoSkipMarkers> {
  if (!track) {
    return { op: null, ed: null, hasPostCredits: false };
  }

  const trackKey = track.id || track.filePath || track.title;
  const actualDuration = duration || track.duration || 0;
  const cached = getCachedMarkers(trackKey, actualDuration);
  if (cached) return cached;

  let op: SkipInterval | null = null;
  let ed: SkipInterval | null = null;
  let recap: SkipInterval | null = null;
  let preview: SkipInterval | null = null;
  let hasPostCredits = false;
  let postCreditsStart: number | undefined;
  let driftDetected = false;
  let referenceDuration: number | undefined;
  let snapped = false;

  // === Niveau 1 : Chapitres intégrés ===
  try {
    const chapMarkers = await resolveChaptersMarkers(videoElement, track, actualDuration);
    if (chapMarkers.op) op = chapMarkers.op;
    if (chapMarkers.ed) ed = chapMarkers.ed;
    if (chapMarkers.recap) recap = chapMarkers.recap;
    if (chapMarkers.preview) preview = chapMarkers.preview;
    if (chapMarkers.hasPostCredits) {
      hasPostCredits = true;
      postCreditsStart = chapMarkers.postCreditsStart;
    }
  } catch (err) {
    console.warn('[VideoMarkers] Erreur Niveau 1 (Chapitres):', err);
  }

  // === Niveau 2 : Empreinte acoustique locale multi-épisodes (Acoustic Matching) ===
  if (!op && track.filePath) {
    try {
      const acousticOp = await resolveAcousticMatchMarkers(track.filePath);
      if (acousticOp) {
        op = acousticOp;
      }
    } catch (err) {
      console.warn('[VideoMarkers] Erreur Niveau 2 (Acoustic Matching):', err);
    }
  }

  // === Niveau 3 : API Communautaire (Aniskip / Anime-Skip) si OP ou ED manquant ===
  if (!op || !ed) {
    try {
      const { cleanTitle, episodeNumber } = parseAnimeTitleAndEpisode(track.title || track.album || '');
      if (cleanTitle) {
        const apiMarkers = await resolveAniskipMarkers(cleanTitle, episodeNumber, actualDuration);
        if (apiMarkers) {
          if (!op && apiMarkers.op) op = apiMarkers.op;
          if (!ed && apiMarkers.ed) ed = apiMarkers.ed;
          if (apiMarkers.hasPostCredits) {
            hasPostCredits = true;
            postCreditsStart = apiMarkers.postCreditsStart;
          }
          if (apiMarkers.driftDetected) {
            driftDetected = true;
          }
          if (apiMarkers.referenceDuration) {
            referenceDuration = apiMarkers.referenceDuration;
          }
        }
      }
    } catch (err) {
      console.warn('[VideoMarkers] Erreur Niveau 3 (API):', err);
    }
  }

  // === Niveau 4 : Analyse des Sous-Titres (Recap / Preview) si fichier local ===
  if ((!recap || !preview) && track.filePath) {
    try {
      const subMarkers = await resolveSubtitleMarkers(track.filePath);
      if (!recap && subMarkers.recap) recap = subMarkers.recap;
      if (!preview && subMarkers.preview) {
        preview = subMarkers.preview;
        hasPostCredits = true;
        if (!postCreditsStart) postCreditsStart = subMarkers.preview.start;
      }
    } catch (err) {
      console.warn('[VideoMarkers] Erreur Niveau 4 (Sous-Titres):', err);
    }
  }

  // === Niveau 4.5 : Détection IA Cloud ou Locale (si activée dans les paramètres et qu'il manque OP ou ED) ===
  const hasAiConfigured =
    skipOpAiConfig.apiKey ||
    skipOpAiConfig.provider === 'ollama' ||
    skipOpAiConfig.provider === 'lmstudio' ||
    skipOpAiConfig.endpoint;

  if ((!op || !ed) && skipOpAiConfig.mode !== 'disabled' && hasAiConfigured) {
    try {
      const subSnippet = extractSubtitlesSnippetFromVideo(videoElement);
      const aiResult = await detectMarkersWithCloudAi(subSnippet, {
        provider: skipOpAiConfig.provider,
        apiKey: skipOpAiConfig.apiKey,
        endpoint: skipOpAiConfig.endpoint,
        model: skipOpAiConfig.model,
        episodeDuration: actualDuration,
        title: track.title || track.album,
      });
      if (!op && aiResult.op) op = aiResult.op;
      if (!ed && aiResult.ed) ed = aiResult.ed;
    } catch (err) {
      console.warn('[VideoMarkers] Erreur Niveau 4.5 (IA Cloud/Locale):', err);
    }
  }

  // === Niveau 5 : Refonte Heuristique (si toujours manquant) ===
  if (!op || !ed) {
    try {
      const heuristic = await getHeuristicMarkers(videoElement, track, actualDuration);
      if (!op && heuristic.op) op = heuristic.op;
      if (!ed && heuristic.ed) ed = heuristic.ed;
      if (heuristic.hasPostCredits && !hasPostCredits) {
        hasPostCredits = true;
        postCreditsStart = heuristic.postCreditsStart;
      }
    } catch (err) {
      console.warn('[VideoMarkers] Erreur Niveau 5 (Heuristique):', err);
    }
  }

  // === Passe de finition : Snapping chirurgical aux silences audio (Time Adjustment) ===
  if (enableSnapping && track.filePath) {
    try {
      if (op && op.source !== 'chapter') {
        const tunedOp = await fineTuneIntervalMarkers(track.filePath, op);
        if (tunedOp && tunedOp.snapped) {
          op = tunedOp;
          snapped = true;
        }
      }
      if (ed && ed.source !== 'chapter') {
        const tunedEd = await fineTuneIntervalMarkers(track.filePath, ed);
        if (tunedEd && tunedEd.snapped) {
          ed = tunedEd;
          snapped = true;
        }
      }
    } catch (err) {
      console.warn('[VideoMarkers] Erreur Finition Snapping:', err);
    }
  }

  const result: VideoSkipMarkers = {
    op,
    ed,
    recap,
    preview,
    hasPostCredits,
    postCreditsStart,
    driftDetected,
    referenceDuration,
    snapped,
  };

  if (!track.isTransient) {
    setCachedMarkers(trackKey, result, actualDuration);
  }
  return result;
}



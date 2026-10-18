import { SubtitleTrack, AudioStreamTrack } from '../types';

/**
 * Convertit un contenu SRT ou texte horodaté en format WebVTT standard
 * Supporte le décalage temporel (offsetSeconds) pour le calage fin de la synchronisation
 */
export function srtToWebVtt(content: string, offsetSeconds = 0): string {
  if (!content) return 'WEBVTT\n\n';

  // Séparation en blocs
  const rawLines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const vttLines: string[] = ['WEBVTT\n'];

  const timeRegex = /(?<sh>\d{1,2}):(?<sm>\d{2}):(?<ss>\d{2})[,.](?<sms>\d{3})\s*-->\s*(?<eh>\d{1,2}):(?<em_>\d{2}):(?<es>\d{2})[,.](?<ems>\d{3})/;

  function parseTime(h: string, m: string, s: string, ms: string): number {
    return (
      parseInt(h, 10) * 3600 +
      parseInt(m, 10) * 60 +
      parseInt(s, 10) +
      parseInt(ms, 10) / 1000
    );
  }

  function formatTime(sec: number): string {
    const clamped = Math.max(0, sec);
    let totalSec = Math.floor(clamped);
    let ms = Math.round((clamped - totalSec) * 1000);
    if (ms >= 1000) {
      totalSec += 1;
      ms = 0;
    }
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  for (const line of rawLines) {
    const match = timeRegex.exec(line);
    if (match && match.groups) {
      const g = match.groups;
      const startTime = parseTime(g.sh, g.sm, g.ss, g.sms) + offsetSeconds;
      const endTime = parseTime(g.eh, g.em_, g.es, g.ems) + offsetSeconds;
      vttLines.push(`${formatTime(startTime)} --> ${formatTime(endTime)}`);
    } else {
      // Nettoyer les balises de style ASS/SSA résiduelles (ex: {\an8}, {\b1})
      const cleanedLine = line.replace(/\{[^\}]*\}/g, '');
      vttLines.push(cleanedLine);
    }
  }

  return vttLines.join('\n');
}

/**
 * Crée une URL Blob pour un contenu WebVTT
 */
export function createBlobVttUrl(vttContent: string): string {
  const blob = new Blob([vttContent], { type: 'text/vtt; charset=utf-8' });
  return URL.createObjectURL(blob);
}

/**
 * Charge un fichier de sous-titres local (.srt, .vtt, .ass) et génère une SubtitleTrack prête à l'emploi
 */
export async function loadSubtitleFromFile(file: File, offsetSeconds = 0): Promise<SubtitleTrack> {
  const text = await file.text();
  const vttText = file.name.toLowerCase().endsWith('.vtt') && offsetSeconds === 0
    ? text
    : srtToWebVtt(text, offsetSeconds);

  const url = createBlobVttUrl(vttText);
  const ext = file.name.split('.').pop()?.toLowerCase() || 'srt';

  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: `${file.name.replace(/\.[^/.]+$/, '')} (Local)`,
    format: ext,
    type: 'custom',
    url,
    isDefault: true,
  };
}

/**
 * Construit l'URL WebVTT HTTP pour un sous-titre intégré ou sidecar avec décalage éventuel
 */
export function getSubtitleWebVttUrl(filePath: string, track: SubtitleTrack, offsetSeconds = 0): string {
  if (track.type === 'custom' && track.url) {
    return track.url;
  }

  const params = new URLSearchParams({ filePath });
  if (track.type === 'embedded' && track.streamIndex !== undefined) {
    params.set('streamIndex', track.streamIndex.toString());
  } else if (track.type === 'sidecar' && track.filePath) {
    params.set('sidecarPath', track.filePath);
  }

  if (offsetSeconds !== 0) {
    params.set('offset', offsetSeconds.toString());
  }

  return `/api/video/subtitles/webvtt?${params.toString()}`;
}

/**
 * Récupère les pistes de sous-titres et pistes audio d'une vidéo locale via le backend
 */
export async function fetchVideoTracks(
  filePath: string
): Promise<{ subtitles: SubtitleTrack[]; audioTracks: AudioStreamTrack[] }> {
  if (!filePath) {
    return { subtitles: [], audioTracks: [] };
  }

  try {
    const params = new URLSearchParams({ filePath });
    const res = await fetch(`/api/video/tracks?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const subtitles: SubtitleTrack[] = Array.isArray(data.subtitles) ? data.subtitles : [];
        const audioTracks: AudioStreamTrack[] = Array.isArray(data.audioTracks) ? data.audioTracks : [];
        return { subtitles, audioTracks };
      }
    }
  } catch (err) {
    console.warn('[videoTracksService] Erreur lors de la récupération des pistes vidéo:', err);
  }

  return { subtitles: [], audioTracks: [] };
}

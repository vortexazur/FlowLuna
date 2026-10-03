import { MediaFormat, Track } from '../types';
import { saveAudioBlob, saveTrack } from '../services/audioDb';

const ARTWORK_PALETTES = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
];

export function getAudioFormatFromFileName(name: string): MediaFormat {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'flac') return 'flac';
  if (ext === 'wav') return 'wav';
  if (ext === 'ogg' || ext === 'oga') return 'ogg';
  if (ext === 'm4a') return 'm4a';
  if (ext === 'aac') return 'aac';
  if (ext === 'webm') return 'webm';
  if (ext === 'mp4') return 'mp4';
  if (ext === 'mkv') return 'mkv';
  if (ext === 'mov') return 'mov';
  if (ext === 'avi') return 'avi';
  if (ext === 'm4v') return 'm4v';
  return 'mp3';
}

export function isVideoFormat(formatOrExt: string): boolean {
  const f = formatOrExt.toLowerCase();
  return ['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v'].includes(f);
}

export function isVideoFile(file: File): boolean {
  if (file.type && file.type.startsWith('video/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return isVideoFormat(ext);
}

export function cleanTrackNameAndArtist(filename: string): { title: string; artist: string } {
  // Remove extension
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  // Check for common delimiter like "Artist - Title"
  if (withoutExt.includes(' - ')) {
    const parts = withoutExt.split(' - ');
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim(),
    };
  }
  return {
    title: withoutExt.trim(),
    artist: 'Artiste Local',
  };
}

/**
 * Extracts accurate video duration, dimensions, and captures a live frame as cover thumbnail
 */
export async function extractVideoMetadata(
  file: File
): Promise<{ duration: number; coverUrl?: string; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const tempUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.src = tempUrl;

    let hasResolved = false;
    const cleanup = () => {
      URL.revokeObjectURL(tempUrl);
    };

    const done = (cover?: string, w?: number, h?: number) => {
      if (hasResolved) return;
      hasResolved = true;
      const dur = Math.round(video.duration || 180);
      cleanup();
      resolve({ duration: dur, coverUrl: cover, width: w, height: h });
    };

    const safetyTimeout = setTimeout(() => {
      done(undefined, video.videoWidth, video.videoHeight);
    }, 4500);

    video.onloadedmetadata = () => {
      // Seek slightly into the video to avoid initial black frames
      const seekTarget = Math.min(2.0, (video.duration || 10) * 0.15);
      video.currentTime = seekTarget;
    };

    video.onseeked = () => {
      clearTimeout(safetyTimeout);
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w > 0 && h > 0) {
          const canvas = document.createElement('canvas');
          const targetW = Math.min(w, 640);
          const targetH = Math.max(1, Math.round((targetW / w) * h));
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx && canvas.width > 0 && canvas.height > 0) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            done(dataUrl, w, h);
            return;
          }
        }
      } catch (err) {
        console.warn('Capture miniature vidéo avertissement:', err);
      }
      done(undefined, video.videoWidth || undefined, video.videoHeight || undefined);
    };

    video.onerror = () => {
      clearTimeout(safetyTimeout);
      done();
    };
  });
}

export async function processLocalAudioFile(file: File): Promise<Track> {
  const isVideo = isVideoFile(file);
  const format = getAudioFormatFromFileName(file.name);
  const { title, artist } = cleanTrackNameAndArtist(file.name);
  const trackId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  let duration = 180;
  let coverUrl = ARTWORK_PALETTES[Math.floor(Math.random() * ARTWORK_PALETTES.length)];
  let videoWidth: number | undefined;
  let videoHeight: number | undefined;

  if (isVideo) {
    const meta = await extractVideoMetadata(file);
    duration = meta.duration;
    if (meta.coverUrl) {
      coverUrl = meta.coverUrl;
    }
    videoWidth = meta.width;
    videoHeight = meta.height;
  } else {
    // Determine duration via temporary Audio element
    const tempUrl = URL.createObjectURL(file);
    duration = await new Promise<number>((resolve) => {
      const audio = new Audio();
      audio.src = tempUrl;
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration || 180);
        URL.revokeObjectURL(tempUrl);
      });
      audio.addEventListener('error', () => {
        resolve(180);
        URL.revokeObjectURL(tempUrl);
      });
    });
  }

  const track: Track = {
    id: trackId,
    title,
    artist: isVideo && artist === 'Artiste Local' ? 'Clip Vidéo' : artist,
    album: isVideo ? 'Vidéos & Clips' : 'Fichiers PC Locaux',
    duration: Math.round(duration),
    format,
    bitrate: format === 'flac' || format === 'wav' ? 1411 : isVideo ? 1080 : 320,
    url: '', // Will be loaded from blob in indexedDB
    coverUrl,
    source: 'local',
    isFavorite: false,
    isCachedOffline: true,
    cachedAt: Date.now(),
    playCount: 0,
    addedAt: Date.now(),
    sizeInBytes: file.size,
    isVideo,
    videoWidth,
    videoHeight,
  };

  // Save blob to IndexedDB for offline persistence
  await saveAudioBlob(track.id, file);
  // Save track metadata
  await saveTrack(track);

  return track;
}

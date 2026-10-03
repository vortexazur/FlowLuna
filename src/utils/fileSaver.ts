import JSZip from 'jszip';
import { Track } from '../types';
import { getAudioBlob } from '../services/audioDb';

/**
 * Utility to save audio files directly onto the user's PC filesystem,
 * allowing them to choose the exact destination folder via the native OS Save As dialog
 * or batch export multiple tracks with custom formats into a single .zip or individual files.
 */

export function sanitizeFilename(name: string): string {
  // Remove forbidden Windows / POSIX filename characters: \ / : * ? " < > |
  return name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

export interface SaveFileResult {
  success: boolean;
  cancelled?: boolean;
  method?: 'native_picker' | 'browser_download';
  fileName?: string;
  error?: string;
}

export type ExportAudioFormat = 'mp3' | 'flac' | 'wav' | 'ogg' | 'm4a' | 'original';

export interface ExportFormatInfo {
  id: ExportAudioFormat;
  label: string;
  ext: string;
  mime: string;
  desc: string;
  badge: string;
  defaultBitrate: string;
}

export const EXPORT_FORMATS: ExportFormatInfo[] = [
  {
    id: 'mp3',
    label: 'MP3 Haute Fidélité (320 kbps)',
    ext: '.mp3',
    mime: 'audio/mpeg',
    desc: 'Format universel haute fidélité, compatible avec tous les appareils, autoradios et smartphones.',
    badge: '320k HD',
    defaultBitrate: '320k',
  },
  {
    id: 'flac',
    label: 'FLAC Lossless Studio',
    ext: '.flac',
    mime: 'audio/flac',
    desc: 'Qualité studio sans aucune compression destructrice (Lossless). Idéal pour audiophiles.',
    badge: 'Lossless',
    defaultBitrate: 'auto',
  },
  {
    id: 'wav',
    label: 'WAV Audio Non Compressé',
    ext: '.wav',
    mime: 'audio/wav',
    desc: 'Audio linéaire PCM pur (16-bit 44.1kHz). Compatible DAW, montage vidéo et mastering.',
    badge: 'PCM Pur',
    defaultBitrate: 'auto',
  },
  {
    id: 'm4a',
    label: 'AAC / M4A (256 kbps)',
    ext: '.m4a',
    mime: 'audio/mp4',
    desc: 'Excellente efficacité et clarté sonore, standard Apple Music et appareils modernes.',
    badge: '256k AAC',
    defaultBitrate: '256k',
  },
  {
    id: 'ogg',
    label: 'OGG Vorbis Haute Définition',
    ext: '.ogg',
    mime: 'audio/ogg',
    desc: 'Codec libre et optimisé pour le son dynamique.',
    badge: 'Vorbis Q7',
    defaultBitrate: 'auto',
  },
  {
    id: 'original',
    label: 'Format d’origine de la piste',
    ext: '',
    mime: 'audio/mpeg',
    desc: 'Conserve le fichier et le format actuel sans aucun ré-encodage.',
    badge: 'Original',
    defaultBitrate: 'auto',
  },
];

const MIME_TYPES_MAP: Record<string, { mime: string; ext: string; desc: string }> = {
  mp3: {
    mime: 'audio/mpeg',
    ext: '.mp3',
    desc: 'Fichier Audio MP3 Haute Fidélité (320 kbps)',
  },
  flac: {
    mime: 'audio/flac',
    ext: '.flac',
    desc: 'Fichier Audio FLAC Lossless Studio',
  },
  wav: {
    mime: 'audio/wav',
    ext: '.wav',
    desc: 'Fichier Audio WAV Non Compressé',
  },
  ogg: {
    mime: 'audio/ogg',
    ext: '.ogg',
    desc: 'Fichier Audio OGG Vorbis',
  },
  m4a: {
    mime: 'audio/mp4',
    ext: '.m4a',
    desc: 'Fichier Audio M4A / AAC',
  },
  aac: {
    mime: 'audio/aac',
    ext: '.aac',
    desc: 'Fichier Audio AAC',
  },
  zip: {
    mime: 'application/zip',
    ext: '.zip',
    desc: 'Archive ZIP Musique',
  },
};

/**
 * Saves a Blob directly to the PC.
 * If useNativePicker is true and supported, invokes the OS "Enregistrer sous..." dialog
 * allowing the user to select the exact destination directory on their hard drive.
 */
export async function saveAudioToPC(
  blob: Blob,
  suggestedName: string,
  format: string = 'mp3',
  useNativePicker: boolean = true
): Promise<SaveFileResult> {
  const cleanFormat = format.toLowerCase().replace('.', '');
  const formatInfo = MIME_TYPES_MAP[cleanFormat] || {
    mime: 'application/octet-stream',
    ext: `.${cleanFormat}`,
    desc: `Fichier ${cleanFormat.toUpperCase()}`,
  };

  let baseName = sanitizeFilename(suggestedName);
  if (baseName.toLowerCase().endsWith(formatInfo.ext)) {
    baseName = baseName.slice(0, -formatInfo.ext.length);
  }
  const fullFileName = `${baseName}${formatInfo.ext}`;

  // Try Native File System Access API (Chromium / Windows / Mac / Linux PC)
  if (useNativePicker && isFileSystemAccessSupported()) {
    try {
      const pickerOptions: any = {
        suggestedName: fullFileName,
        types: [
          {
            description: formatInfo.desc,
            accept: {
              [formatInfo.mime]: [formatInfo.ext],
            },
          },
          {
            description: 'Tous les fichiers (*.*)',
            accept: {
              '*/*': ['.*'],
            },
          },
        ],
      };

      // Native Save As file dialog
      const fileHandle = await (window as any).showSaveFilePicker(pickerOptions);
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      return {
        success: true,
        method: 'native_picker',
        fileName: fileHandle.name || fullFileName,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User voluntarily closed or cancelled the picker
        return {
          success: false,
          cancelled: true,
        };
      }
      console.warn('Native showSaveFilePicker failed or restricted, using browser fallback:', err);
      // Fall through to standard download
    }
  }

  // Fallback: standard browser download
  try {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fullFileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    }, 4000);

    return {
      success: true,
      method: 'browser_download',
      fileName: fullFileName,
    };
  } catch (err: any) {
    console.error('Failed to trigger download:', err);
    return {
      success: false,
      error: err.message || 'Échec du téléchargement',
    };
  }
}

/**
 * Converts a track to the requested format on server or retrieves raw blob,
 * and returns the resulting Blob with converted audio and metadata.
 */
export async function convertTrackToBlob(
  track: Track,
  targetFormat: ExportAudioFormat,
  bitrate: string = '320k'
): Promise<{ blob: Blob; fileName: string; format: string }> {
  const finalFmt = targetFormat === 'original' ? track.format || 'mp3' : targetFormat;
  const safeName = sanitizeFilename(`${track.artist} - ${track.title}`);
  const finalFileName = `${safeName}.${finalFmt}`;

  // If format is original and we already have the cached blob in IndexedDB
  if (targetFormat === 'original' || targetFormat === track.format) {
    const cachedBlob = await getAudioBlob(track.id);
    if (cachedBlob && cachedBlob.size > 1000) {
      return {
        blob: cachedBlob,
        fileName: finalFileName,
        format: finalFmt,
      };
    }
  }

  // Try to retrieve local blob or source audio to send to transcoder
  let sourceBlob: Blob | null = await getAudioBlob(track.id);
  if (!sourceBlob && track.url && (track.url.startsWith('blob:') || track.url.startsWith('http') || track.url.startsWith('/audio/'))) {
    try {
      const resp = await fetch(track.url);
      if (resp.ok) {
        sourceBlob = await resp.blob();
      }
    } catch {}
  }

  // Call /api/audio/convert endpoint
  const queryParams = new URLSearchParams({
    format: finalFmt,
    bitrate: bitrate,
    title: track.title,
    artist: track.artist,
    album: track.album || '',
  });

  if (!sourceBlob && track.url) {
    queryParams.set('audioUrl', track.url);
  }

  const convertUrl = `/api/audio/convert?${queryParams.toString()}`;
  let response: Response;

  if (sourceBlob) {
    response = await fetch(convertUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: sourceBlob,
    });
  } else {
    response = await fetch(convertUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioUrl: track.url,
        title: track.title,
        artist: track.artist,
        album: track.album,
        format: finalFmt,
        bitrate: bitrate,
      }),
    });
  }

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || `Erreur de conversion audio vers le format ${finalFmt.toUpperCase()}`);
  }

  const convertedBlob = await response.blob();
  return {
    blob: convertedBlob,
    fileName: finalFileName,
    format: finalFmt,
  };
}

export interface BatchExportOptions {
  tracks: Track[];
  format: ExportAudioFormat;
  bitrate?: string;
  mode: 'zip' | 'individual';
  namingPattern: 'artist_title' | 'title_artist' | 'numbered' | 'title_only';
  zipFileName?: string;
  onProgress?: (progress: {
    currentIndex: number;
    total: number;
    currentTrackTitle: string;
    stage: 'converting' | 'zipping' | 'saving' | 'done';
    percentage: number;
  }) => void;
}

/**
 * Batch export multiple tracks to PC in the chosen format.
 */
export async function exportBatchTracksToPC(options: BatchExportOptions): Promise<SaveFileResult> {
  const {
    tracks,
    format,
    bitrate = '320k',
    mode,
    namingPattern,
    zipFileName = 'Musique_FlowLuna',
    onProgress,
  } = options;

  if (tracks.length === 0) {
    return { success: false, error: 'Aucun morceau sélectionné pour l’exportation.' };
  }

  // Format filename helper
  const getFormattedName = (track: Track, index: number, ext: string) => {
    let name = '';
    const num = (index + 1).toString().padStart(2, '0');
    switch (namingPattern) {
      case 'title_artist':
        name = `${track.title} - ${track.artist}`;
        break;
      case 'numbered':
        name = `${num}. ${track.artist} - ${track.title}`;
        break;
      case 'title_only':
        name = track.title;
        break;
      case 'artist_title':
      default:
        name = `${track.artist} - ${track.title}`;
        break;
    }
    return `${sanitizeFilename(name)}.${ext}`;
  };

  // MODE 1: ZIP Archive
  if (mode === 'zip' || tracks.length > 1) {
    const zip = new JSZip();
    const total = tracks.length;

    for (let i = 0; i < total; i++) {
      const track = tracks[i];
      if (onProgress) {
        onProgress({
          currentIndex: i + 1,
          total,
          currentTrackTitle: `${track.artist} - ${track.title}`,
          stage: 'converting',
          percentage: Math.round(((i) / total) * 85),
        });
      }

      try {
        const result = await convertTrackToBlob(track, format, bitrate);
        const fileName = getFormattedName(track, i, result.format);
        zip.file(fileName, result.blob);
      } catch (err) {
        console.warn(`Failed to convert track "${track.title}" during ZIP export:`, err);
        // Fallback to cached blob or raw audio
        const cached = await getAudioBlob(track.id);
        if (cached) {
          const fallbackFmt = track.format || 'mp3';
          zip.file(getFormattedName(track, i, fallbackFmt), cached);
        }
      }
    }

    if (onProgress) {
      onProgress({
        currentIndex: total,
        total,
        currentTrackTitle: 'Génération de l’archive ZIP...',
        stage: 'zipping',
        percentage: 90,
      });
    }

    // Add Readme info in zip
    zip.file(
      'Informations_Export.txt',
      `Exportation FlowLuna Hi-Fi Music Player\n` +
      `Date : ${new Date().toLocaleString('fr-FR')}\n` +
      `Nombre de pistes : ${total}\n` +
      `Format choisi : ${format.toUpperCase()} (${bitrate})\n\n` +
      `Liste des morceaux :\n` +
      tracks.map((t, idx) => `${idx + 1}. ${t.artist} - ${t.title} [${t.album || 'Single'}]`).join('\n')
    );

    const zipBlob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      },
      (metadata) => {
        if (onProgress) {
          onProgress({
            currentIndex: total,
            total,
            currentTrackTitle: 'Compression ZIP en cours...',
            stage: 'zipping',
            percentage: 85 + Math.round((metadata.percent / 100) * 12),
          });
        }
      }
    );

    if (onProgress) {
      onProgress({
        currentIndex: total,
        total,
        currentTrackTitle: 'Enregistrement sur votre PC...',
        stage: 'saving',
        percentage: 98,
      });
    }

    const cleanZipName = sanitizeFilename(zipFileName || `Musique_Export_${Date.now()}`);
    const saveRes = await saveAudioToPC(zipBlob, cleanZipName, 'zip', true);

    if (onProgress) {
      onProgress({
        currentIndex: total,
        total,
        currentTrackTitle: 'Exportation terminée avec succès !',
        stage: 'done',
        percentage: 100,
      });
    }

    return saveRes;
  }

  // MODE 2: Individual single file export
  const singleTrack = tracks[0];
  if (onProgress) {
    onProgress({
      currentIndex: 1,
      total: 1,
      currentTrackTitle: `${singleTrack.artist} - ${singleTrack.title}`,
      stage: 'converting',
      percentage: 50,
    });
  }

  const result = await convertTrackToBlob(singleTrack, format, bitrate);
  const singleFileName = getFormattedName(singleTrack, 0, result.format);

  if (onProgress) {
    onProgress({
      currentIndex: 1,
      total: 1,
      currentTrackTitle: 'Enregistrement du fichier...',
      stage: 'saving',
      percentage: 90,
    });
  }

  const saveRes = await saveAudioToPC(result.blob, singleFileName, result.format, true);

  if (onProgress) {
    onProgress({
      currentIndex: 1,
      total: 1,
      currentTrackTitle: 'Exportation terminée !',
      stage: 'done',
      percentage: 100,
    });
  }

  return saveRes;
}


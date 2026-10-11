import { Track } from '../types';
import { getAudioBlob, getTrackPlayableUrl } from '../services/audioDb';
import { audioBufferToWav, generateSynthesizedTrack } from './audioSynthesizer';

let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

const MAX_BUFFER_SIZE_BYTES = 120 * 1024 * 1024; // Limite de 120 Mo pour parer au crash OOM V8

/**
 * Charge et décode un Track sous forme d'AudioBuffer complet
 */
export async function loadAudioBufferForTrack(
  track: Track,
  onProgress?: (msg: string) => void
): Promise<AudioBuffer> {
  const ctx = getAudioContext();

  if (track.sizeInBytes && track.sizeInBytes > MAX_BUFFER_SIZE_BYTES) {
    throw new Error('Ce fichier média est trop volumineux (> 120 Mo) pour être décodé en mémoire.');
  }

  onProgress?.('Récupération des données audio...');

  // 1. Vérifier si un Blob existe déjà dans IndexedDB
  let arrayBuffer: ArrayBuffer | null = null;
  try {
    const blob = await getAudioBlob(track.id);
    if (blob) {
      if (blob.size > MAX_BUFFER_SIZE_BYTES) {
        throw new Error('Ce fichier média est trop volumineux (> 120 Mo) pour être décodé en mémoire.');
      }
      if (blob.size > 1000) {
        arrayBuffer = await blob.arrayBuffer();
      }
    }
  } catch (err: any) {
    if (err?.message?.includes('120 Mo')) throw err;
    console.warn('Erreur de lecture du Blob IndexedDB:', err);
  }

  // 2. Sinon récupérer via l'URL playable
  if (!arrayBuffer) {
    const url = await getTrackPlayableUrl(track);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_BUFFER_SIZE_BYTES) {
        throw new Error('Ce fichier média est trop volumineux (> 120 Mo) pour être décodé en mémoire.');
      }
      arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_BUFFER_SIZE_BYTES) {
        throw new Error('Ce fichier média est trop volumineux (> 120 Mo) pour être décodé en mémoire.');
      }
    } catch (fetchErr: any) {
      if (fetchErr?.message?.includes('120 Mo')) throw fetchErr;
      console.warn('Fetch audio échoué, essai de génération de secours:', fetchErr);
      // Génération synthétique de secours pour les morceaux de démonstration
      onProgress?.('Génération de secours de l’onde sonore...');
      const fallbackBlob = await generateSynthesizedTrack(
        track.id,
        Math.min(track.duration || 60, 90)
      );
      arrayBuffer = await fallbackBlob.arrayBuffer();
    }
  }

  if (arrayBuffer.byteLength > MAX_BUFFER_SIZE_BYTES) {
    throw new Error('Ce fichier média est trop volumineux (> 120 Mo) pour être décodé en mémoire.');
  }

  onProgress?.('Décodage des échantillons audio haute fidélité...');
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } catch (decodeErr) {
    // Fallback: générer une onde synthétique propre si le fichier est corrompu ou format exotique
    console.warn('Décodage natif échoué, génération alternative:', decodeErr);
    const fallbackBlob = await generateSynthesizedTrack(
      track.id,
      Math.min(track.duration || 60, 60)
    );
    const fallbackBuffer = await fallbackBlob.arrayBuffer();
    return await ctx.decodeAudioData(fallbackBuffer);
  }
}

/**
 * Calcule les pics d'amplitude pour afficher une forme d'onde précise
 */
export function extractWaveformPeaks(buffer: AudioBuffer, numPeaks: number = 180): number[] {
  const channelData = buffer.getChannelData(0);
  const step = Math.floor(channelData.length / numPeaks);
  const peaks: number[] = new Array(numPeaks).fill(0.05);

  for (let i = 0; i < numPeaks; i++) {
    const start = i * step;
    const end = Math.min(start + step, channelData.length);
    let max = 0;
    for (let j = start; j < end; j += 4) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }
    peaks[i] = Math.max(0.06, Math.min(1.0, max));
  }

  return peaks;
}

/**
 * Détecte intelligemment les silences au début et à la fin du morceau
 * Seuil par défaut : -42 dB (amplitude ~ 0.008)
 */
export function detectSilence(
  buffer: AudioBuffer,
  thresholdDb: number = -42
): { startSilenceEnd: number; endSilenceStart: number } {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const threshold = Math.pow(10, thresholdDb / 20); // ~0.0079
  const windowSize = Math.floor(sampleRate * 0.05); // fenêtre de 50ms

  let startSample = 0;
  for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
    let sumSquares = 0;
    for (let j = 0; j < windowSize; j++) {
      sumSquares += channelData[i + j] * channelData[i + j];
    }
    const rms = Math.sqrt(sumSquares / windowSize);
    if (rms > threshold) {
      startSample = Math.max(0, i - Math.floor(sampleRate * 0.02));
      break;
    }
  }

  let endSample = channelData.length;
  for (let i = channelData.length - windowSize; i >= 0; i -= windowSize) {
    let sumSquares = 0;
    for (let j = 0; j < windowSize; j++) {
      sumSquares += channelData[i + j] * channelData[i + j];
    }
    const rms = Math.sqrt(sumSquares / windowSize);
    if (rms > threshold) {
      endSample = Math.min(channelData.length, i + windowSize + Math.floor(sampleRate * 0.02));
      break;
    }
  }

  const startSeconds = startSample / sampleRate;
  const endSeconds = endSample / sampleRate;

  return {
    startSilenceEnd: Math.min(startSeconds, buffer.duration * 0.25),
    endSilenceStart: Math.max(endSeconds, startSeconds + 0.5),
  };
}

export interface TrimOptions {
  sourceBuffer: AudioBuffer;
  startTime: number;
  endTime: number;
  fadeIn: boolean;
  fadeInDuration: number;
  fadeOut: boolean;
  fadeOutDuration: number;
}

export interface TrimResult {
  trimmedBuffer: AudioBuffer;
  wavBlob: Blob;
  duration: number;
}

/**
 * Découpe un AudioBuffer, applique les fondus demandés, et génère le fichier WAV
 */
export function trimAndProcessAudioBuffer(options: TrimOptions): TrimResult {
  const {
    sourceBuffer,
    startTime,
    endTime,
    fadeIn,
    fadeInDuration,
    fadeOut,
    fadeOutDuration,
  } = options;

  const ctx = getAudioContext();
  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;

  const minSlice = Math.min(0.1, sourceBuffer.duration > 0 ? sourceBuffer.duration : 0.1);
  const validStart = Math.max(0, Math.min(startTime, Math.max(0, sourceBuffer.duration - minSlice)));
  const validEnd = Math.min(sourceBuffer.duration, Math.max(validStart + minSlice, endTime));
  const newDuration = Math.max(0, validEnd - validStart);

  const startSample = Math.floor(validStart * sampleRate);
  const endSample = Math.floor(validEnd * sampleRate);
  const newLength = Math.max(1, endSample - startSample);

  const trimmedBuffer = ctx.createBuffer(numChannels, newLength, sampleRate);

  const fadeInSamples = fadeIn ? Math.min(newLength / 2, Math.floor(fadeInDuration * sampleRate)) : 0;
  const fadeOutSamples = fadeOut ? Math.min(newLength / 2, Math.floor(fadeOutDuration * sampleRate)) : 0;

  for (let channel = 0; channel < numChannels; channel++) {
    const sourceData = sourceBuffer.getChannelData(channel);
    const destData = trimmedBuffer.getChannelData(channel);

    for (let i = 0; i < newLength; i++) {
      let sample = sourceData[startSample + i] || 0;

      // Fondu d'entrée (Fade In - courbe S-curve / sinusoïdale douce)
      if (fadeIn && i < fadeInSamples) {
        const factor = 0.5 * (1 - Math.cos((Math.PI * i) / fadeInSamples));
        sample *= factor;
      }

      // Fondu de sortie (Fade Out - courbe S-curve douce)
      if (fadeOut && i >= newLength - fadeOutSamples) {
        const remaining = newLength - 1 - i;
        const factor = 0.5 * (1 - Math.cos((Math.PI * remaining) / fadeOutSamples));
        sample *= factor;
      }

      destData[i] = sample;
    }
  }

  const wavBlob = audioBufferToWav(trimmedBuffer);

  return {
    trimmedBuffer,
    wavBlob,
    duration: newDuration,
  };
}

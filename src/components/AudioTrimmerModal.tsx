import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scissors,
  X,
  Play,
  Pause,
  RotateCcw,
  Repeat,
  Sparkles,
  Download,
  Plus,
  Save,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  Radio,
  FileAudio,
  Smartphone,
  Bell,
} from 'lucide-react';
import { Track, AccentColor } from '../types';
import {
  loadAudioBufferForTrack,
  extractWaveformPeaks,
  detectSilence,
  trimAndProcessAudioBuffer,
  getAudioContext,
} from '../utils/audioTrimmer';
import { saveTrack, saveAudioBlob } from '../services/audioDb';
import { sanitizeFilename } from '../utils/fileSaver';

interface AudioTrimmerModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  accent: AccentColor;
  onTrackCreated?: (newTrack: Track) => void;
  onTrackUpdated?: (updatedTrack: Track) => void;
}

const ACCENT_BG: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  violet: 'bg-violet-500 hover:bg-violet-600 text-white',
  blue: 'bg-blue-500 hover:bg-blue-600 text-white',
  amber: 'bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold',
  rose: 'bg-rose-500 hover:bg-rose-600 text-white',
  cyan: 'bg-cyan-500 hover:bg-cyan-600 text-neutral-950 font-bold',
};

const ACCENT_TEXT: Record<AccentColor, string> = {
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  cyan: 'text-cyan-400',
};

export const AudioTrimmerModal: React.FC<AudioTrimmerModalProps> = ({
  isOpen,
  onClose,
  track,
  accent,
  onTrackCreated,
  onTrackUpdated,
}) => {
  if (!isOpen || !track) return null;

  // Audio Buffer & Peaks state
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [isLoadingBuffer, setIsLoadingBuffer] = useState(true);
  const [loadingStep, setLoadingStep] = useState('Chargement du fichier audio...');

  // Selection state (in seconds)
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(30);
  const [previewPos, setPreviewPos] = useState<number>(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Effects & Transitions
  const [fadeIn, setFadeIn] = useState(true);
  const [fadeInDuration, setFadeInDuration] = useState(1.0);
  const [fadeOut, setFadeOut] = useState(true);
  const [fadeOutDuration, setFadeOutDuration] = useState(1.0);

  // Save Options
  const [saveMode, setSaveMode] = useState<'new_track' | 'download' | 'replace'>('new_track');
  const [customTitle, setCustomTitle] = useState(`${track.title} [Extrait]`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dragging handles state
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);

  // Formatting helpers
  const formatTimeSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // 1. Load AudioBuffer on mount or track change
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingBuffer(true);
    setStatusMessage(null);
    setAudioBuffer(null);
    setPeaks([]);
    setCustomTitle(`${track.title} [Extrait]`);

    loadAudioBufferForTrack(track, (msg) => {
      if (!isCancelled) setLoadingStep(msg);
    })
      .then((buffer) => {
        if (isCancelled) return;
        setAudioBuffer(buffer);
        const calculatedPeaks = extractWaveformPeaks(buffer, 200);
        setPeaks(calculatedPeaks);

        // Initialiser la sélection à [0, min(duration, 30s)]
        setStartTime(0);
        const initialEnd = Math.min(buffer.duration, 30);
        setEndTime(initialEnd);
        setPreviewPos(0);
        setIsLoadingBuffer(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('Échec du chargement du buffer:', err);
        setIsLoadingBuffer(false);
        setStatusMessage({
          type: 'error',
          text: "Impossible de décoder les données audio de cette piste pour la découpe.",
        });
      });

    return () => {
      isCancelled = true;
      stopPlayback();
    };
  }, [track]);

  // Stop Web Audio playback
  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Start preview playback
  const startPlayback = useCallback(
    (startOffset: number) => {
      if (!audioBuffer) return;
      stopPlayback();

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Safe offset clamp
      const offset = Math.max(startTime, Math.min(startOffset, endTime - 0.05));
      const durationToPlay = endTime - offset;

      source.loop = isLooping;
      source.loopStart = startTime;
      source.loopEnd = endTime;

      source.connect(ctx.destination);
      source.start(0, offset, isLooping ? undefined : durationToPlay);
      sourceNodeRef.current = source;

      playbackStartTimeRef.current = ctx.currentTime;
      playbackOffsetRef.current = offset;
      setIsPlaying(true);

      const updatePlayhead = () => {
        if (!sourceNodeRef.current) return;
        const elapsed = ctx.currentTime - playbackStartTimeRef.current;
        let currentPos = playbackOffsetRef.current + elapsed;

        if (isLooping) {
          const loopDuration = endTime - startTime;
          if (loopDuration > 0 && currentPos >= endTime) {
            const overshoot = (currentPos - startTime) % loopDuration;
            currentPos = startTime + overshoot;
          }
        } else if (currentPos >= endTime) {
          stopPlayback();
          setPreviewPos(startTime);
          return;
        }

        setPreviewPos(currentPos);
        animFrameRef.current = requestAnimationFrame(updatePlayhead);
      };

      animFrameRef.current = requestAnimationFrame(updatePlayhead);

      source.onended = () => {
        if (!isLooping && sourceNodeRef.current === source) {
          setIsPlaying(false);
          setPreviewPos(startTime);
        }
      };
    },
    [audioBuffer, startTime, endTime, isLooping, stopPlayback]
  );

  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      const startAt = previewPos >= startTime && previewPos < endTime ? previewPos : startTime;
      startPlayback(startAt);
    }
  };

  const handleResetToStart = () => {
    stopPlayback();
    setPreviewPos(startTime);
  };

  // Smart Silence Trim
  const handleSmartSilenceTrim = () => {
    if (!audioBuffer) return;
    stopPlayback();
    const { startSilenceEnd, endSilenceStart } = detectSilence(audioBuffer, -42);
    setStartTime(Number(startSilenceEnd.toFixed(2)));
    setEndTime(Number(endSilenceStart.toFixed(2)));
    setPreviewPos(Number(startSilenceEnd.toFixed(2)));
    setStatusMessage({
      type: 'success',
      text: `Silences rognés automatiquement : Début à ${formatTimeSeconds(startSilenceEnd)}, Fin à ${formatTimeSeconds(endSilenceStart)}`,
    });
  };

  // Preset Sonnerie Smartphone (30 secondes max avec fondu)
  const handleSmartphoneRingtonePreset = () => {
    if (!audioBuffer) return;
    stopPlayback();
    const targetStart = Math.max(0, previewPos > 0 && previewPos < audioBuffer.duration - 10 ? previewPos : 0);
    const targetEnd = Math.min(audioBuffer.duration, targetStart + 30);
    setStartTime(Number(targetStart.toFixed(2)));
    setEndTime(Number(targetEnd.toFixed(2)));
    setPreviewPos(Number(targetStart.toFixed(2)));
    setFadeIn(true);
    setFadeInDuration(0.5);
    setFadeOut(true);
    setFadeOutDuration(1.5);
    setCustomTitle(track ? `${track.title} [Sonnerie]` : 'Sonnerie');
    setStatusMessage({
      type: 'success',
      text: `Preset Sonnerie Smartphone configuré (30s max, fondus In 0.5s / Out 1.5s) !`,
    });
  };

  // Stepping precision helpers
  const adjustStartTime = (delta: number) => {
    if (!audioBuffer) return;
    const next = Math.max(0, Math.min(endTime - 0.2, Number((startTime + delta).toFixed(2))));
    setStartTime(next);
    if (previewPos < next) setPreviewPos(next);
    if (isPlaying) startPlayback(next);
  };

  const adjustEndTime = (delta: number) => {
    if (!audioBuffer) return;
    const next = Math.min(audioBuffer.duration, Math.max(startTime + 0.2, Number((endTime + delta).toFixed(2))));
    setEndTime(next);
    if (previewPos > next) setPreviewPos(startTime);
    if (isPlaying) startPlayback(startTime);
  };

  // Dragging interaction on waveform
  const handleMouseDownWaveform = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || !audioBuffer) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const clickTime = clickRatio * audioBuffer.duration;

    // Déterminer si le clic est proche du point de départ ou de fin
    const distStart = Math.abs(clickTime - startTime);
    const distEnd = Math.abs(clickTime - endTime);
    const threshold = audioBuffer.duration * 0.03; // 3% de tolérance

    if (distStart < threshold && distStart <= distEnd) {
      setDraggingHandle('start');
    } else if (distEnd < threshold) {
      setDraggingHandle('end');
    } else if (clickTime >= startTime && clickTime <= endTime) {
      // Repositionner la tête de lecture
      setPreviewPos(clickTime);
      if (isPlaying) {
        startPlayback(clickTime);
      }
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingHandle || !waveformRef.current || !audioBuffer) return;
      const rect = waveformRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = Number((ratio * audioBuffer.duration).toFixed(2));

      if (draggingHandle === 'start') {
        const validStart = Math.max(0, Math.min(time, endTime - 0.2));
        setStartTime(validStart);
        if (previewPos < validStart) setPreviewPos(validStart);
      } else if (draggingHandle === 'end') {
        const validEnd = Math.min(audioBuffer.duration, Math.max(time, startTime + 0.2));
        setEndTime(validEnd);
        if (previewPos > validEnd) setPreviewPos(startTime);
      }
    };

    const handleMouseUp = () => {
      if (draggingHandle) {
        setDraggingHandle(null);
      }
    };

    if (draggingHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingHandle, audioBuffer, startTime, endTime, previewPos]);

  // Execute Trim & Save
  const handleExecuteTrim = async () => {
    if (!audioBuffer) return;
    stopPlayback();
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const trimRes = trimAndProcessAudioBuffer({
        sourceBuffer: audioBuffer,
        startTime,
        endTime,
        fadeIn,
        fadeInDuration,
        fadeOut,
        fadeOutDuration,
      });

      const cleanBaseName = sanitizeFilename(customTitle.trim() || `${track.title} [Extrait]`);

      // Option 1 : Téléchargement direct
      if (saveMode === 'download') {
        const url = URL.createObjectURL(trimRes.wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cleanBaseName}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setStatusMessage({
          type: 'success',
          text: `Fichier "${cleanBaseName}.wav" téléchargé avec succès sur votre ordinateur !`,
        });
        setIsProcessing(false);
        return;
      }

      // Option 2 : Ajouter comme nouvelle piste dans la bibliothèque FlowLuna
      if (saveMode === 'new_track') {
        const newTrackId = `track-trimmed-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        await saveAudioBlob(newTrackId, trimRes.wavBlob);

        const newTrack: Track = {
          id: newTrackId,
          title: customTitle.trim() || `${track.title} [Extrait]`,
          artist: track.artist,
          album: track.album ? `${track.album} (Extrait)` : 'Extraits Audio',
          duration: trimRes.duration,
          format: 'wav',
          bitrate: 1411,
          url: '',
          coverUrl: track.coverUrl,
          source: 'local',
          isFavorite: false,
          isCachedOffline: true,
          cachedAt: Date.now(),
          playCount: 0,
          addedAt: Date.now(),
          lyrics: track.lyrics,
          sizeInBytes: trimRes.wavBlob.size,
        };

        await saveTrack(newTrack);
        onTrackCreated?.(newTrack);

        setStatusMessage({
          type: 'success',
          text: `Nouvelle piste "${newTrack.title}" (${formatTimeSeconds(trimRes.duration)}) ajoutée à votre bibliothèque !`,
        });
        setIsProcessing(false);
        setTimeout(() => {
          onClose();
        }, 1200);
        return;
      }

      // Option 3 : Remplacer la piste d'origine
      if (saveMode === 'replace') {
        await saveAudioBlob(track.id, trimRes.wavBlob);

        const updatedTrack: Track = {
          ...track,
          title: customTitle.trim() || track.title,
          duration: trimRes.duration,
          format: 'wav',
          isCachedOffline: true,
          cachedAt: Date.now(),
          sizeInBytes: trimRes.wavBlob.size,
        };

        await saveTrack(updatedTrack);
        onTrackUpdated?.(updatedTrack);

        setStatusMessage({
          type: 'success',
          text: `La piste "${updatedTrack.title}" a été mise à jour avec le nouveau segment rogné !`,
        });
        setIsProcessing(false);
        setTimeout(() => {
          onClose();
        }, 1200);
        return;
      }
    } catch (err: any) {
      console.error('Erreur découpe audio:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Erreur lors du traitement et de la sauvegarde audio.',
      });
      setIsProcessing(false);
    }
  };

  const totalDuration = audioBuffer ? audioBuffer.duration : track.duration || 1;
  const snippetDuration = Math.max(0, endTime - startTime);
  const startPercent = Math.max(0, Math.min(100, (startTime / totalDuration) * 100));
  const endPercent = Math.max(0, Math.min(100, (endTime / totalDuration) * 100));
  const previewPercent = Math.max(0, Math.min(100, (previewPos / totalDuration) * 100));

  return (
    <div
      id="audio-trimmer-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="audio-trimmer-modal-content"
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-100 p-6 shadow-2xl flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-neutral-800 text-sky-400 border border-neutral-700/80">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">Studio de Découpe Audio</h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                  Précision 16-bit
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate max-w-md">
                {track.title} <span className="text-neutral-500">•</span> {track.artist}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback / Notification Banner */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs animate-in fade-in duration-150 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/40 border-red-500/40 text-red-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <span className="flex-1">{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-neutral-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Interactive Waveform Display */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span>Forme d'onde et zone sélectionnée</span>
            <div className="flex items-center gap-2 font-mono">
              <span>Durée extrait :</span>
              <span className={`font-bold ${ACCENT_TEXT[accent]}`}>{formatTimeSeconds(snippetDuration)}</span>
              <span className="text-neutral-600">/</span>
              <span className="text-neutral-400">{formatTimeSeconds(totalDuration)}</span>
            </div>
          </div>

          <div
            ref={waveformRef}
            onMouseDown={handleMouseDownWaveform}
            className="relative h-36 w-full rounded-xl bg-neutral-950/80 border border-neutral-800 overflow-hidden cursor-crosshair select-none flex items-center px-2 shadow-inner"
          >
            {isLoadingBuffer ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950/70 backdrop-blur-xs text-neutral-300">
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                <span className="text-xs">{loadingStep}</span>
              </div>
            ) : (
              <>
                {/* Visualizer Peak Bars */}
                <div className="flex items-center justify-between w-full h-24 gap-[2px]">
                  {peaks.map((p, idx) => {
                    const ratio = idx / peaks.length;
                    const peakTime = ratio * totalDuration;
                    const isInSelectedRange = peakTime >= startTime && peakTime <= endTime;

                    return (
                      <div
                        key={idx}
                        className={`flex-1 rounded-full transition-colors ${
                          isInSelectedRange ? 'bg-sky-400/90' : 'bg-neutral-700/40'
                        }`}
                        style={{ height: `${Math.max(6, p * 100)}%` }}
                      />
                    );
                  })}
                </div>

                {/* Shaded Left Region (Before Start) */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none border-r border-emerald-500/40"
                  style={{ width: `${startPercent}%` }}
                />

                {/* Shaded Right Region (After End) */}
                <div
                  className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none border-l border-rose-500/40"
                  style={{ width: `${100 - endPercent}%` }}
                />

                {/* Start In-Handle */}
                <div
                  className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize flex items-center justify-center group z-20"
                  style={{ left: `${startPercent}%` }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingHandle('start');
                  }}
                  title="Début de l'extrait (Glisser pour ajuster)"
                >
                  <div className="w-1 h-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <div className="absolute top-1 px-1.5 py-0.5 rounded bg-emerald-500 text-[9px] font-mono text-neutral-950 font-bold shadow-md pointer-events-none">
                    IN {formatTimeSeconds(startTime)}
                  </div>
                </div>

                {/* End Out-Handle */}
                <div
                  className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize flex items-center justify-center group z-20"
                  style={{ left: `${endPercent}%` }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingHandle('end');
                  }}
                  title="Fin de l'extrait (Glisser pour ajuster)"
                >
                  <div className="w-1 h-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
                  <div className="absolute top-1 px-1.5 py-0.5 rounded bg-rose-500 text-[9px] font-mono text-white font-bold shadow-md pointer-events-none">
                    OUT {formatTimeSeconds(endTime)}
                  </div>
                </div>

                {/* Playhead Cursor */}
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] pointer-events-none z-30"
                  style={{ left: `${previewPercent}%` }}
                >
                  <div className="w-2 h-2 rounded-full bg-white -ml-[3px] -mt-1 shadow-sm" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Playback Controls & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="trimmer-play-btn"
              onClick={togglePlay}
              disabled={isLoadingBuffer}
              className={`py-2 px-4 rounded-lg font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                isPlaying ? 'bg-amber-500 hover:bg-amber-600 text-neutral-950' : 'bg-sky-500 hover:bg-sky-600 text-white'
              } disabled:opacity-50`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Pré-écouter l'extrait</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="trimmer-reset-pos-btn"
              onClick={handleResetToStart}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Revenir au point IN (Début de l'extrait)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              id="trimmer-loop-btn"
              onClick={() => setIsLooping(!isLooping)}
              className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isLooping
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title="Répéter la sélection en boucle"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Boucle (Loop)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Smart Silence Detection Button */}
            <button
              type="button"
              id="trimmer-silence-btn"
              onClick={handleSmartSilenceTrim}
              disabled={isLoadingBuffer}
              className="py-2 px-3 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Détecte et supprime automatiquement les blancs sonores au début et à la fin"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rogner les silences</span>
            </button>

            {/* Smartphone Ringtone Preset Button */}
            <button
              type="button"
              id="trimmer-ringtone-btn"
              onClick={handleSmartphoneRingtonePreset}
              disabled={isLoadingBuffer}
              className="py-2 px-3 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Pré-règle un extrait de 30 secondes avec fondus pour sonnerie smartphone"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Preset Sonnerie (30s)</span>
            </button>
          </div>
        </div>

        {/* Fine-Tuning Step Controls (IN & OUT) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Start Point Fine Control */}
          <div className="bg-neutral-950/40 p-3 rounded-xl border border-neutral-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Point IN (Début)
              </span>
              <span className="font-mono font-bold text-neutral-200">{formatTimeSeconds(startTime)}</span>
            </div>

            <div className="flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => adjustStartTime(-1.0)}
                className="flex-1 py-1 px-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300"
              >
                -1.0s
              </button>
              <button
                type="button"
                onClick={() => adjustStartTime(-0.1)}
                className="flex-1 py-1 px-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300"
              >
                -0.1s
              </button>
              <button
                type="button"
                onClick={() => adjustStartTime(0.1)}
                className="flex-1 py-1 px-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300"
              >
                +0.1s
              </button>
              <button
                type="button"
                onClick={() => adjustStartTime(1.0)}
                className="flex-1 py-1 px-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300"
              >
                +1.0s
              </button>
            </div>
          </div>

          {/* End Point Fine Control */}
          <div className="bg-neutral-950/40 p-3 rounded-xl border border-neutral-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Point OUT (Fin)
              </span>
              <span className="font-mono font-bold text-neutral-200">{formatTimeSeconds(endTime)}</span>
            </div>

            <div className="flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => adjustEndTime(-1.0)}
                className="flex-1 py-1 px-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300"
              >
                -1.0s
              </button>
              <button
                type="button"
                onClick={() => adjustEndTime(-0.1)}
                className="flex-1 py-1 px-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300"
              >
                -0.1s
              </button>
              <button
                type="button"
                onClick={() => adjustEndTime(0.1)}
                className="flex-1 py-1 px-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300"
              >
                +0.1s
              </button>
              <button
                type="button"
                onClick={() => adjustEndTime(1.0)}
                className="flex-1 py-1 px-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300"
              >
                +1.0s
              </button>
            </div>
          </div>
        </div>

        {/* Audio Transitions (Fade In & Fade Out) */}
        <div className="flex flex-col gap-2.5 bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-800">
          <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            Transitions & Fondus Audio
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fade In */}
            <div className="flex items-center justify-between bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="trimmer-fadein-check"
                  checked={fadeIn}
                  onChange={(e) => setFadeIn(e.target.checked)}
                  className="w-4 h-4 rounded accent-sky-500 cursor-pointer"
                />
                <label htmlFor="trimmer-fadein-check" className="text-xs font-medium text-neutral-200 cursor-pointer">
                  Fondu d'entrée (Fade In)
                </label>
              </div>
              {fadeIn && (
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0.2}
                    max={3.0}
                    step={0.1}
                    value={fadeInDuration}
                    onChange={(e) => setFadeInDuration(parseFloat(e.target.value))}
                    className="w-20 accent-sky-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono font-bold text-neutral-300 w-8 text-right">
                    {fadeInDuration.toFixed(1)}s
                  </span>
                </div>
              )}
            </div>

            {/* Fade Out */}
            <div className="flex items-center justify-between bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="trimmer-fadeout-check"
                  checked={fadeOut}
                  onChange={(e) => setFadeOut(e.target.checked)}
                  className="w-4 h-4 rounded accent-sky-500 cursor-pointer"
                />
                <label htmlFor="trimmer-fadeout-check" className="text-xs font-medium text-neutral-200 cursor-pointer">
                  Fondu de sortie (Fade Out)
                </label>
              </div>
              {fadeOut && (
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0.2}
                    max={3.0}
                    step={0.1}
                    value={fadeOutDuration}
                    onChange={(e) => setFadeOutDuration(parseFloat(e.target.value))}
                    className="w-20 accent-sky-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono font-bold text-neutral-300 w-8 text-right">
                    {fadeOutDuration.toFixed(1)}s
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save & Export Target Options */}
        <div className="flex flex-col gap-3 border-t border-neutral-800 pt-4">
          <span className="text-xs uppercase tracking-wider text-neutral-400 font-bold">
            Destination de l'enregistrement
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Option A: New Track */}
            <button
              type="button"
              onClick={() => setSaveMode('new_track')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                saveMode === 'new_track'
                  ? 'border-sky-500 bg-sky-950/30 text-white'
                  : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>Nouvelle Piste</span>
              </div>
              <span className="text-[11px] opacity-80">
                Ajoute l'extrait dans votre bibliothèque FlowLuna
              </span>
            </button>

            {/* Option B: Download */}
            <button
              type="button"
              onClick={() => setSaveMode('download')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                saveMode === 'download'
                  ? 'border-emerald-500 bg-emerald-950/30 text-white'
                  : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Télécharger sur PC</span>
              </div>
              <span className="text-[11px] opacity-80">
                Télécharge directement le fichier .wav haute qualité
              </span>
            </button>

            {/* Option C: Replace */}
            <button
              type="button"
              onClick={() => setSaveMode('replace')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                saveMode === 'replace'
                  ? 'border-amber-500 bg-amber-950/30 text-white'
                  : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <Save className="w-3.5 h-3.5 text-amber-400" />
                <span>Remplacer l'original</span>
              </div>
              <span className="text-[11px] opacity-80">
                Modifie la piste existante sans altérer vos playlists
              </span>
            </button>
          </div>

          {/* Custom Title Input for New Track or Download */}
          {saveMode !== 'replace' && (
            <div className="flex flex-col gap-1 mt-1">
              <label htmlFor="trimmer-custom-title" className="text-xs text-neutral-400 font-medium">
                Titre du morceau découpé :
              </label>
              <input
                id="trimmer-custom-title"
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Ex: Mon morceau - Refrain"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          {/* Action Button */}
          <div className="flex items-center justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Annuler
            </button>

            <button
              type="button"
              id="trimmer-confirm-save-btn"
              onClick={handleExecuteTrim}
              disabled={isProcessing || isLoadingBuffer}
              className={`py-2.5 px-6 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 ${
                saveMode === 'download'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : saveMode === 'replace'
                  ? 'bg-amber-500 hover:bg-amber-600 text-neutral-950'
                  : ACCENT_BG[accent]
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Traitement audio en cours...</span>
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4" />
                  <span>
                    {saveMode === 'download'
                      ? 'Exporter & Télécharger (.wav)'
                      : saveMode === 'replace'
                      ? 'Remplacer la piste'
                      : 'Créer et Enregistrer la piste'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

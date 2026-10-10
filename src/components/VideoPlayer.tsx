import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Maximize2,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  PictureInPicture,
  X,
  Gauge,
  Film,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListVideo,
  FolderPlus,
  Trash2,
  PlusSquare,
  ListFilter,
  Zap,
} from 'lucide-react';
import { Track, AccentColor, MarathonConfig, VideoAspectRatio } from '../types';
import { SkipOpeningButton } from './SkipOpeningButton';
import { MarathonCountdownOverlay } from './MarathonCountdownOverlay';
import { useMarathonController } from '../hooks/useMarathonController';

export type VideoDisplayMode = 'theater' | 'pip' | 'hidden';
export type { VideoAspectRatio };

interface VideoPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onError?: (e: any) => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onPrev: () => void;
  onNext: () => void;
  videoMode: VideoDisplayMode;
  onSetVideoMode: (mode: VideoDisplayMode) => void;
  accent: AccentColor;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  queue?: Track[];
  currentTrackIndex?: number;
  onSelectTrack?: (index: number) => void;
  onRemoveFromQueue?: (index: number) => void;
  onClearQueue?: () => void;
  onAddMediaToQueue?: (files: FileList | File[]) => void;
  onSaveQueueAsPlaylist?: () => void;
  autoSkipOpening?: boolean;
  onToggleAutoSkip?: (enabled: boolean) => void;
  marathonConfig?: MarathonConfig;
  onUpdateMarathonConfig?: (config: MarathonConfig) => void;
  videoSkipForwardInterval?: number;
  videoAspectRatio?: VideoAspectRatio;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onPlay,
  onPause,
  onError,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  onPrev,
  onNext,
  videoMode,
  onSetVideoMode,
  accent,
  videoRef,
  queue = [],
  currentTrackIndex = 0,
  onSelectTrack,
  onRemoveFromQueue,
  onClearQueue,
  onAddMediaToQueue,
  onSaveQueueAsPlaylist,
  autoSkipOpening = false,
  onToggleAutoSkip,
  marathonConfig,
  onUpdateMarathonConfig,
  videoSkipForwardInterval = 10,
  videoAspectRatio = 'contain',
}) => {
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [clickAnim, setClickAnim] = useState<'play' | 'pause' | null>(null);

  // Étape 1: File d'attente flottante & Feedback saut temporel
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isBadgeVisible, setIsBadgeVisible] = useState(false);
  const [accumulatedDelta, setAccumulatedDelta] = useState<number>(0);
  const [leftIndicatorActive, setLeftIndicatorActive] = useState(false);
  const [rightIndicatorActive, setRightIndicatorActive] = useState(false);

  // Étape 2 & 3: Système Hybride de Détection, Skip Opening et Mode Marathon
  const {
    markers,
    isCountdownActive,
    countdownRemaining,
    countdownTotal,
    countdownProgress,
    nextTrack: marathonNextTrack,
    nextEpisodeNumber: marathonNextEpNum,
    triggerNextImmediately,
    cancelCountdown,
    toggleMarathon,
    marathonToast,
    opInterval: skipInterval,
    isOpButtonVisible: isSkipButtonVisible,
    skipOpening,
  } = useMarathonController({
    track: currentTrack,
    currentTime,
    duration,
    queue,
    currentTrackIndex,
    videoRef,
    onNext,
    onSeek,
    config: marathonConfig,
    onUpdateConfig: onUpdateMarathonConfig,
    autoSkipOpening,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  const badgeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leftIndicatorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rightIndicatorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Click & Touch debouncing for double-tap / click detection
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapLeftRef = useRef<number>(0);
  const lastTapRightRef = useRef<number>(0);
  const lastTapCenterRef = useRef<number>(0);

  const isVideo = !!currentTrack?.isVideo;

  // Format time (mm:ss or hh:mm:ss)
  const formatTime = (secs: number) => {
    const total = Math.max(0, Math.floor(secs));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Format delta for dynamic pill (+0:20, -0:10, etc.)
  const formatDelta = (secs: number) => {
    const abs = Math.abs(secs);
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    const sign = secs >= 0 ? '+' : '-';
    return `${sign}${m}:${s.toString().padStart(2, '0')}`;
  };

  // Trigger Seek with dynamic badge and lateral indicators feedback
  const triggerSeek = useCallback(
    (step: number) => {
      const newTime = Math.max(0, Math.min(duration || 0, currentTime + step));
      onSeek(newTime);

      // Cumuler le saut si déclenché rapidement
      setAccumulatedDelta((prev) => {
        if ((prev > 0 && step < 0) || (prev < 0 && step > 0)) {
          return step;
        }
        return prev + step;
      });
      setIsBadgeVisible(true);

      if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
      badgeTimerRef.current = setTimeout(() => {
        setIsBadgeVisible(false);
        setTimeout(() => setAccumulatedDelta(0), 300);
      }, 1000);

      // Feedback visuel des indicateurs latéraux
      if (step < 0) {
        setLeftIndicatorActive(true);
        if (leftIndicatorTimerRef.current) clearTimeout(leftIndicatorTimerRef.current);
        leftIndicatorTimerRef.current = setTimeout(() => {
          setLeftIndicatorActive(false);
        }, 700);
      } else {
        setRightIndicatorActive(true);
        if (rightIndicatorTimerRef.current) clearTimeout(rightIndicatorTimerRef.current);
        rightIndicatorTimerRef.current = setTimeout(() => {
          setRightIndicatorActive(false);
        }, 700);
      }

      setAreControlsVisible(true);
    },
    [currentTime, duration, onSeek]
  );

  // Auto-hide controls in theater mode after 2.5s of idle
  useEffect(() => {
    if (videoMode !== 'theater' || !isPlaying) {
      setAreControlsVisible(true);
      return;
    }

    const resetTimer = () => {
      setAreControlsVisible(true);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = setTimeout(() => {
        if (isPlaying && !isSpeedMenuOpen && !isQueueOpen) {
          setAreControlsVisible(false);
        }
      }, 2500);
    };

    const handleActivity = () => resetTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [videoMode, isPlaying, isSpeedMenuOpen, isQueueOpen]);

  // Keyboard shortcuts when in theater mode
  useEffect(() => {
    if (videoMode !== 'theater') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        onTogglePlay();
        triggerClickAnim(isPlaying ? 'pause' : 'play');
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        triggerSeek(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        triggerSeek(videoSkipForwardInterval);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        onVolumeChange(Math.min(1, volume + 0.05));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        onVolumeChange(Math.max(0, volume - 0.05));
      } else if (e.key === 'm' || e.key === 'M') {
        e.stopPropagation();
        onToggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        e.stopPropagation();
        toggleBrowserFullscreen();
      } else if (e.key === 's' || e.key === 'S') {
        e.stopPropagation();
        if (skipInterval) {
          skipOpening();
        }
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        e.stopPropagation();
        if (isCountdownActive) {
          triggerNextImmediately();
        } else if (queue && currentTrackIndex + 1 < queue.length) {
          onNext();
        }
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        if (isCountdownActive) {
          cancelCountdown();
        } else if (isQueueOpen) {
          setIsQueueOpen(false);
        } else if (isSpeedMenuOpen) {
          setIsSpeedMenuOpen(false);
        } else {
          onSetVideoMode('pip');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    videoMode,
    isPlaying,
    currentTime,
    duration,
    volume,
    onTogglePlay,
    triggerSeek,
    videoSkipForwardInterval,
    onVolumeChange,
    onToggleMute,
    onSetVideoMode,
    isQueueOpen,
    isSpeedMenuOpen,
    skipInterval,
    skipOpening,
    isCountdownActive,
    triggerNextImmediately,
    cancelCountdown,
    onNext,
    queue,
    currentTrackIndex,
  ]);

  const triggerClickAnim = (type: 'play' | 'pause') => {
    setClickAnim(type);
    setTimeout(() => setClickAnim(null), 500);
  };

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Lateral and central click / double-click / double-tap handling
  const handleZoneClick = (zone: 'left' | 'center' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();

    if (isQueueOpen) {
      setIsQueueOpen(false);
      return;
    }

    if (e.detail === 2) {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      if (zone === 'left') {
        triggerSeek(-10);
      } else if (zone === 'right') {
        triggerSeek(videoSkipForwardInterval);
      } else {
        toggleBrowserFullscreen();
      }
      return;
    }

    if (e.detail === 1) {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => {
        if (!areControlsVisible) {
          setAreControlsVisible(true);
        } else {
          onTogglePlay();
          triggerClickAnim(isPlaying ? 'pause' : 'play');
        }
      }, 250);
    }
  };

  const handleZoneTouchEnd = (zone: 'left' | 'center' | 'right', e: React.TouchEvent) => {
    const now = Date.now();
    const tapRef = zone === 'left' ? lastTapLeftRef : zone === 'right' ? lastTapRightRef : lastTapCenterRef;
    if (now - tapRef.current < 300) {
      e.preventDefault();
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      if (zone === 'left') {
        triggerSeek(-10);
      } else if (zone === 'right') {
        triggerSeek(videoSkipForwardInterval);
      } else {
        toggleBrowserFullscreen();
      }
      tapRef.current = 0;
    } else {
      tapRef.current = now;
    }
  };

  const handleNativePiP = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current && (videoRef.current as any).requestPictureInPicture) {
        await (videoRef.current as any).requestPictureInPicture();
      }
    } catch (err) {
      console.warn('Native Picture-in-Picture non disponible:', err);
    }
  };

  const handleSpeedSelect = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setIsSpeedMenuOpen(false);
  };

  // If there's no track or it's not a video, keep the video element mounted but off-screen
  const isHidden = !isVideo || videoMode === 'hidden';

  // Video object-fit style
  const videoObjectFitClass =
    videoAspectRatio === 'cover'
      ? 'object-cover'
      : videoAspectRatio === '16-9'
      ? 'object-fill aspect-video'
      : 'object-contain';

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`transition-all duration-300 select-none ${
        isHidden
          ? 'fixed -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none'
          : videoMode === 'theater'
          ? 'fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden animate-in fade-in duration-200'
          : 'fixed bottom-28 right-6 z-40 w-80 md:w-96 aspect-video rounded-2xl shadow-2xl border border-neutral-800 bg-neutral-950 overflow-hidden group hover:border-neutral-700 hover:shadow-cyan-950/20 transition-all animate-in slide-in-from-bottom-5 duration-200'
      }`}
      style={
        videoMode === 'pip' && !isHidden
          ? {
              boxShadow: '0 20px 45px -8px rgba(0, 0, 0, 0.9), 0 8px 18px -4px rgba(0, 0, 0, 0.7)',
            }
          : undefined
      }
    >
      {/* Video Media Screen Container */}
      <div
        className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden"
        onClick={() => {
          if (videoMode === 'pip') {
            onTogglePlay();
            triggerClickAnim(isPlaying ? 'pause' : 'play');
          } else if (isQueueOpen) {
            setIsQueueOpen(false);
          }
        }}
        onDoubleClick={() => {
          if (videoMode === 'pip') {
            onSetVideoMode('theater');
          }
        }}
      >
        {/* The single persistent video element attached to audio pipeline */}
        <video
          ref={videoRef as any}
          className={`w-full h-full max-h-screen ${videoObjectFitClass}`}
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          onPlay={onPlay}
          onPause={onPause}
          onError={onError}
        />

        {/* Central Click Feedback Animation */}
        {clickAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="w-16 h-16 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-white animate-ping duration-300">
              {clickAnim === 'play' ? (
                <Play className="w-8 h-8 fill-white translate-x-0.5" />
              ) : (
                <Pause className="w-8 h-8 fill-white" />
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* THEATER MODE OVERLAYS                                       */}
        {/* ============================================================ */}
        {videoMode === 'theater' && (
          <>
            {/* Lateral and Center Touch / Click Zones (double-tap / clic rapide +/- 10s) */}
            <div
              className="absolute top-16 bottom-24 left-0 w-1/4 md:w-1/3 z-20 cursor-pointer"
              onClick={(e) => handleZoneClick('left', e)}
              onTouchEnd={(e) => handleZoneTouchEnd('left', e)}
            />
            <div
              className="absolute top-16 bottom-24 right-0 w-1/4 md:w-1/3 z-20 cursor-pointer"
              onClick={(e) => handleZoneClick('right', e)}
              onTouchEnd={(e) => handleZoneTouchEnd('right', e)}
            />
            <div
              className="absolute top-16 bottom-24 left-1/4 md:left-1/3 right-1/4 md:right-1/3 z-10 cursor-pointer"
              onClick={(e) => handleZoneClick('center', e)}
              onTouchEnd={(e) => handleZoneTouchEnd('center', e)}
            />

            {/* Left Lateral Skip Indicator (Image 3) */}
            <div
              className={`absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-30 transition-all duration-300 ${
                areControlsVisible || leftIndicatorActive
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerSeek(-10);
                }}
                title="Reculer de 10 secondes (Double-tap gauche ou ←)"
                className={`w-12 h-12 md:w-14 md:h-14 rounded-full bg-neutral-900/85 hover:bg-neutral-800 border text-white flex items-center justify-center shadow-2xl backdrop-blur-md cursor-pointer transition-all duration-200 ${
                  leftIndicatorActive
                    ? 'scale-125 bg-neutral-800 border-sky-400 text-sky-400 ring-4 ring-sky-500/30'
                    : 'border-white/10 opacity-80 hover:opacity-100 hover:scale-105 active:scale-95'
                }`}
              >
                <ChevronLeft className="w-6 h-6 md:w-7 md:h-7" />
              </button>
            </div>

            {/* Right Lateral Skip Indicator (Image 3) */}
            <div
              className={`absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-30 transition-all duration-300 ${
                areControlsVisible || rightIndicatorActive
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerSeek(videoSkipForwardInterval);
                }}
                title={`Avancer de ${videoSkipForwardInterval} secondes (Double-tap droite ou →)`}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-full bg-neutral-900/85 hover:bg-neutral-800 border text-white flex items-center justify-center shadow-2xl backdrop-blur-md cursor-pointer transition-all duration-200 ${
                  rightIndicatorActive
                    ? 'scale-125 bg-neutral-800 border-sky-400 text-sky-400 ring-4 ring-sky-500/30'
                    : 'border-white/10 opacity-80 hover:opacity-100 hover:scale-105 active:scale-95'
                }`}
              >
                <ChevronRight className="w-6 h-6 md:w-7 md:h-7" />
              </button>
            </div>

            {/* Dynamic Time Badge (Image 2) */}
            <div
              className={`absolute ${
                isQueueOpen ? 'top-20 left-[360px] md:left-[430px]' : 'top-20 left-6 md:left-8'
              } z-40 transition-all duration-300 pointer-events-none ${
                isBadgeVisible && accumulatedDelta !== 0
                  ? 'opacity-100 scale-100 translate-y-0'
                  : 'opacity-0 scale-95 -translate-y-1'
              }`}
            >
              <div className="px-3.5 py-1.5 rounded-xl bg-neutral-900/90 backdrop-blur-md border border-white/10 shadow-2xl text-white font-mono text-sm md:text-base font-semibold tracking-wide flex items-center gap-2">
                <span>
                  {formatTime(currentTime)} / {formatTime(duration)} ({formatDelta(accumulatedDelta)})
                </span>
              </div>
            </div>

            {/* Floating Queue Panel (Image 1) */}
            {isQueueOpen && (
              <div
                className="absolute top-20 left-6 md:left-8 z-50 w-80 md:w-96 max-h-[70vh] bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200 select-none text-white"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Hidden file input for adding files */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="video/*,audio/*,.mp4,.mkv,.webm,.mov,.avi,.m4v,.mp3,.flac,.wav,.ogg,.m4a,.aac"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      onAddMediaToQueue?.(e.target.files);
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                />

                {/* Header / Actions toolbar inside panel */}
                <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 text-xs font-semibold text-neutral-200 hover:text-white transition-colors cursor-pointer"
                    title="Ajouter un fichier à la file d'attente"
                  >
                    <FolderPlus className="w-4 h-4 text-emerald-400" />
                    <span>Ajouter un fichier</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {onClearQueue && (
                      <button
                        type="button"
                        onClick={onClearQueue}
                        className="p-1.5 rounded-lg bg-neutral-800/70 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 border border-neutral-700/50 transition-colors cursor-pointer"
                        title="Vider la file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {onSaveQueueAsPlaylist && (
                      <button
                        type="button"
                        onClick={onSaveQueueAsPlaylist}
                        className="p-1.5 rounded-lg bg-neutral-800/70 hover:bg-neutral-700/80 text-neutral-400 hover:text-sky-300 border border-neutral-700/50 transition-colors cursor-pointer flex items-center gap-0.5"
                        title="Enregistrer comme playlist"
                      >
                        <PlusSquare className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3 text-neutral-500" />
                      </button>
                    )}

                    <button
                      type="button"
                      className="p-1.5 rounded-lg bg-neutral-800/70 text-neutral-400 hover:text-white border border-neutral-700/50 transition-colors cursor-pointer"
                      title="File de lecture"
                    >
                      <ListFilter className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Queue Items List */}
                <div className="flex-1 overflow-y-auto max-h-[50vh] flex flex-col gap-2 pr-1 custom-scrollbar">
                  {/* Current Playing Track */}
                  {currentTrack ? (
                    <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-neutral-800/80 border border-neutral-700/70 text-white shadow-sm">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex items-end gap-0.5 h-3.5 w-3 shrink-0">
                          <span className={`w-0.5 h-full rounded-full bg-sky-400 ${isPlaying ? 'animate-pulse' : ''}`} />
                          <span className={`w-0.5 h-2/3 rounded-full bg-sky-400 ${isPlaying ? 'animate-pulse [animation-delay:150ms]' : ''}`} />
                          <span className={`w-0.5 h-4/5 rounded-full bg-sky-400 ${isPlaying ? 'animate-pulse [animation-delay:300ms]' : ''}`} />
                        </div>
                        <Film className="w-4 h-4 text-sky-400 shrink-0" />
                        <span className="text-xs md:text-sm font-semibold truncate text-white">
                          {currentTrack.title}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-neutral-400 shrink-0">
                        {formatTime(currentTrack.duration || duration)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-neutral-500">
                      Aucun média en cours de lecture
                    </div>
                  )}

                  {/* Upcoming tracks in queue */}
                  {queue && queue.slice(currentTrackIndex + 1).length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 px-1">
                        À suivre ({queue.slice(currentTrackIndex + 1).length})
                      </span>

                      {queue.slice(currentTrackIndex + 1).map((track, i) => {
                        const realIdx = currentTrackIndex + 1 + i;
                        return (
                          <div
                            key={`${track.id}-${realIdx}`}
                            onClick={() => onSelectTrack?.(realIdx)}
                            className="group flex items-center justify-between gap-2.5 p-2 rounded-xl bg-neutral-950/40 hover:bg-neutral-800/60 border border-neutral-800/60 hover:border-neutral-700/60 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <Play className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white shrink-0 fill-current" />
                              <Film className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-400 shrink-0" />
                              <span className="text-xs text-neutral-300 group-hover:text-white truncate">
                                {track.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {onRemoveFromQueue && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveFromQueue(realIdx);
                                  }}
                                  className="p-1 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Retirer de la file"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <span className="text-[11px] font-mono text-neutral-500">
                                {formatTime(track.duration)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Top Bar: Title, Badge, Controls */}
            <div
              className={`absolute top-0 left-0 right-0 p-5 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between z-40 transition-opacity duration-300 ${
                areControlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 min-w-0 pr-4">
                {/* Minimize to PiP Chevron */}
                <button
                  type="button"
                  onClick={() => onSetVideoMode('pip')}
                  title="Réduire en lecteur flottant"
                  className="p-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/70 text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>

                {/* Queue / Playlist Access Button (Image 1) */}
                <button
                  type="button"
                  onClick={() => setIsQueueOpen((prev) => !prev)}
                  title="File d'attente"
                  className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                    isQueueOpen
                      ? 'bg-sky-500/20 text-sky-400 border-sky-500/50 shadow-lg shadow-sky-950/40'
                      : 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-700/70 text-neutral-300 hover:text-white'
                  }`}
                >
                  <ListVideo className="w-5 h-5" />
                </button>

                {/* Mode Marathon Quick Toggle Button (Étape 3) */}
                <button
                  type="button"
                  onClick={toggleMarathon}
                  title={
                    marathonConfig?.enabled
                      ? 'Mode Marathon activé (Transitions automatiques & Auto-skip) - Raccourci N'
                      : 'Activer le Mode Marathon (Transitions automatiques)'
                  }
                  className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                    marathonConfig?.enabled
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/30'
                      : 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-700/70 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Zap className={`w-5 h-5 ${marathonConfig?.enabled ? 'fill-current' : ''}`} />
                </button>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-bold text-base md:text-lg truncate">
                      {currentTrack?.title || 'Vidéo'}
                    </h2>
                    <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                      {currentTrack?.format || 'MP4'}
                      {currentTrack?.videoHeight ? ` ${currentTrack.videoHeight}p` : ''}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400 truncate">
                    {currentTrack?.artist || 'Lecteur Multimédia'} • {currentTrack?.album || 'Vidéos & Clips'}
                  </span>
                </div>
              </div>

              {/* Top Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Close Video (revert to audio only) */}
                <button
                  type="button"
                  onClick={() => onSetVideoMode('hidden')}
                  title="Fermer la vidéo (Écouter l'audio en arrière-plan)"
                  className="p-2 rounded-xl bg-neutral-900/80 hover:bg-red-950/80 hover:text-red-400 border border-neutral-700/70 text-neutral-300 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bouton d'action flottant "Passer l'opening" (Étape 2) */}
            <SkipOpeningButton
              isVisible={isSkipButtonVisible}
              interval={skipInterval}
              onSkip={skipOpening}
              autoSkipEnabled={!!autoSkipOpening}
              onToggleAutoSkip={(enabled) => onToggleAutoSkip?.(enabled)}
              autoSkippedToast={marathonToast}
            />

            {/* Overlay Compte à Rebours Mode Marathon (Étape 3) */}
            <MarathonCountdownOverlay
              isVisible={isCountdownActive}
              countdownRemaining={countdownRemaining}
              countdownTotal={countdownTotal}
              countdownProgress={countdownProgress}
              nextTrack={marathonNextTrack}
              nextEpisodeNumber={marathonNextEpNum}
              onPlayNext={triggerNextImmediately}
              onCancel={cancelCountdown}
              accent={accent}
            />

            {/* Bottom Controls Bar */}
            <div
              className={`absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-3 z-40 transition-opacity duration-300 ${
                areControlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress Scrubber */}
              <div className="relative group/scrubber flex items-center">
                {/* Repère visuel de l'opening détecté sur la timeline */}
                {skipInterval && duration > 0 && (
                  <div
                    className="absolute h-1.5 group-hover/scrubber:h-2.5 rounded-lg bg-sky-400/50 pointer-events-none z-10 transition-all shadow-xs"
                    style={{
                      left: `${Math.max(0, Math.min(100, (skipInterval.start / duration) * 100))}%`,
                      width: `${Math.max(0.5, Math.min(100, ((skipInterval.end - skipInterval.start) / duration) * 100))}%`,
                    }}
                    title={`Opening : ${formatTime(skipInterval.start)} - ${formatTime(skipInterval.end)}`}
                  />
                )}
                {/* Repère visuel de l'ending détecté sur la timeline (Étape 3) */}
                {markers?.ed && duration > 0 && (
                  <div
                    className="absolute h-1.5 group-hover/scrubber:h-2.5 rounded-lg bg-purple-400/50 pointer-events-none z-10 transition-all shadow-xs"
                    style={{
                      left: `${Math.max(0, Math.min(100, (markers.ed.start / duration) * 100))}%`,
                      width: `${Math.max(0.5, Math.min(100, ((markers.ed.end - markers.ed.start) / duration) * 100))}%`,
                    }}
                    title={`Ending : ${formatTime(markers.ed.start)} - ${formatTime(markers.ed.end)}`}
                  />
                )}
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => onSeek(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-neutral-700/80 hover:h-2.5 rounded-lg appearance-none cursor-pointer transition-all accent-sky-400"
                />
              </div>

              {/* Bottom Buttons Bar */}
              <div className="flex items-center justify-between gap-4">
                {/* Left: Playback controls & Timestamps */}
                <div className="flex items-center gap-3">
                  {/* Prev Track */}
                  <button
                    type="button"
                    onClick={onPrev}
                    className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Précédent"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  {/* Rewind 10s */}
                  <button
                    type="button"
                    onClick={() => triggerSeek(-10)}
                    className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Reculer de 10 secondes (Double-tap gauche ou ←)"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Play / Pause Primary */}
                  <button
                    type="button"
                    onClick={onTogglePlay}
                    className="p-3 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-transform shadow-lg cursor-pointer"
                    title={isPlaying ? 'Mettre en pause (Espace)' : 'Lire (Espace)'}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current translate-x-0.5" />
                    )}
                  </button>

                  {/* Forward */}
                  <button
                    type="button"
                    onClick={() => triggerSeek(videoSkipForwardInterval)}
                    className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title={`Avancer de ${videoSkipForwardInterval} secondes (Double-tap droite ou →)`}
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  {/* Next Track */}
                  <button
                    type="button"
                    onClick={onNext}
                    className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Suivant"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      type="button"
                      onClick={onToggleMute}
                      className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-red-400" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      className="w-20 md:w-24 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>

                  {/* Time indicator */}
                  <span className="text-xs font-mono text-neutral-300 ml-2">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Right: Speed, Fullscreen */}
                <div className="flex items-center gap-2">
                  {/* Playback Speed Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsSpeedMenuOpen((prev) => !prev)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                      title="Vitesse de lecture"
                    >
                      <Gauge className="w-3.5 h-3.5 text-amber-400" />
                      <span>{playbackSpeed}x</span>
                    </button>

                    {isSpeedMenuOpen && (
                      <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/95 border border-neutral-700 rounded-xl shadow-2xl p-1 flex flex-col gap-0.5 z-50 min-w-[80px]">
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleSpeedSelect(s)}
                            className={`px-3 py-1.5 text-xs font-mono text-left rounded-lg transition-colors cursor-pointer ${
                              playbackSpeed === s
                                ? 'bg-sky-500/20 text-sky-400 font-bold'
                                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                            }`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Browser Fullscreen */}
                  <button
                    type="button"
                    onClick={toggleBrowserFullscreen}
                    className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Plein écran (F)"
                  >
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/* FLOATING MINI-PLAYER (PiP) OVERLAYS                          */}
        {/* ============================================================ */}
        {videoMode === 'pip' && (
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 p-2.5 flex flex-col justify-between transition-opacity duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar inside PiP */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-white truncate max-w-[190px]">
                {currentTrack?.title}
              </span>
              <div className="flex items-center gap-1">
                {/* Maximize to Theater */}
                <button
                  type="button"
                  onClick={() => onSetVideoMode('theater')}
                  title="Agrandir en mode cinéma"
                  className="p-1 rounded-md bg-black/60 hover:bg-neutral-800 text-white cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                {/* Native Browser PiP */}
                <button
                  type="button"
                  onClick={handleNativePiP}
                  title="Sortir en fenêtre flottante OS"
                  className="p-1 rounded-md bg-black/60 hover:bg-neutral-800 text-white cursor-pointer"
                >
                  <PictureInPicture className="w-3.5 h-3.5" />
                </button>
                {/* Close/Hide Video */}
                <button
                  type="button"
                  onClick={() => onSetVideoMode('hidden')}
                  title="Fermer la vidéo (Écouter l'audio)"
                  className="p-1 rounded-md bg-black/60 hover:bg-red-900/80 text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bottom Controls inside PiP */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onTogglePlay}
                className="p-1.5 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />}
              </button>
              <button
                type="button"
                onClick={onToggleMute}
                className="p-1 rounded-md bg-black/60 hover:bg-neutral-800 text-white cursor-pointer"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <span className="text-[10px] font-mono text-neutral-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

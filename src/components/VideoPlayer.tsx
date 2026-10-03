import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Maximize2,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  PictureInPicture,
  X,
  Gauge,
  Tv,
  Film,
  Sparkles,
} from 'lucide-react';
import { Track, AccentColor } from '../types';

export type VideoDisplayMode = 'theater' | 'pip' | 'hidden';
export type VideoAspectRatio = 'contain' | 'cover' | '16-9';

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
}) => {
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('contain');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [clickAnim, setClickAnim] = useState<'play' | 'pause' | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

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

  // Auto-hide controls in theater mode when mouse is idle
  useEffect(() => {
    if (videoMode !== 'theater' || !isPlaying) {
      setAreControlsVisible(true);
      return;
    }

    const resetTimer = () => {
      setAreControlsVisible(true);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = setTimeout(() => {
        if (isPlaying && !isSpeedMenuOpen) {
          setAreControlsVisible(false);
        }
      }, 2500);
    };

    const handleMouseMove = () => resetTimer();
    window.addEventListener('mousemove', handleMouseMove);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [videoMode, isPlaying, isSpeedMenuOpen]);

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
        onTogglePlay();
        triggerClickAnim(isPlaying ? 'pause' : 'play');
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        onSeek(Math.max(0, currentTime - 5));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        onSeek(Math.min(duration, currentTime + 5));
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        onVolumeChange(Math.min(1, volume + 0.05));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        onVolumeChange(Math.max(0, volume - 0.05));
      } else if (e.key === 'm' || e.key === 'M') {
        onToggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleBrowserFullscreen();
      } else if (e.key === 'Escape') {
        onSetVideoMode('pip');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoMode, isPlaying, currentTime, duration, volume, onTogglePlay, onSeek, onVolumeChange, onToggleMute, onSetVideoMode]);

  const triggerClickAnim = (type: 'play' | 'pause') => {
    setClickAnim(type);
    setTimeout(() => setClickAnim(null), 500);
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePlay();
    triggerClickAnim(isPlaying ? 'pause' : 'play');
  };

  const handleVideoDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoMode === 'theater') {
      toggleBrowserFullscreen();
    } else {
      onSetVideoMode('theater');
    }
  };

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
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

  const cycleAspectRatio = () => {
    if (aspectRatio === 'contain') setAspectRatio('cover');
    else if (aspectRatio === 'cover') setAspectRatio('16-9');
    else setAspectRatio('contain');
  };

  // If there's no track or it's not a video, keep the video element mounted but off-screen
  const isHidden = !isVideo || videoMode === 'hidden';

  // Video object-fit style
  const videoObjectFitClass =
    aspectRatio === 'cover'
      ? 'object-cover'
      : aspectRatio === '16-9'
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
        className="relative w-full h-full flex items-center justify-center bg-black cursor-pointer overflow-hidden"
        onClick={handleVideoClick}
        onDoubleClick={handleVideoDoubleClick}
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
            {/* Top Bar: Title, Badge, Controls */}
            <div
              className={`absolute top-0 left-0 right-0 p-5 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between z-40 transition-opacity duration-300 ${
                areControlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <div className="p-2 rounded-xl bg-sky-950/80 border border-sky-500/30 text-sky-400 shrink-0">
                  <Film className="w-5 h-5" />
                </div>
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
                {/* Native Picture in Picture */}
                <button
                  type="button"
                  onClick={handleNativePiP}
                  title="Image dans l'image (Fenêtre flottante OS)"
                  className="p-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/70 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <PictureInPicture className="w-4 h-4" />
                </button>

                {/* Switch to Floating Mini Player */}
                <button
                  type="button"
                  onClick={() => onSetVideoMode('pip')}
                  title="Réduire en lecteur flottant"
                  className="p-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/70 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Minimize className="w-4 h-4" />
                </button>

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

            {/* Bottom Controls Bar */}
            <div
              className={`absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-3 z-40 transition-opacity duration-300 ${
                areControlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress Scrubber */}
              <div className="relative group/scrubber flex items-center">
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
                    onClick={() => onSeek(Math.max(0, currentTime - 10))}
                    className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Reculer de 10 secondes"
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

                  {/* Forward 10s */}
                  <button
                    type="button"
                    onClick={() => onSeek(Math.min(duration, currentTime + 10))}
                    className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Avancer de 10 secondes"
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

                {/* Right: Aspect ratio, Speed, Fullscreen */}
                <div className="flex items-center gap-2">
                  {/* Aspect ratio switch */}
                  <button
                    type="button"
                    onClick={cycleAspectRatio}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Changer le ratio d'affichage (Ajuster / Remplir / 16:9)"
                  >
                    <Tv className="w-3.5 h-3.5 text-sky-400" />
                    <span className="uppercase text-[11px]">{aspectRatio}</span>
                  </button>

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

                  {/* Native Picture in Picture */}
                  <button
                    type="button"
                    onClick={handleNativePiP}
                    className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Mode Image dans l'image"
                  >
                    <PictureInPicture className="w-4 h-4" />
                  </button>

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

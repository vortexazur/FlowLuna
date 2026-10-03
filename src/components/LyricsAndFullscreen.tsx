import React, { useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Shuffle,
  Repeat,
  Repeat1,
  Maximize2,
  Minimize2,
  Music,
} from 'lucide-react';
import { Track, AccentColor, PlayerSettings } from '../types';
import { AudioVisualizer } from './AudioVisualizer';

interface LyricsAndFullscreenProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStop?: () => void;
  onPrev: () => void;
  onNext: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  shuffle: boolean;
  onToggleShuffle: () => void;
  repeatMode: 'off' | 'all' | 'one';
  onCycleRepeat: () => void;
  accent: AccentColor;
  settings: PlayerSettings;
}

const ACCENT_TEXT: Record<AccentColor, string> = {
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  cyan: 'text-cyan-400',
};

const ACCENT_BG: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 text-neutral-950',
  violet: 'bg-violet-500 text-white',
  blue: 'bg-blue-500 text-white',
  amber: 'bg-amber-500 text-neutral-950',
  rose: 'bg-rose-500 text-white',
  cyan: 'bg-cyan-500 text-neutral-950',
};

const ACCENT_RANGE: Record<AccentColor, string> = {
  emerald: 'accent-emerald-500',
  violet: 'accent-violet-500',
  blue: 'accent-blue-500',
  amber: 'accent-amber-500',
  rose: 'accent-rose-500',
  cyan: 'accent-cyan-500',
};

export const LyricsAndFullscreen: React.FC<LyricsAndFullscreenProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  onTogglePlay,
  onStop,
  onPrev,
  onNext,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  isFavorite,
  onToggleFavorite,
  shuffle,
  onToggleShuffle,
  repeatMode,
  onCycleRepeat,
  accent,
  settings,
}) => {
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentTrack) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const lyrics = currentTrack.lyrics || [
    '[00:00.00] ♪ Écoute haute fidélité sans latence ♪',
    '[00:15.00] Profitez de votre musique préférée avec un rendu audio cristallin',
    '[00:30.00] Optimisation mémoire et égalisation matérielle 10 bandes',
    '[00:50.00] Synchronisé automatiquement sur vos appareils',
  ];

  // Estimate active lyric index
  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const activeLyricIndex = Math.min(
    lyrics.length - 1,
    Math.max(0, Math.floor(progressRatio * lyrics.length))
  );

  return (
    <div
      id="fullscreen-lyrics-modal"
      className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-xl flex flex-col text-neutral-100 p-6 md:p-10 select-none overflow-hidden"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
            Mode Plein Écran & Paroles
          </span>
          <span className="text-xs font-mono text-neutral-400">
            {currentTrack.format.toUpperCase()} • {currentTrack.bitrate || 320} kbps
          </span>
        </div>

        <button
          type="button"
          id="fullscreen-close-btn"
          onClick={onClose}
          className="p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          title="Fermer (Échap)"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Center Layout: Left Album Art & Visualizer, Right Lyrics */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-center my-6 overflow-hidden">
        {/* Left Side: Artwork & Visualizer */}
        <div className="flex flex-col items-center justify-center gap-6 h-full">
          <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800/80 group">
            <img
              src={
                currentTrack.coverUrl ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
              }
              alt={currentTrack.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Subtle glow overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-xl font-bold truncate text-white drop-shadow-md">{currentTrack.title}</h2>
              <p className="text-sm text-neutral-300 truncate drop-shadow-sm">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Integrated Real-time Canvas Visualizer */}
          <div className="w-64 md:w-80 h-16 rounded-xl bg-neutral-900/60 border border-neutral-800/80 p-2 overflow-hidden">
            <AudioVisualizer
              isPlaying={isPlaying}
              style={settings.visualizerStyle}
              accent={accent}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Right Side: Lyrics Panel */}
        <div
          ref={lyricsContainerRef}
          className="flex flex-col gap-4 overflow-y-auto max-h-[60vh] md:max-h-[70vh] px-4 py-8 rounded-2xl bg-neutral-900/30 border border-neutral-800/50"
        >
          <span className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-2">
            Paroles Synchronisées
          </span>
          {lyrics.map((line, idx) => {
            const isCurrent = idx === activeLyricIndex;
            return (
              <p
                key={idx}
                className={`text-lg md:text-2xl font-bold transition-all duration-300 cursor-pointer ${
                  isCurrent
                    ? `${ACCENT_TEXT[accent]} scale-102 translate-x-1 drop-shadow-lg`
                    : 'text-neutral-500 hover:text-neutral-300 opacity-60'
                }`}
                onClick={() => {
                  const targetSec = (idx / lyrics.length) * duration;
                  onSeek(targetSec);
                }}
              >
                {line.replace(/\[\d{2}:\d{2}\.\d{2}\]/g, '').trim()}
              </p>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 z-10 bg-neutral-900/80 p-4 rounded-2xl border border-neutral-800/80">
        {/* Seek Bar */}
        <div className="flex items-center gap-3 w-full text-xs font-mono text-neutral-400">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className={`w-full h-1.5 bg-neutral-800 rounded-lg cursor-pointer ${ACCENT_RANGE[accent]}`}
          />
          <span>{formatTime(duration)}</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleFavorite}
              className={`p-2 rounded-full hover:bg-neutral-800 transition-colors ${
                isFavorite ? 'text-rose-500 fill-current' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onToggleShuffle}
              className={`p-2 rounded-full hover:bg-neutral-800 transition-colors ${
                shuffle ? ACCENT_TEXT[accent] : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Shuffle className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onPrev}
              className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
            >
              <SkipBack className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              className={`p-4 rounded-full shadow-xl transition-transform hover:scale-105 active:scale-95 ${ACCENT_BG[accent]}`}
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
            </button>

            {onStop && (
              <button
                type="button"
                onClick={onStop}
                className="p-3 text-neutral-300 hover:text-red-400 hover:bg-neutral-800 rounded-full transition-colors active:scale-95"
                title="Arrêter totalement la musique (Stop)"
              >
                <Square className="w-5 h-5 fill-current" />
              </button>
            )}

            <button
              type="button"
              onClick={onNext}
              className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCycleRepeat}
              className={`p-2 rounded-full hover:bg-neutral-800 transition-colors ${
                repeatMode !== 'off' ? ACCENT_TEXT[accent] : 'text-neutral-400 hover:text-white'
              }`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleMute}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className={`w-20 h-1 bg-neutral-800 rounded-lg cursor-pointer ${ACCENT_RANGE[accent]}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

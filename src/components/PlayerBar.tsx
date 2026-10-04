import React from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  ListMusic,
  Maximize2,
  CheckCircle2,
  Activity,
  FileText,
  PictureInPicture2,
  Sliders,
  SlidersHorizontal,
  Scissors,
  Film,
} from 'lucide-react';
import { Track, AccentColor, PlayerSettings } from '../types';
import { AudioVisualizer } from './AudioVisualizer';
import { getT } from '../i18n';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
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
  onOpenQueue?: () => void;
  queueLength?: number;
  onOpenEqualizer?: () => void;
  onToggleFullscreen: () => void;
  onToggleMiniPlayer?: () => void;
  onOpenDetachedPip?: () => void;
  isDetachedPipActive?: boolean;
  onToggleVideo?: () => void;
  isVideoModeActive?: boolean;
  accent: AccentColor;
  settings: PlayerSettings;
  onUpdateSettings?: (newSettings: PlayerSettings) => void;
  onOpenTrimmer?: (track: Track) => void;
}

const ACCENT_BG: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400',
  violet: 'bg-violet-500 text-white hover:bg-violet-400',
  blue: 'bg-blue-500 text-white hover:bg-blue-400',
  amber: 'bg-amber-500 text-neutral-950 hover:bg-amber-400',
  rose: 'bg-rose-500 text-white hover:bg-rose-400',
  cyan: 'bg-cyan-500 text-neutral-950 hover:bg-cyan-400',
};

const ACCENT_TEXT: Record<AccentColor, string> = {
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  cyan: 'text-cyan-400',
};

const ACCENT_RANGE: Record<AccentColor, string> = {
  emerald: 'accent-emerald-500',
  violet: 'accent-violet-500',
  blue: 'accent-blue-500',
  amber: 'accent-amber-500',
  rose: 'accent-rose-500',
  cyan: 'accent-cyan-500',
};

export const PlayerBar: React.FC<PlayerBarProps> = ({
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
  onOpenQueue,
  queueLength,
  onOpenEqualizer,
  onToggleFullscreen,
  onToggleMiniPlayer,
  onOpenDetachedPip,
  isDetachedPipActive,
  onToggleVideo,
  isVideoModeActive,
  accent,
  settings,
  onUpdateSettings,
  onOpenTrimmer,
}) => {
  const t = getT(settings?.language);
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleVisualizerStyleChange = (newStyle: 'bars' | 'wave' | 'circle' | 'minimal' | 'pillars') => {
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        visualizerStyle: newStyle,
      });
    }
  };

  const STYLE_LABELS: Record<string, string> = {
    bars: 'Spectre',
    wave: 'Onde',
    pillars: 'Piliers',
    circle: 'Radar',
    minimal: 'LEDs',
  };

  return (
    <footer
      id="desktop-player-bar"
      className="h-24 w-full bg-neutral-950/95 glass-player backdrop-blur-md border-t border-neutral-800/80 px-4 md:px-6 flex items-center justify-between gap-4 select-none z-30 flex-shrink-0"
    >
      {/* Left: Track Details */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-[200px] max-w-xs">
        {currentTrack ? (
          <>
            <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-md flex-shrink-0 bg-neutral-900 border border-neutral-800 group">
              <img
                src={
                  currentTrack.coverUrl ||
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
                }
                alt={currentTrack.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={currentTrack.isVideo && onToggleVideo ? onToggleVideo : onToggleFullscreen}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                title={currentTrack.isVideo ? "Ouvrir le lecteur vidéo" : "Plein écran & Paroles"}
              >
                {currentTrack.isVideo ? <Film className="w-4 h-4 text-sky-400" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-xs font-bold text-neutral-100 truncate hover:underline cursor-pointer"
                  onClick={currentTrack.isVideo && onToggleVideo ? onToggleVideo : onToggleFullscreen}
                >
                  {currentTrack.title}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate">{currentTrack.artist}</p>

              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded ${
                  currentTrack.isVideo ? 'bg-sky-950 text-sky-300 border border-sky-500/30' : 'bg-neutral-800 text-neutral-300'
                }`}>
                  {currentTrack.isVideo ? `🎥 ${currentTrack.format}` : currentTrack.format}
                </span>
                {currentTrack.isCachedOffline && (
                  <span
                    className="text-[9px] text-emerald-400 flex items-center gap-0.5 font-medium"
                    title="Stocké dans le cache hors-ligne"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Hors-ligne
                  </span>
                )}
                {isPlaying && (
                  <span className="text-[9px] text-neutral-400 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Audio Réel
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                id="player-favorite-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className={`p-2 rounded-full transition-all duration-200 active:scale-90 hover:scale-110 ${
                  isFavorite
                    ? 'text-rose-500 hover:text-rose-400 bg-rose-500/15'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
                title={isFavorite ? 'Retirer des favoris (L)' : 'Ajouter aux favoris (L)'}
                aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Heart
                  className={`w-4 h-4 transition-all duration-200 ${
                    isFavorite ? 'fill-rose-500 text-rose-500 scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]' : ''
                  }`}
                />
              </button>

              {onOpenTrimmer && (
                <button
                  type="button"
                  id="player-trim-btn"
                  onClick={() => onOpenTrimmer(currentTrack)}
                  className="p-1.5 rounded-full text-neutral-500 hover:text-sky-400 hover:bg-neutral-800 transition-all hover:scale-110"
                  title="Découper / Éditer cette piste audio (Rognage, Fondus, Extrait)"
                >
                  <Scissors className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 text-neutral-500 text-xs">
            <div className="w-14 h-14 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <Activity className="w-5 h-5 opacity-40" />
            </div>
            <span>{t.selectTrack}</span>
          </div>
        )}
      </div>

      {/* Center: Playback Controls, Spectrum Soundwave & Timeline */}
      <div className="flex flex-col items-center gap-1.5 flex-1 max-w-2xl px-2">
        {/* Buttons Row */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            id="player-shuffle-btn"
            onClick={onToggleShuffle}
            className={`p-1.5 rounded-full transition-colors ${
              shuffle ? ACCENT_TEXT[accent] : 'text-neutral-400 hover:text-white'
            }`}
            title={`${t.shuffle} (S)`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            type="button"
            id="player-prev-btn"
            onClick={onPrev}
            className="p-1.5 text-neutral-300 hover:text-white transition-colors"
            title={`${t.previous} (P / ←)`}
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            type="button"
            id="player-play-pause-btn"
            onClick={onTogglePlay}
            className={`p-2.5 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${ACCENT_BG[accent]}`}
            title={isPlaying ? `${t.pause} (Espace)` : `${t.play} (Espace)`}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            id="player-stop-btn"
            onClick={onStop}
            disabled={!currentTrack && currentTime === 0}
            className={`p-2 rounded-full transition-all active:scale-95 ${
              currentTrack
                ? 'text-neutral-300 hover:text-red-400 hover:bg-neutral-800'
                : 'text-neutral-600 cursor-not-allowed opacity-40'
            }`}
            title={`${t.stop} (X)`}
          >
            <Square className="w-4.5 h-4.5 fill-current" />
          </button>

          <button
            type="button"
            id="player-next-btn"
            onClick={onNext}
            className="p-1.5 text-neutral-300 hover:text-white transition-colors"
            title="Titre suivant (N ou →)"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            type="button"
            id="player-repeat-btn"
            onClick={onCycleRepeat}
            className={`p-1.5 rounded-full transition-colors ${
              repeatMode !== 'off' ? ACCENT_TEXT[accent] : 'text-neutral-400 hover:text-white'
            }`}
            title={`Répétition : ${repeatMode} (R)`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Seek Bar with background Frequency Spectrum waveform & Timestamps */}
        <div className="flex items-center gap-3 w-full text-[11px] font-mono text-neutral-400 relative">
          <span className="w-10 text-right">{formatTime(currentTime)}</span>
          <div className="relative flex-1 flex items-center h-4">
            {/* Real-time spectrum reactive backdrop when playing */}
            <div className="absolute inset-0 opacity-25 pointer-events-none overflow-hidden rounded">
              <AudioVisualizer
                isPlaying={isPlaying}
                style="bars"
                accent={accent}
                barCount={48}
                showPeaks={false}
                className="w-full h-full"
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className={`w-full h-1.5 bg-neutral-800/80 relative z-10 rounded-lg cursor-pointer ${ACCENT_RANGE[accent]}`}
            />
          </div>
          <span className="w-10 text-left">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Controls, Queue, Equalizer, Mini-Players & Volume */}
      <div className="flex items-center justify-end gap-1.5 md:gap-2 w-1/4 min-w-[200px]">
        {/* Lecteur Vidéo */}
        {currentTrack?.isVideo && onToggleVideo && (
          <button
            type="button"
            id="player-video-btn"
            onClick={onToggleVideo}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isVideoModeActive
                ? 'text-sky-400 bg-sky-950/80 border border-sky-500/40 shadow-sm'
                : 'text-sky-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Lecteur Vidéo (Mode Cinéma & Flottant)"
          >
            <Film className="w-4 h-4" />
          </button>
        )}



        {/* Paroles & Plein écran */}
        <button
          type="button"
          id="player-lyrics-btn"
          onClick={onToggleFullscreen}
          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Paroles synchronisées & Plein écran (F)"
        >
          <FileText className="w-4 h-4" />
        </button>

        {/* Mode Détachable Always-on-Top / Picture-in-Picture */}
        {onOpenDetachedPip && (
          <button
            type="button"
            id="player-pip-btn"
            onClick={onOpenDetachedPip}
            className={`p-2 rounded-lg transition-colors ${
              isDetachedPipActive
                ? 'text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800'
            }`}
            title="Mode Mini-Lecteur Détachable (Always-on-Top au-dessus de vos jeux & applications)"
          >
            <PictureInPicture2 className="w-4 h-4" />
          </button>
        )}

        {/* Volume Controls & Normalization */}
        <div className="flex items-center gap-1.5 ml-1">
          {settings && onUpdateSettings && (
            <button
              type="button"
              id="player-volume-norm-btn"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  volumeNormalization: !settings.volumeNormalization,
                })
              }
              className={`p-1.5 rounded-lg transition-colors text-xs ${
                settings.volumeNormalization
                  ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30'
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
              }`}
              title={
                settings.volumeNormalization
                  ? 'Harmonisation du volume active : tous les morceaux jouent au même niveau sonore (cliquer pour désactiver)'
                  : 'Harmonisation du volume désactivée (cliquer pour harmoniser le son de toutes les musiques)'
              }
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            id="player-mute-btn"
            onClick={onToggleMute}
            className="p-1 text-neutral-400 hover:text-white transition-colors"
            title="Muet / Activer le son (M)"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className={`w-16 lg:w-20 h-1.5 bg-neutral-800 rounded-lg cursor-pointer ${ACCENT_RANGE[accent]}`}
          />
        </div>
      </div>
    </footer>
  );
};

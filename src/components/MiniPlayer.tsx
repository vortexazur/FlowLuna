import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Heart,
  ListPlus,
  Plus,
  Check,
  Activity,
  PictureInPicture2,
  ArrowUpToLine,
  ArrowDownToLine,
  Move,
  GripHorizontal,
  Eye,
  EyeOff,
  X,
  Layers,
} from 'lucide-react';
import { Track, Playlist, AccentColor, PlayerSettings, CompactPlayerDock } from '../types';
import { AudioVisualizer } from './AudioVisualizer';

interface MiniPlayerProps {
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
  onRestore: () => void;
  onDetachPip?: () => void;
  accent: AccentColor;
  playlists?: Playlist[];
  onAddToPlaylist?: (playlistId: string, trackId: string) => void;
  onCreatePlaylist?: () => void;
  settings?: PlayerSettings;
  onUpdateSettings?: (newSettings: PlayerSettings) => void;
  isAppMinimized?: boolean;
  onToggleMinimizeApp?: () => void;
}

const ACCENT_BG: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white font-bold',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white font-bold',
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold',
  rose: 'bg-rose-500 hover:bg-rose-400 text-white font-bold',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold',
};

const ACCENT_BORDER: Record<AccentColor, string> = {
  emerald: 'border-emerald-500/40 text-emerald-400',
  violet: 'border-violet-500/40 text-violet-400',
  blue: 'border-blue-500/40 text-blue-400',
  amber: 'border-amber-500/40 text-amber-400',
  rose: 'border-rose-500/40 text-rose-400',
  cyan: 'border-cyan-500/40 text-cyan-400',
};

const ACCENT_PROGRESS: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500',
  violet: 'bg-violet-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  cyan: 'bg-cyan-500',
};

const ACCENT_RANGE: Record<AccentColor, string> = {
  emerald: 'accent-emerald-500',
  violet: 'accent-violet-500',
  blue: 'accent-blue-500',
  amber: 'accent-amber-500',
  rose: 'accent-rose-500',
  cyan: 'accent-cyan-500',
};

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
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
  onRestore,
  onDetachPip,
  accent,
  playlists = [],
  onAddToPlaylist,
  onCreatePlaylist,
  settings,
  onUpdateSettings,
  isAppMinimized = false,
  onToggleMinimizeApp,
}) => {
  // 1. Persistent Docking Mode: 'bottom' | 'top' | 'floating'
  const [dockMode, setDockMode] = useState<CompactPlayerDock>(() => {
    if (settings?.compactPlayerDock) return settings.compactPlayerDock;
    const saved = localStorage.getItem('aurawave_compact_dock');
    if (saved === 'top' || saved === 'bottom' || saved === 'floating') return saved;
    return 'bottom';
  });

  // 2. Persistent Ghost / Transparency Mode
  const [isGhostMode, setIsGhostMode] = useState<boolean>(() => {
    if (typeof settings?.compactPlayerGhost === 'boolean') return settings.compactPlayerGhost;
    return localStorage.getItem('aurawave_compact_ghost') === 'true';
  });

  // 3. Floating Widget Drag Position
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('aurawave_floating_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    const defaultX = typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 380) : 100;
    const defaultY = typeof window !== 'undefined' ? Math.max(16, window.innerHeight - 200) : 100;
    return { x: defaultX, y: defaultY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Playlist menu dropdown
  const [isPlaylistMenuOpen, setIsPlaylistMenuOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Time formatter
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Change dock mode and persist
  const handleSetDockMode = (newMode: CompactPlayerDock) => {
    setDockMode(newMode);
    localStorage.setItem('aurawave_compact_dock', newMode);
    if (onUpdateSettings && settings) {
      onUpdateSettings({ ...settings, compactPlayerDock: newMode });
    }
  };

  // Toggle Ghost mode and persist
  const handleToggleGhostMode = () => {
    const next = !isGhostMode;
    setIsGhostMode(next);
    localStorage.setItem('aurawave_compact_ghost', String(next));
    if (onUpdateSettings && settings) {
      onUpdateSettings({ ...settings, compactPlayerGhost: next });
    }
  };

  // Handle Dragging in Floating Mode
  const handlePointerDown = (e: React.PointerEvent) => {
    if (dockMode !== 'floating') return;
    // Don't drag if clicking buttons, sliders, or inputs
    const target = e.target as HTMLElement;
    if (['BUTTON', 'INPUT', 'A'].includes(target.tagName) || target.closest('button') || target.closest('input')) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: floatingPos.x,
      startY: floatingPos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || dockMode !== 'floating') return;
    const deltaX = e.clientX - dragStartRef.current.mouseX;
    const deltaY = e.clientY - dragStartRef.current.mouseY;

    const widgetWidth = 340;
    const widgetHeight = 160;
    const maxX = Math.max(0, window.innerWidth - widgetWidth - 10);
    const maxY = Math.max(0, window.innerHeight - widgetHeight - 10);

    const nextX = Math.min(maxX, Math.max(10, dragStartRef.current.startX + deltaX));
    const nextY = Math.min(maxY, Math.max(10, dragStartRef.current.startY + deltaY));

    setFloatingPos({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    localStorage.setItem('aurawave_floating_pos', JSON.stringify(floatingPos));
  };

  // Corner Snap Helpers
  const handleSnapCorner = (corner: 'tl' | 'tr' | 'bl' | 'br') => {
    const margin = 20;
    const w = 340;
    const h = 160;
    let next = { x: 20, y: 20 };
    if (corner === 'tr') {
      next = { x: window.innerWidth - w - margin, y: margin };
    } else if (corner === 'bl') {
      next = { x: margin, y: window.innerHeight - h - margin };
    } else if (corner === 'br') {
      next = { x: window.innerWidth - w - margin, y: window.innerHeight - h - margin };
    }
    setFloatingPos(next);
    localStorage.setItem('aurawave_floating_pos', JSON.stringify(next));
  };

  // Close playlist dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsPlaylistMenuOpen(false);
      }
    };
    if (isPlaylistMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPlaylistMenuOpen]);

  const handleAddTrack = (playlistId: string, playlistTitle: string) => {
    if (onAddToPlaylist && currentTrack) {
      onAddToPlaylist(playlistId, currentTrack.id);
      setFeedbackMessage(`Ajouté à "${playlistTitle}"`);
      setIsPlaylistMenuOpen(false);
      setTimeout(() => setFeedbackMessage(null), 2500);
    }
  };

  const customPlaylists = playlists.filter((p) => !p.isSmart);

  // Click on progress bar to seek
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  // =========================================================================
  // RENDER DOCKED MINI-BAR (TOP OR BOTTOM)
  // =========================================================================
  if (dockMode === 'top' || dockMode === 'bottom') {
    const isTop = dockMode === 'top';
    return (
      <aside
        id="aurawave-docked-minibar"
        role="region"
        aria-label="Barre d'écoute compacte d'appoint"
        className={`fixed left-0 right-0 z-[100] h-11 w-full bg-neutral-950/95 backdrop-blur-md text-white select-none transition-all duration-200 flex items-center justify-between px-3 gap-3 ${
          isTop
            ? 'top-0 border-b border-neutral-800 shadow-xl animate-in slide-in-from-top-3'
            : 'bottom-0 border-t border-neutral-800 shadow-2xl animate-in slide-in-from-bottom-3'
        } ${isGhostMode ? 'opacity-65 hover:opacity-100 hover:shadow-emerald-500/10' : 'opacity-100'}`}
      >
        {/* Seamless Ultra-fine Interactive Progress Bar along the docked edge */}
        <div
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration || 100}
          aria-valuenow={currentTime}
          tabIndex={0}
          onClick={handleProgressClick}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 5));
            if (e.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 5));
          }}
          className={`absolute left-0 right-0 cursor-pointer group z-20 ${
            isTop ? 'bottom-0 h-1 hover:h-2' : 'top-0 h-1 hover:h-2'
          } bg-neutral-800/80 transition-all`}
          title={`Progression : ${formatTime(currentTime)} / ${formatTime(duration)} (Cliquer pour naviguer)`}
        >
          <div
            className={`h-full ${ACCENT_PROGRESS[accent]} transition-[width] duration-150 relative`}
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 group-hover:opacity-100 shadow-sm transition-opacity" />
          </div>
        </div>

        {/* Left: Artwork + Track details + Favorite */}
        <div className="flex items-center gap-2.5 min-w-0 max-w-[280px] lg:max-w-xs flex-shrink-0">
          {/* Artwork */}
          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 flex-shrink-0 shadow-sm">
            {currentTrack ? (
              <img
                src={
                  currentTrack.coverUrl ||
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
                }
                alt={currentTrack.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-600">
                <Activity className="w-4 h-4 opacity-50" />
              </div>
            )}
            {isPlaying && (
              <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>

          {/* Title & Artist */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="text-xs font-bold text-neutral-100 truncate block cursor-pointer hover:underline"
                onClick={onRestore}
                title={currentTrack ? `${currentTrack.title} - ${currentTrack.artist}` : 'FlowLuna'}
              >
                {currentTrack ? currentTrack.title : 'Aucun titre'}
              </span>
              {currentTrack?.format && (
                <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-neutral-800/80 text-neutral-400 flex-shrink-0 border border-neutral-700/50">
                  {currentTrack.format}
                </span>
              )}
            </div>
            <p className="text-[10px] text-neutral-400 truncate">
              {currentTrack ? currentTrack.artist : 'Lecteur en attente'}
            </p>
          </div>

          {/* Favorite Button */}
          {currentTrack && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className={`p-1 rounded-md transition-colors ${
                isFavorite ? 'text-rose-500 fill-current' : 'text-neutral-500 hover:text-white'
              }`}
              title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500' : ''}`} />
            </button>
          )}

          {/* Add to Playlist button */}
          {currentTrack && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsPlaylistMenuOpen(!isPlaylistMenuOpen)}
                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Ajouter à une playlist"
              >
                <ListPlus className="w-3.5 h-3.5" />
              </button>

              {isPlaylistMenuOpen && (
                <div
                  className={`absolute left-0 z-50 w-56 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 text-left animate-in fade-in ${
                    isTop ? 'top-10' : 'bottom-10'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                    Ajouter à une playlist
                  </div>

                  {customPlaylists.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-neutral-500 text-center">
                      Aucune playlist
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto flex flex-col gap-0.5">
                      {customPlaylists.map((pl) => {
                        const isAlreadyIn = pl.trackIds.includes(currentTrack.id);
                        return (
                          <button
                            key={pl.id}
                            type="button"
                            onClick={() => handleAddTrack(pl.id, pl.title)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-neutral-800 text-neutral-200 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                          >
                            <span className="truncate">{pl.title}</span>
                            {isAlreadyIn && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {onCreatePlaylist && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlaylistMenuOpen(false);
                        onCreatePlaylist();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-neutral-800 text-sky-400 font-semibold flex items-center gap-1.5 border-t border-neutral-800 mt-1 pt-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nouvelle playlist...</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Playback Controls + Time + Mini Real-Time Spectrum Visualizer */}
        <div className="flex items-center gap-2.5 lg:gap-3.5 flex-shrink-0">
          <button
            type="button"
            onClick={onPrev}
            className="p-1 text-neutral-400 hover:text-white rounded-md transition-colors cursor-pointer"
            title="Piste précédente (P)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className={`p-1.5 rounded-full shadow-md transition-transform active:scale-95 cursor-pointer ${ACCENT_BG[accent]}`}
            title={isPlaying ? 'Pause (Espace)' : 'Lecture (Espace)'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          {onStop && (
            <button
              type="button"
              onClick={onStop}
              disabled={!currentTrack && currentTime === 0}
              className={`p-1 rounded-md transition-colors ${
                currentTrack
                  ? 'text-neutral-400 hover:text-red-400 hover:bg-neutral-800/80 cursor-pointer'
                  : 'text-neutral-700 cursor-not-allowed opacity-30'
              }`}
              title="Arrêter la lecture (X)"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          <button
            type="button"
            onClick={onNext}
            className="p-1 text-neutral-400 hover:text-white rounded-md transition-colors cursor-pointer"
            title="Piste suivante (N)"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Time Display */}
          <span className="text-[10px] font-mono text-neutral-400 min-w-[65px] text-center select-none hidden sm:inline-block">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Mini Interactive Spectrum Visualizer */}
          <div
            onClick={() => {
              const styles: Array<'bars' | 'wave' | 'circle' | 'minimal' | 'pillars'> = [
                'bars',
                'wave',
                'pillars',
                'circle',
                'minimal',
              ];
              const currentStyle = settings?.visualizerStyle || 'bars';
              const nextStyle = styles[(styles.indexOf(currentStyle) + 1) % styles.length];
              if (onUpdateSettings && settings) {
                onUpdateSettings({ ...settings, visualizerStyle: nextStyle });
              }
            }}
            className="w-16 lg:w-20 h-6 px-1 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer flex items-center justify-center overflow-hidden shadow-inner hidden md:flex"
            title="Spectre audio dynamique • Cliquer pour changer le style"
          >
            <AudioVisualizer
              isPlaying={isPlaying && !!currentTrack}
              style={settings?.visualizerStyle || 'bars'}
              accent={accent}
              barCount={16}
              showPeaks={true}
              interactive={true}
              onStyleChange={(newStyle) => {
                if (onUpdateSettings && settings) {
                  onUpdateSettings({ ...settings, visualizerStyle: newStyle });
                }
              }}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Right: Volume + Dock Switcher + Ghost Mode + Maximize / Detach */}
        <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
          {/* Toast message */}
          {feedbackMessage && (
            <span className="text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 animate-in fade-in hidden xl:inline">
              {feedbackMessage}
            </span>
          )}

          {/* Volume Control */}
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
            <button
              type="button"
              onClick={onToggleMute}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Rétablir le son' : 'Couper le son (M)'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-neutral-500" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className={`w-12 lg:w-16 h-1 bg-neutral-800 rounded-lg cursor-pointer ${ACCENT_RANGE[accent]}`}
              title={`Volume : ${Math.round(volume * 100)}%`}
            />
          </div>

          <div className="h-4 w-px bg-neutral-800 mx-0.5 hidden sm:block" />

          {/* Segmented Dock Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-neutral-900 border border-neutral-800" title="Position d'ancrage de la barre">
            <button
              type="button"
              onClick={() => handleSetDockMode('top')}
              className={`p-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                dockMode === 'top'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Ancrer la mini-barre en Haut de l'écran"
            >
              <ArrowUpToLine className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSetDockMode('bottom')}
              className={`p-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                dockMode === 'bottom'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Ancrer la mini-barre en Bas de l'écran"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSetDockMode('floating')}
              className="p-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer text-neutral-400 hover:text-neutral-200"
              title="Passer en Widget Flottant déplaçable"
            >
              <Move className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Ghost Mode Toggle (Semi-transparency for work) */}
          <button
            type="button"
            onClick={handleToggleGhostMode}
            className={`p-1 rounded-lg border transition-colors cursor-pointer ${
              isGhostMode
                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80'
            }`}
            title={
              isGhostMode
                ? 'Mode discret actif : semi-transparent au repos (cliquer pour désactiver)'
                : 'Activer le mode discret semi-transparent pour travailler sans gêne'
            }
          >
            {isGhostMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          {/* Minimize / Expand underlying app for ultra-focus */}
          {onToggleMinimizeApp && (
            <button
              type="button"
              onClick={onToggleMinimizeApp}
              className={`p-1 rounded-lg border transition-colors cursor-pointer hidden md:flex items-center gap-1 ${
                isAppMinimized
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80'
              }`}
              title={
                isAppMinimized
                  ? "Afficher l'interface complète de la bibliothèque"
                  : "Mode ultra-compact : masquer la fenêtre principale pour ne garder que la mini-barre"
              }
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Detached PiP Always-on-top button */}
          {onDetachPip && (
            <button
              type="button"
              onClick={onDetachPip}
              className="p-1 rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800/80 transition-colors cursor-pointer hidden sm:block"
              title="Détacher en Always-on-Top (au-dessus de vos applications Windows/Mac/Linux)"
            >
              <PictureInPicture2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Restore Full Player Window */}
          <button
            type="button"
            onClick={onRestore}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors cursor-pointer"
            title="Agrandir et restaurer l'application principale"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // =========================================================================
  // RENDER MOVABLE / DRAGGABLE FLOATING WIDGET CAPSULE
  // =========================================================================
  return (
    <div
      id="aurawave-floating-widget"
      role="region"
      aria-label="Widget audio flottant déplaçable"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        left: `${floatingPos.x}px`,
        top: `${floatingPos.y}px`,
        touchAction: 'none',
      }}
      className={`fixed z-[100] w-84 rounded-2xl border border-neutral-800 bg-neutral-950/95 backdrop-blur-md shadow-2xl p-3.5 flex flex-col gap-2.5 select-none transition-opacity duration-200 ${
        isGhostMode ? 'opacity-70 hover:opacity-100' : 'opacity-100'
      } ${isDragging ? 'cursor-grabbing shadow-emerald-500/20 ring-1 ring-emerald-500/40' : 'cursor-grab'}`}
    >
      {/* Top Header with Drag Handle, Spectrum & Quick Actions */}
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-2">
        <div className="flex items-center gap-1.5 text-neutral-400">
          <GripHorizontal className="w-4 h-4 text-neutral-500" />
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
            Widget Flottant
          </span>
        </div>

        {/* Real-time spectrum visualizer */}
        <div
          onClick={() => {
            const styles: Array<'bars' | 'wave' | 'circle' | 'minimal' | 'pillars'> = [
              'bars',
              'wave',
              'pillars',
              'circle',
              'minimal',
            ];
            const currentStyle = settings?.visualizerStyle || 'bars';
            const nextStyle = styles[(styles.indexOf(currentStyle) + 1) % styles.length];
            if (onUpdateSettings && settings) {
              onUpdateSettings({ ...settings, visualizerStyle: nextStyle });
            }
          }}
          className="flex-1 max-w-[110px] h-5 px-1 py-0.5 rounded bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer flex items-center justify-center overflow-hidden shadow-inner"
          title="Spectre temps réel • Cliquer pour changer le style"
        >
          <AudioVisualizer
            isPlaying={isPlaying && !!currentTrack}
            style={settings?.visualizerStyle || 'bars'}
            accent={accent}
            barCount={16}
            showPeaks={true}
            interactive={true}
            onStyleChange={(newStyle) => {
              if (onUpdateSettings && settings) {
                onUpdateSettings({ ...settings, visualizerStyle: newStyle });
              }
            }}
            className="w-full h-full"
          />
        </div>

        {/* Dock switch buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSetDockMode('top')}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Ancrer en barre en Haut"
          >
            <ArrowUpToLine className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleSetDockMode('bottom')}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Ancrer en barre en Bas"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleGhostMode}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isGhostMode ? 'text-cyan-400 bg-cyan-950/60' : 'text-neutral-400 hover:text-white'
            }`}
            title={isGhostMode ? 'Mode discret actif' : 'Activer le mode discret'}
          >
            {isGhostMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          {onDetachPip && (
            <button
              type="button"
              onClick={onDetachPip}
              className="p-1 rounded text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Détacher en Always-on-Top"
            >
              <PictureInPicture2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onRestore}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Agrandir et restaurer la fenêtre principale"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Middle: Artwork + Info + Actions */}
      <div className="flex items-center gap-3">
        {currentTrack ? (
          <img
            src={
              currentTrack.coverUrl ||
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
            }
            alt={currentTrack.title}
            className="w-11 h-11 rounded-xl object-cover shadow-md flex-shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-500 flex-shrink-0">
            <Activity className="w-5 h-5 opacity-40" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4
            className="text-xs font-bold text-neutral-100 truncate cursor-pointer hover:underline"
            onClick={onRestore}
            title={currentTrack ? currentTrack.title : ''}
          >
            {currentTrack ? currentTrack.title : 'Sélectionnez un titre'}
          </h4>
          <p className="text-[11px] text-neutral-400 truncate">
            {currentTrack ? currentTrack.artist : 'Lecteur en veille'}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {currentTrack && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isFavorite ? 'text-rose-500 fill-current' : 'text-neutral-500 hover:text-white'
              }`}
              title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
            </button>
          )}

          {currentTrack && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsPlaylistMenuOpen(!isPlaylistMenuOpen)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Ajouter à une playlist"
              >
                <ListPlus className="w-4 h-4" />
              </button>

              {isPlaylistMenuOpen && (
                <div
                  className="absolute right-0 bottom-8 z-50 w-52 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 text-left animate-in fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                    Ajouter à une playlist
                  </div>
                  {customPlaylists.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-neutral-500 text-center">
                      Aucune playlist
                    </div>
                  ) : (
                    <div className="max-h-32 overflow-y-auto flex flex-col gap-0.5">
                      {customPlaylists.map((pl) => (
                        <button
                          key={pl.id}
                          type="button"
                          onClick={() => handleAddTrack(pl.id, pl.title)}
                          className="w-full text-left px-2 py-1 rounded text-xs hover:bg-neutral-800 text-neutral-200 flex items-center justify-between gap-1 transition-colors cursor-pointer"
                        >
                          <span className="truncate">{pl.title}</span>
                          {pl.trackIds.includes(currentTrack.id) && (
                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress slider & time */}
      <div className="flex flex-col gap-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.5}
          value={currentTime}
          disabled={!currentTrack}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className={`w-full h-1 bg-neutral-800 rounded-lg cursor-pointer ${ACCENT_RANGE[accent]}`}
        />
        <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls & Volume */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMute}
            className="text-neutral-400 hover:text-white cursor-pointer"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className={`w-14 h-1 bg-neutral-800 rounded-lg cursor-pointer ${ACCENT_RANGE[accent]}`}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrev}
            className="p-1.5 text-neutral-400 hover:text-white rounded-md cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            className={`p-2 rounded-full shadow-md cursor-pointer ${ACCENT_BG[accent]}`}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>
          {onStop && (
            <button
              type="button"
              onClick={onStop}
              disabled={!currentTrack && currentTime === 0}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                currentTrack
                  ? 'text-neutral-400 hover:text-red-400 hover:bg-neutral-800'
                  : 'text-neutral-700 cursor-not-allowed opacity-40'
              }`}
              title="Arrêter totalement la musique"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="p-1.5 text-neutral-400 hover:text-white rounded-md cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Snap Corners quick icons */}
        <div className="flex items-center gap-0.5 text-neutral-500">
          <button
            type="button"
            onClick={() => handleSnapCorner('tl')}
            className="text-[9px] hover:text-white px-1 py-0.5 rounded hover:bg-neutral-800 font-mono"
            title="Caler en Haut-Gauche"
          >
            ↖
          </button>
          <button
            type="button"
            onClick={() => handleSnapCorner('tr')}
            className="text-[9px] hover:text-white px-1 py-0.5 rounded hover:bg-neutral-800 font-mono"
            title="Caler en Haut-Droite"
          >
            ↗
          </button>
          <button
            type="button"
            onClick={() => handleSnapCorner('br')}
            className="text-[9px] hover:text-white px-1 py-0.5 rounded hover:bg-neutral-800 font-mono"
            title="Caler en Bas-Droite"
          >
            ↘
          </button>
        </div>
      </div>
    </div>
  );
};

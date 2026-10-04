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
  Move,
  GripHorizontal,
  Eye,
  EyeOff,
  X,
  Layers,
} from 'lucide-react';
import { Track, Playlist, AccentColor, PlayerSettings } from '../types';
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
  accent: AccentColor;
  playlists?: Playlist[];
  onAddToPlaylist?: (playlistId: string, trackId: string) => void;
  onRemoveFromPlaylist?: (playlistId: string, trackId: string) => void;
  onCreatePlaylist?: () => void;
  settings?: PlayerSettings;
  onUpdateSettings?: (newSettings: PlayerSettings) => void;
  isAppMinimized?: boolean;
  onToggleMinimizeApp?: () => void;
  isStandalone?: boolean;
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
  accent,
  playlists = [],
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onCreatePlaylist,
  settings,
  onUpdateSettings,
  isAppMinimized = false,
  onToggleMinimizeApp,
  isStandalone = false,
}) => {
  // 1. Persistent Ghost / Transparency Mode
  const [isGhostMode, setIsGhostMode] = useState<boolean>(() => {
    if (typeof settings?.compactPlayerGhost === 'boolean') return settings.compactPlayerGhost;
    return localStorage.getItem('aurawave_compact_ghost') === 'true';
  });

  // 2. Floating Widget Drag Position
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
    if (!isDragging) return;
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

  const handleToggleTrack = (playlistId: string, playlistTitle: string, isPresent: boolean) => {
    if (!currentTrack) return;
    if (isPresent) {
      if (onRemoveFromPlaylist) {
        onRemoveFromPlaylist(playlistId, currentTrack.id);
        setFeedbackMessage(`Retiré de "${playlistTitle}"`);
      }
    } else {
      if (onAddToPlaylist) {
        onAddToPlaylist(playlistId, currentTrack.id);
        setFeedbackMessage(`Ajouté à "${playlistTitle}"`);
      }
    }
    setTimeout(() => setFeedbackMessage(null), 2500);
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
  // RENDER MOVABLE / DRAGGABLE FLOATING WIDGET CAPSULE
  // =========================================================================
  return (
    <div
      id="aurawave-floating-widget"
      role="region"
      aria-label="Widget audio flottant déplaçable"
      onPointerDown={isStandalone ? undefined : handlePointerDown}
      onPointerMove={isStandalone ? undefined : handlePointerMove}
      onPointerUp={isStandalone ? undefined : handlePointerUp}
      style={isStandalone ? { touchAction: 'none' } : {
        left: `${floatingPos.x}px`,
        top: `${floatingPos.y}px`,
        touchAction: 'none',
      }}
      className={`${
        isStandalone ? 'relative w-full h-full rounded-2xl' : 'fixed z-[100] w-84 rounded-2xl'
      } border border-neutral-800/80 bg-neutral-950/95 backdrop-blur-md shadow-2xl p-3 flex flex-col justify-between select-none transition-opacity duration-200 overflow-hidden ${
        isGhostMode ? 'opacity-70 hover:opacity-100' : 'opacity-100'
      } ${!isStandalone && isDragging ? 'cursor-grabbing shadow-emerald-500/20 ring-1 ring-emerald-500/40' : !isStandalone ? 'cursor-grab' : ''}`}
    >
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-3 py-1 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold rounded-full shadow-lg backdrop-blur-md animate-in fade-in duration-150 pointer-events-none">
          {feedbackMessage}
        </div>
      )}

      {/* Top Header with Drag Handle, Spectrum & Quick Actions */}
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-2">
        <div
          onMouseDown={() => {
            try {
              (window as any).chrome?.webview?.postMessage({ action: 'drag-window' });
            } catch {}
          }}
          className="flex items-center gap-1.5 text-neutral-400 cursor-move"
          title="Déplacer la fenêtre"
        >
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

        {/* Quick action buttons */}
        <div className="flex items-center gap-1">
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
                  className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/80 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 text-left animate-in fade-in slide-in-from-top-1 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                    <span>Playlists</span>
                    <button
                      type="button"
                      onClick={() => setIsPlaylistMenuOpen(false)}
                      className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                      title="Fermer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {customPlaylists.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-neutral-400 text-center">
                      Aucune playlist disponible
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto flex flex-col gap-0.5 pr-0.5">
                      {customPlaylists.map((pl) => {
                        const isPresent = pl.trackIds.includes(currentTrack.id);
                        return (
                          <button
                            key={pl.id}
                            type="button"
                            onClick={() => handleToggleTrack(pl.id, pl.title, isPresent)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-1.5 transition-colors cursor-pointer group ${
                              isPresent
                                ? 'bg-emerald-500/10 text-emerald-300 hover:bg-rose-500/15 hover:text-rose-300'
                                : 'text-neutral-200 hover:bg-neutral-800 hover:text-white'
                            }`}
                            title={isPresent ? `Cliquer pour retirer de "${pl.title}"` : `Cliquer pour ajouter à "${pl.title}"`}
                          >
                            <span className="truncate flex-1 font-medium">{pl.title}</span>
                            {isPresent ? (
                              <span className="flex items-center gap-1 flex-shrink-0">
                                <Check className="w-3.5 h-3.5 text-emerald-400 group-hover:hidden" />
                                <span className="text-[10px] text-rose-400 font-semibold hidden group-hover:inline">Retirer</span>
                              </span>
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
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

        {/* Balanced spacer to keep playback controls centered */}
        <div className="w-16 flex items-center justify-end" aria-hidden="true" />
      </div>
    </div>
  );
};

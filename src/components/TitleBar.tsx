import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Music2 } from 'lucide-react';
import { AccentColor, Track, APP_VERSION } from '../types';

interface TitleBarProps {
  currentTrack?: Track | null;
  isPlaying?: boolean;
  accent?: AccentColor;
}

export const TitleBar: React.FC<TitleBarProps> = ({ currentTrack, isPlaying, accent = 'emerald' }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;

    window.electronAPI.isMaximized().then(setIsMaximized);

    const unsubscribe = window.electronAPI.onMaximizedChange((maximized) => {
      setIsMaximized(maximized);
    });

    return () => {
      unsubscribe?.();
    };
  }, [isElectron]);

  const handleMinimize = () => {
    window.electronAPI?.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximize();
  };

  const handleClose = () => {
    window.electronAPI?.close();
  };

  // If not running in Electron, render an ultra-compact subtle top bar
  if (!isElectron) {
    return null;
  }

  return (
    <header
      id="flowluna-titlebar"
      className="w-full h-8 bg-neutral-950/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between select-none z-50 text-neutral-300 text-xs flex-shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      onDoubleClick={handleMaximize}
    >
      {/* Left: Branding & Status */}
      <div className="flex items-center gap-2.5 px-3 min-w-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center shadow-xs flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />
        </div>
        <span className="font-bold tracking-wider text-[11px] text-white flex items-center gap-1.5">
          <span>FlowLuna</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">v{APP_VERSION}</span>
        </span>

        {currentTrack && (
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-neutral-400 border-l border-neutral-800 pl-2.5 max-w-[320px] truncate">
            <Music2 className={`w-3 h-3 flex-shrink-0 ${isPlaying ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`} />
            <span className="truncate text-neutral-300 font-medium">{currentTrack.title}</span>
            <span className="text-neutral-600">•</span>
            <span className="truncate text-neutral-400">{currentTrack.artist}</span>
          </div>
        )}
      </div>

      {/* Center: Draggable Spacer */}
      <div className="flex-1 h-full" />

      {/* Right: Windows Native Controls */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Minimize */}
        <button
          type="button"
          onClick={handleMinimize}
          title="Réduire"
          aria-label="Réduire"
          className="h-full px-3.5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Maximize / Restore */}
        <button
          type="button"
          onClick={handleMaximize}
          title={isMaximized ? 'Restaurer' : 'Agrandir'}
          aria-label={isMaximized ? 'Restaurer' : 'Agrandir'}
          className="h-full px-3.5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors cursor-pointer"
        >
          {isMaximized ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-3 h-3" />}
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          title="Fermer"
          aria-label="Fermer"
          className="h-full px-4 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-red-600 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};

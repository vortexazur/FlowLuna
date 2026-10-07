import React from 'react';
import { FastForward, X, Sparkles, Film } from 'lucide-react';
import { Track, AccentColor } from '../types';

interface MarathonCountdownOverlayProps {
  isVisible: boolean;
  countdownRemaining: number;
  countdownTotal: number;
  countdownProgress: number; // 0 (start) to 1 (done)
  nextTrack: Track | null;
  nextEpisodeNumber?: number;
  onPlayNext: () => void;
  onCancel: () => void;
  accent?: AccentColor;
}

const ACCENT_STROKE: Record<AccentColor, string> = {
  emerald: 'stroke-emerald-400',
  violet: 'stroke-violet-400',
  blue: 'stroke-blue-400',
  amber: 'stroke-amber-400',
  rose: 'stroke-rose-400',
  cyan: 'stroke-cyan-400',
};

const ACCENT_BTN: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white font-bold',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white font-bold',
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold',
  rose: 'bg-rose-500 hover:bg-rose-400 text-white font-bold',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold',
};

const ACCENT_TEXT: Record<AccentColor, string> = {
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  cyan: 'text-cyan-400',
};

export const MarathonCountdownOverlay: React.FC<MarathonCountdownOverlayProps> = ({
  isVisible,
  countdownRemaining,
  countdownTotal,
  countdownProgress,
  nextTrack,
  nextEpisodeNumber,
  onPlayNext,
  onCancel,
  accent = 'emerald',
}) => {
  if (!isVisible || !nextTrack) return null;

  // Circumference of r=19 circle: 2 * Math.PI * 19 = ~119.38
  const circumference = 119.38;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, countdownProgress)));
  const displaySeconds = Math.max(0, Math.ceil(countdownRemaining));

  return (
    <div
      className="absolute bottom-24 right-6 md:right-8 z-50 w-80 sm:w-96 bg-neutral-950/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300 select-none text-white"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3">
        {/* Animated Countdown Ring */}
        <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r="19"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="3.5"
              className="text-neutral-800"
            />
            <circle
              cx="24"
              cy="24"
              r="19"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`${ACCENT_STROKE[accent] || 'stroke-emerald-400'} transition-all duration-100`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-mono font-bold text-sm text-white">
            {displaySeconds}
          </span>
        </div>

        {/* Next episode details */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className={`w-3.5 h-3.5 ${ACCENT_TEXT[accent] || 'text-emerald-400'}`} />
            <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 truncate">
              Épisode suivant dans {displaySeconds}s...
            </span>
          </div>

          <h3 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5" title={nextTrack.title}>
            {nextTrack.title}
          </h3>

          <span className="text-[11px] text-neutral-400 truncate">
            {nextTrack.artist || nextTrack.album || 'Lecture continue'}
          </span>
        </div>
      </div>

      {/* Action buttons toolbar */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={onCancel}
          title="Annuler l'enchaînement automatique (Échap)"
          className="px-3 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-xs font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" />
          <span>Annuler</span>
          <kbd className="px-1 py-0.5 text-[9px] font-mono bg-neutral-950 text-neutral-400 rounded border border-neutral-700/70 ml-0.5">
            Échap
          </kbd>
        </button>

        <button
          type="button"
          onClick={onPlayNext}
          title="Lancer immédiatement l'épisode suivant (N)"
          className={`px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
            ACCENT_BTN[accent] || 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold'
          } hover:scale-[1.02] active:scale-95`}
        >
          <FastForward className="w-3.5 h-3.5 fill-current" />
          <span>Lire maintenant</span>
          <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-black/25 text-current rounded border border-black/20 ml-0.5">
            N
          </kbd>
        </button>
      </div>
    </div>
  );
};

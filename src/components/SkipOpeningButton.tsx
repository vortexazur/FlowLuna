import React from 'react';
import { FastForward, Sparkles, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import { SkipInterval } from '../types';

interface SkipOpeningButtonProps {
  isVisible: boolean;
  interval: SkipInterval | null;
  onSkip: () => void;
  autoSkipEnabled: boolean;
  onToggleAutoSkip: (enabled: boolean) => void;
  autoSkippedToast?: string | null;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  chapter: { label: 'Chapitre', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  api: { label: 'Aniskip', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  audio_fingerprint: { label: 'Acoustique', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
};

export const SkipOpeningButton: React.FC<SkipOpeningButtonProps> = ({
  isVisible,
  interval,
  onSkip,
  autoSkipEnabled,
  onToggleAutoSkip,
  autoSkippedToast,
}) => {
  return (
    <>
      {/* Toast de confirmation si le saut automatique s'est déclenché */}
      {autoSkippedToast && (
        <div className="absolute bottom-24 right-6 md:right-8 z-40 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300 select-none">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900/95 backdrop-blur-md border border-sky-500/40 text-white shadow-2xl text-xs md:text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span>{autoSkippedToast}</span>
            {interval && (
              <span className="text-[11px] font-mono text-neutral-400 ml-1">
                ({Math.round(interval.end - interval.start)}s)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bouton d'action flottant "Passer l'opening" (Mode Manuel) */}
      {isVisible && interval && !autoSkipEnabled && (
        <div
          className="absolute bottom-24 right-6 md:right-8 z-40 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Bouton d'action principal */}
          <button
            type="button"
            onClick={onSkip}
            title="Passer l'opening (Raccourci : S)"
            className="group flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800/95 active:scale-95 border border-white/20 hover:border-sky-400/70 text-white shadow-2xl backdrop-blur-md transition-all cursor-pointer"
          >
            <div className="p-1 rounded-lg bg-sky-500/20 text-sky-400 group-hover:scale-110 transition-transform">
              <FastForward className="w-4 h-4 fill-current" />
            </div>

            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-bold tracking-wide">
                  Passer l'opening
                </span>
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-neutral-300 border border-white/20 shadow-xs">
                  S
                </kbd>
              </div>

              {interval.source && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                      SOURCE_LABELS[interval.source]?.color || 'text-neutral-400'
                    }`}
                  >
                    {SOURCE_LABELS[interval.source]?.label || interval.source}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    +{Math.round(interval.end - interval.start)}s
                  </span>
                </div>
              )}
            </div>
          </button>

          {/* Toggle Rapide Auto-Skip */}
          <button
            type="button"
            onClick={() => onToggleAutoSkip(!autoSkipEnabled)}
            title={autoSkipEnabled ? 'Saut automatique activé' : 'Activer le saut automatique pour les prochains épisodes'}
            className="p-2 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800/95 border border-white/10 text-neutral-300 hover:text-sky-300 transition-colors shadow-2xl backdrop-blur-md flex items-center justify-center cursor-pointer"
          >
            {autoSkipEnabled ? (
              <ToggleRight className="w-5 h-5 text-sky-400" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-neutral-400" />
            )}
          </button>
        </div>
      )}
    </>
  );
};

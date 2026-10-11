import React from 'react';
import { FastForward, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { SkipInterval } from '../types';

interface SkipOpeningButtonProps {
  isVisible: boolean;
  interval: SkipInterval | null;
  onSkip: () => void;
  autoSkipEnabled: boolean;
  onToggleAutoSkip: (enabled: boolean) => void;
  autoSkippedToast?: string | null;
  driftDetected?: boolean;
}

function getSourceBadge(
  interval: SkipInterval,
  driftDetected?: boolean
): { label: string; colorClass: string; isWarning: boolean } {
  if (interval.source === 'chapter') {
    return {
      label: 'Chapitre',
      colorClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
      isWarning: false,
    };
  }

  if (interval.source === 'heuristic') {
    return {
      label: 'Heuristique (Incertain)',
      colorClass: 'text-slate-300 bg-slate-500/20 border-slate-500/40',
      isWarning: true,
    };
  }

  // interval.source === 'api'
  const isDrift = !!driftDetected || interval.confidence === 'moderate';
  if (isDrift) {
    return {
      label: 'API (Décalage possible)',
      colorClass: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
      isWarning: true,
    };
  }

  return {
    label: 'API',
    colorClass: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
    isWarning: false,
  };
}

export const SkipOpeningButton: React.FC<SkipOpeningButtonProps> = ({
  isVisible,
  interval,
  onSkip,
  autoSkipEnabled,
  onToggleAutoSkip,
  autoSkippedToast,
  driftDetected,
}) => {
  // Détection de l'incertitude (Heuristique ou Drift temporel)
  const isUncertain =
    interval?.source === 'heuristic' || !!driftDetected || interval?.confidence === 'moderate';

  // Forcer l'affichage du bouton manuel en cas d'incertitude même si autoSkipEnabled est actif
  const shouldShowButton = isVisible && interval && (!autoSkipEnabled || isUncertain);

  const badge = interval ? getSourceBadge(interval, driftDetected) : null;

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

      {/* Bouton d'action flottant "Passer l'opening" (Mode Manuel ou Forcé en cas d'incertitude) */}
      {shouldShowButton && interval && (
        <div
          className="absolute bottom-24 right-6 md:right-8 z-40 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Bouton d'action principal */}
          <button
            type="button"
            onClick={onSkip}
            title={
              isUncertain
                ? "Passer l'opening (Segment incertain - Raccourci : S)"
                : "Passer l'opening (Raccourci : S)"
            }
            className={`group flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800/95 active:scale-95 border text-white shadow-2xl backdrop-blur-md transition-all cursor-pointer ${
              badge?.isWarning
                ? 'border-amber-500/40 hover:border-amber-400/70 shadow-amber-950/20'
                : 'border-white/20 hover:border-sky-400/70'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-transform group-hover:scale-110 ${
                badge?.isWarning
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-sky-500/20 text-sky-400'
              }`}
            >
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

              {badge && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border flex items-center gap-1 ${badge.colorClass}`}
                  >
                    {badge.isWarning && <AlertTriangle className="w-2.5 h-2.5 shrink-0" />}
                    <span>{badge.label}</span>
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
            title={
              autoSkipEnabled
                ? 'Saut automatique activé (Désactivé pour les segments incertains)'
                : 'Activer le saut automatique pour les prochains épisodes'
            }
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

import React from 'react';
import { Sparkles, Download, X, ArrowUpCircle } from 'lucide-react';
import { AppUpdateInfo, AccentColor, ThemeMode } from '../types';

interface UpdateNotificationToastProps {
  updateInfo: AppUpdateInfo | null;
  onOpenSettingsUpdate: () => void;
  onDismiss: () => void;
  isDismissed: boolean;
  isFullscreenActive: boolean;
  accent: AccentColor;
  theme: ThemeMode;
}

const ACCENT_BTN: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white font-bold',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white font-bold',
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold',
  rose: 'bg-rose-500 hover:bg-rose-400 text-white font-bold',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold',
};

const ACCENT_GLOW: Record<AccentColor, string> = {
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
};

export const UpdateNotificationToast: React.FC<UpdateNotificationToastProps> = ({
  updateInfo,
  onOpenSettingsUpdate,
  onDismiss,
  isDismissed,
  isFullscreenActive,
  accent,
  theme,
}) => {
  // CRITICAL REQUIREMENT: Lors d'un visionnage d'une vidéo en plein écran, ne se montre pas en 1er plan !
  if (!updateInfo || !updateInfo.hasUpdate || isDismissed || isFullscreenActive) {
    return null;
  }

  const isLight = theme === 'light';

  return (
    <aside
      id="update-notification-toast"
      aria-label="Notification de mise à jour"
      className={`fixed bottom-28 right-6 z-40 max-w-sm w-full p-4 rounded-2xl shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in select-none ${
        isLight
          ? 'bg-white/95 border border-slate-200 text-slate-800 backdrop-blur-xl shadow-slate-900/10'
          : 'bg-neutral-900/95 border border-white/10 text-neutral-100 backdrop-blur-xl shadow-black/60'
      }`}
      style={{
        boxShadow: isLight
          ? '0 20px 45px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.05)'
          : '0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Glow badge icon */}
        <div className={`p-2.5 rounded-xl border flex-shrink-0 ${ACCENT_GLOW[accent]}`}>
          <ArrowUpCircle className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold tracking-tight">Mise à jour disponible</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                isLight ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-neutral-800 text-neutral-200 border border-neutral-700'
              }`}
            >
              v{updateInfo.latestVersion}
            </span>
          </div>

          <p className={`text-[11px] mt-1 leading-snug ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
            Une nouvelle version officielle de FlowLuna est prête avec correctifs et améliorations.
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={onOpenSettingsUpdate}
              className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${ACCENT_BTN[accent]}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Mettre à jour</span>
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              Plus tard
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onDismiss}
          className={`p-1 rounded-lg transition-colors cursor-pointer -mt-1 -mr-1 ${
            isLight ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
          title="Fermer la notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

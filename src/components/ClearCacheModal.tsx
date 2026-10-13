import React, { useState, useEffect } from 'react';
import {
  Trash2,
  X,
  CheckSquare,
  Square,
  RefreshCw,
  HardDrive,
  DownloadCloud,
  Film,
  Music,
  AlertTriangle,
} from 'lucide-react';
import { AccentColor, ThemeMode, PlayerSettings } from '../types';
import { getT } from '../i18n';
import {
  getCacheUsageStats,
  clearSelectedCache,
  formatBytes,
  CacheOverallStats,
  ClearCacheResult,
} from '../services/cacheCleanerService';

interface ClearCacheModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ClearCacheResult) => void;
  onError: (errorMsg: string) => void;
  accent: AccentColor;
  theme?: ThemeMode;
  settings?: PlayerSettings;
}

const ACCENT_BTN: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950',
  violet: 'bg-violet-600 hover:bg-violet-500 text-white',
  blue: 'bg-blue-600 hover:bg-blue-500 text-white',
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950',
  rose: 'bg-rose-600 hover:bg-rose-500 text-white',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950',
};

export const ClearCacheModal: React.FC<ClearCacheModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  accent,
  settings,
}) => {
  const t = getT(settings?.language);
  const [downloadHistory, setDownloadHistory] = useState<boolean>(true);
  const [tempVideos, setTempVideos] = useState<boolean>(true);
  const [audioFiles, setAudioFiles] = useState<boolean>(false);

  const [stats, setStats] = useState<CacheOverallStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);

  // Fetch stats when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingStats(true);
      getCacheUsageStats()
        .then((s) => setStats(s))
        .catch(() => {})
        .finally(() => setIsLoadingStats(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectAll = () => {
    setDownloadHistory(true);
    setTempVideos(true);
    setAudioFiles(true);
  };

  const handleDeselectAll = () => {
    setDownloadHistory(false);
    setTempVideos(false);
    setAudioFiles(false);
  };

  const hasAnySelected = downloadHistory || tempVideos || audioFiles;

  const handleClean = async () => {
    if (!hasAnySelected || isCleaning) return;
    setIsCleaning(true);
    try {
      const result = await clearSelectedCache({
        downloadHistory,
        tempVideos,
        audioFiles,
      });
      onSuccess(result);
      onClose();
    } catch (err: any) {
      onError(err?.message || 'Erreur lors du nettoyage du cache');
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div
      id="clear-cache-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        id="clear-cache-modal-content"
        className="w-full max-w-lg rounded-2xl border border-white/10 glass-modal text-white shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 backdrop-blur-2xl bg-neutral-900/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">{t.clearCacheTitle}</h3>
              <p className="text-xs text-neutral-400">
                {t.clearCacheSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isCleaning}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={t.titlebarClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick select buttons */}
        <div className="px-6 pt-4 pb-2 flex items-center justify-between border-b border-white/5">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            {t.clearCacheGranular}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={isCleaning}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/60 transition-colors cursor-pointer"
            >
              {t.clearCacheSelectAll}
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              disabled={isCleaning}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/60 transition-colors cursor-pointer"
            >
              {t.clearCacheDeselectAll}
            </button>
          </div>
        </div>

        {/* Checkbox Options */}
        <div className="p-6 flex flex-col gap-3">
          {/* 1. Historique des téléchargements */}
          <label
            className={`p-3.5 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all ${
              downloadHistory
                ? 'bg-neutral-800/90 border-rose-500/40 text-white'
                : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300'
            }`}
          >
            <input
              type="checkbox"
              checked={downloadHistory}
              onChange={(e) => setDownloadHistory(e.target.checked)}
              disabled={isCleaning}
              className="sr-only"
            />
            <div className="mt-0.5 text-rose-400 flex-shrink-0">
              {downloadHistory ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4 text-neutral-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <DownloadCloud className="w-3.5 h-3.5 text-cyan-400" />
                  {t.clearCacheHistory}
                </span>
                {stats && stats.downloadHistory.count > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300">
                    {stats.downloadHistory.count} {t.clearCacheEntries}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed mt-1">
                {t.clearCacheHistoryDesc}
              </p>
            </div>
          </label>

          {/* 2. Vidéos temporaires */}
          <label
            className={`p-3.5 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all ${
              tempVideos
                ? 'bg-neutral-800/90 border-rose-500/40 text-white'
                : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300'
            }`}
          >
            <input
              type="checkbox"
              checked={tempVideos}
              onChange={(e) => setTempVideos(e.target.checked)}
              disabled={isCleaning}
              className="sr-only"
            />
            <div className="mt-0.5 text-rose-400 flex-shrink-0">
              {tempVideos ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4 text-neutral-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  {t.clearCacheTempVideos}
                </span>
                {stats && stats.tempVideos.bytes > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    ~{formatBytes(stats.tempVideos.bytes)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed mt-1">
                {t.clearCacheTempVideosDesc}
              </p>
            </div>
          </label>

          {/* 3. Fichiers audio */}
          <label
            className={`p-3.5 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all ${
              audioFiles
                ? 'bg-neutral-800/90 border-rose-500/40 text-white'
                : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300'
            }`}
          >
            <input
              type="checkbox"
              checked={audioFiles}
              onChange={(e) => setAudioFiles(e.target.checked)}
              disabled={isCleaning}
              className="sr-only"
            />
            <div className="mt-0.5 text-rose-400 flex-shrink-0">
              {audioFiles ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4 text-neutral-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Music className="w-3.5 h-3.5 text-emerald-400" />
                  {t.clearCacheAudio}
                </span>
                {stats && stats.audioFiles.bytes > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                    ~{formatBytes(stats.audioFiles.bytes)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed mt-1">
                {t.clearCacheAudioDesc}
              </p>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            disabled={isCleaning}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer border border-neutral-700"
          >
            {t.clearCacheCancel}
          </button>
          <button
            type="button"
            id="confirm-clean-cache-btn"
            onClick={handleClean}
            disabled={!hasAnySelected || isCleaning}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              ACCENT_BTN[accent]
            }`}
          >
            {isCleaning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{t.clearCacheCleaning}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.clearCacheSubmit}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Sun,
  Moon,
  Sparkles,
  Keyboard,
  Volume2,
  Check,
  Globe,
  Layers,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Cpu,
  Terminal,
  FolderPlus,
  Music,
} from 'lucide-react';
import { PlayerSettings, AccentColor } from '../types';
import { SUPPORTED_LANGUAGES, getT } from '../i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PlayerSettings;
  onChange: (settings: PlayerSettings) => void;
  tracksCount?: number;
  playlistsCount?: number;
  onDataReload?: () => Promise<void> | void;
}

const ACCENT_OPTIONS: { id: AccentColor; label: string; colorHex: string }[] = [
  { id: 'emerald', label: 'Émeraude Moderne', colorHex: '#10b981' },
  { id: 'violet', label: 'Cyber Violet', colorHex: '#8b5cf6' },
  { id: 'blue', label: 'Bleu Cobalt', colorHex: '#3b82f6' },
  { id: 'amber', label: 'Ambre Doré', colorHex: '#f59e0b' },
  { id: 'rose', label: 'Rubis Crimson', colorHex: '#f43f5e' },
  { id: 'cyan', label: 'Cyan Synthwave', colorHex: '#06b6d4' },
];

const SHORTCUTS = [
  { key: 'Espace', desc: 'Lecture / Pause' },
  { key: '← / →', desc: 'Reculer / Avancer de 5s' },
  { key: '↑ / ↓', desc: 'Volume +/-' },
  { key: 'M', desc: 'Activer / Couper le son (Muet)' },
  { key: 'L', desc: 'Ajouter / Retirer des Favoris' },
  { key: 'N', desc: 'Titre suivant' },
  { key: 'P', desc: 'Titre précédent' },
  { key: 'S', desc: 'Mode Aléatoire (Shuffle)' },
  { key: 'R', desc: 'Mode Répétition (Off / Tout / 1)' },
  { key: 'F', desc: 'Plein Écran & Paroles' },
  { key: 'E', desc: 'Ouvrir l’Égaliseur 10 bandes' },
  { key: 'W', desc: 'Mini-Barre d’appoint / Widget compact' },
  { key: 'Ctrl + K', desc: 'Palette de commandes rapide' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
  onDataReload,
}) => {
  const [binariesStatus, setBinariesStatus] = useState<any>(null);
  const [isUpdatingYtdlp, setIsUpdatingYtdlp] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isScanningSettings, setIsScanningSettings] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [customFolders, setCustomFolders] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchStatus = async () => {
      try {
        if (window.electronAPI) {
          const report = await window.electronAPI.getBinariesStatus();
          setBinariesStatus(report);
        } else {
          const res = await fetch('/api/downloader/binaries-status');
          if (res.ok) {
            const report = await res.json();
            setBinariesStatus(report);
          }
        }
      } catch {}

      try {
        const foldersRes = await fetch('/api/library/folders');
        if (foldersRes.ok) {
          const data = await foldersRes.json();
          if (Array.isArray(data.folders)) {
            setCustomFolders(data.folders);
          }
        }
      } catch {}
    };
    fetchStatus();
  }, [isOpen]);

  const handleScanMusicNow = async () => {
    setIsScanningSettings(true);
    setScanMessage(null);
    try {
      const res = await fetch('/api/library/scan');
      if (res.ok) {
        const data = await res.json();
        setScanMessage({
          text: `${data.count} morceaux locaux détectés et synchronisés !`,
          type: 'success',
        });
        if (onDataReload) await onDataReload();
      } else {
        throw new Error('Erreur de scan');
      }
    } catch {
      setScanMessage({
        text: 'Échec de la numérisation des dossiers musicaux',
        type: 'error',
      });
    } finally {
      setIsScanningSettings(false);
    }
  };

  const handleAddMusicFolder = async () => {
    if (window.electronAPI?.selectMusicFolder) {
      try {
        const folder = await window.electronAPI.selectMusicFolder();
        if (folder) {
          setIsScanningSettings(true);
          const res = await fetch('/api/library/add-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath: folder }),
          });
          if (res.ok) {
            const data = await res.json();
            setCustomFolders((prev) => (prev.includes(folder) ? prev : [...prev, folder]));
            setScanMessage({
              text: `${data.count} morceaux ajoutés depuis ${folder} !`,
              type: 'success',
            });
            if (onDataReload) await onDataReload();
          }
        }
      } catch {
        setScanMessage({ text: 'Erreur lors de l’ajout du dossier', type: 'error' });
      } finally {
        setIsScanningSettings(false);
      }
    }
  };

  const handleUpdateYtdlp = async () => {
    setIsUpdatingYtdlp(true);
    setUpdateMessage(null);
    try {
      let result;
      if (window.electronAPI) {
        result = await window.electronAPI.updateYtdlp();
      } else {
        const res = await fetch('/api/downloader/update-ytdlp', { method: 'POST' });
        result = await res.json();
      }

      if (result.success) {
        setUpdateMessage({
          text: result.message || 'yt-dlp mis à jour avec succès !',
          type: 'success',
        });
        if (window.electronAPI) {
          const rep = await window.electronAPI.getBinariesStatus();
          setBinariesStatus(rep);
        } else {
          const repRes = await fetch('/api/downloader/binaries-status');
          if (repRes.ok) setBinariesStatus(await repRes.json());
        }
      } else {
        setUpdateMessage({
          text: result.message || 'Erreur lors de la mise à jour',
          type: 'error',
        });
      }
    } catch (err: any) {
      setUpdateMessage({
        text: err.message || 'Impossible de contacter le service de mise à jour',
        type: 'error',
      });
    } finally {
      setIsUpdatingYtdlp(false);
    }
  };

  if (!isOpen) return null;

  const t = getT(settings.language);

  const updateSetting = <K extends keyof PlayerSettings>(key: K, value: PlayerSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === (settings.language || 'fr')) || SUPPORTED_LANGUAGES[0];

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="settings-modal-content"
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800/80 bg-neutral-900/90 glass-modal text-neutral-100 p-6 sm:p-7 shadow-2xl flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neutral-800 text-white">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{t.settingsTitle}</h2>
              <p className="text-xs text-neutral-400">{t.settingsSubtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Choix de la Langue / Language Selection */}
        <div className="flex flex-col gap-3.5 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/80">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-neutral-300 font-bold flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>{t.languageSection}</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/25 font-semibold flex items-center gap-1.5">
              <span>{currentLang.flag}</span>
              <span>{currentLang.name}</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            {t.languageDescription}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = (settings.language || 'fr') === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  id={`language-option-${lang.code}`}
                  onClick={() => updateSetting('language', lang.code)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/15 text-white font-bold ring-1 ring-emerald-500/30 shadow-xs'
                      : 'border-neutral-800 bg-neutral-900/70 text-neutral-300 hover:text-white hover:border-neutral-700 hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg select-none leading-none">{lang.flag}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate text-white">{lang.name}</div>
                      <div className="text-[10px] text-neutral-400 truncate">{lang.nativeName}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Appearance & Themes */}
        <div className="flex flex-col gap-4 border-t border-neutral-800 pt-4">
          <h3 className="text-xs uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            {t.appearanceSection}
          </h3>

          {/* Theme Mode: Dark / Light */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              id="theme-dark-btn"
              onClick={() => updateSetting('theme', 'dark')}
              className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                settings.theme === 'dark'
                  ? 'border-neutral-400 bg-neutral-800 text-white font-bold shadow-md'
                  : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Moon className="w-4 h-4 text-sky-400" />
                <span className="text-xs">{t.themeDark}</span>
              </div>
              {settings.theme === 'dark' && <Check className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              type="button"
              id="theme-light-btn"
              onClick={() => updateSetting('theme', 'light')}
              className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                settings.theme === 'light'
                  ? 'border-neutral-400 bg-neutral-800 text-white font-bold shadow-md'
                  : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-xs">{t.themeLight}</span>
              </div>
              {settings.theme === 'light' && <Check className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>

          {/* Effet Pure Glass & Translucidité (Lié au Thème) */}
          <div className="flex flex-col gap-3 bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">{t.pureGlassEffect}</span>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                {(settings.glassIntensity ?? 70)}% {(settings.glassIntensity ?? 70) === 100 ? '✨ Pure Glass' : (settings.glassIntensity ?? 70) === 0 ? 'Opaque' : 'Dépoli'}
              </span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              {t.pureGlassDesc}
            </p>

            {/* Slider Cursor from 0% to 100% */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-neutral-500 font-semibold w-8">0%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.glassIntensity ?? 70}
                  onChange={(e) => updateSetting('glassIntensity', parseInt(e.target.value, 10))}
                  className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="text-[11px] font-mono text-cyan-400 font-bold w-10 text-right">100%</span>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  { value: 0, label: t.glassOpaque },
                  { value: 35, label: t.glassSubtle },
                  { value: 70, label: t.glassBalanced },
                  { value: 100, label: t.glassCrystal },
                ].map((preset) => {
                  const isActive = (settings.glassIntensity ?? 70) === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => updateSetting('glassIntensity', preset.value)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all text-center cursor-pointer border ${
                        isActive
                          ? 'border-cyan-500/60 bg-cyan-500/20 text-cyan-200 font-bold shadow-xs ring-1 ring-cyan-500/30'
                          : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Visual Pure Glass Mini Preview */}
            <div
              className="mt-1 p-3 rounded-xl border border-white/15 relative overflow-hidden flex items-center justify-between transition-all"
              style={{
                backdropFilter: `blur(${Math.round(((settings.glassIntensity ?? 70) / 100) * 24)}px)`,
                WebkitBackdropFilter: `blur(${Math.round(((settings.glassIntensity ?? 70) / 100) * 24)}px)`,
                backgroundColor:
                  settings.theme === 'light'
                    ? `rgba(255, 255, 255, ${Math.max(0.18, 1 - ((settings.glassIntensity ?? 70) / 100) * 0.65)})`
                    : `rgba(18, 18, 24, ${Math.max(0.2, 1 - ((settings.glassIntensity ?? 70) / 100) * 0.7)})`,
                boxShadow: (settings.glassIntensity ?? 70) > 0 ? `0 8px 32px 0 rgba(0, 0, 0, ${0.12 + ((settings.glassIntensity ?? 70) / 100) * 0.28})` : 'none',
              }}
            >
              <div className="flex items-center gap-2.5 z-10">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                <span className="text-xs font-semibold text-neutral-200">
                  {settings.theme === 'dark' ? 'Verre Dépoli Sombre OLED' : 'Verre Givré Clair Raffiné'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 font-semibold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/20 z-10">
                Flou {Math.round(((settings.glassIntensity ?? 70) / 100) * 28)}px
              </span>
            </div>
          </div>

          {/* Accent Color Palette */}
          <div>
            <label className="text-xs text-neutral-300 font-medium block mb-2">{t.accentColor}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACCENT_OPTIONS.map((acc) => {
                const isSelected = settings.accent === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => updateSetting('accent', acc.id)}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-neutral-300 bg-neutral-800 text-white font-semibold'
                        : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-xs"
                      style={{ backgroundColor: acc.colorHex }}
                    />
                    <span className="text-xs truncate">{acc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visualizer Style */}
          <div>
            <label className="text-xs text-neutral-300 font-medium block mb-2">{t.visualizerStyle}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {[
                { id: 'bars', label: t.vizBars },
                { id: 'wave', label: t.vizWave },
                { id: 'pillars', label: t.vizPillars },
                { id: 'circle', label: t.vizCircle },
                { id: 'minimal', label: t.vizMinimal },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => updateSetting('visualizerStyle', style.id as any)}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-colors cursor-pointer ${
                    settings.visualizerStyle === style.id
                      ? 'border-neutral-400 bg-neutral-800 text-white'
                      : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Audio Engine Configuration */}
        <div className="flex flex-col gap-4 border-t border-neutral-800 pt-4">
          <h3 className="text-xs uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            {t.audioEngineSection}
          </h3>

          <div className="space-y-3 text-xs">
            {/* Crossfade */}
            <div className="flex items-center justify-between bg-neutral-950/40 p-3 rounded-lg border border-neutral-800/80">
              <div>
                <span className="font-semibold text-neutral-200 block">{t.crossfade}</span>
                <span className="text-neutral-400 text-[11px]">{t.crossfadeDesc}</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={settings.crossfadeDuration}
                  onChange={(e) => updateSetting('crossfadeDuration', parseInt(e.target.value, 10))}
                  className="w-24 accent-emerald-500 cursor-pointer"
                />
                <span className="font-mono text-neutral-200 w-8 text-right font-bold">
                  {settings.crossfadeDuration}s
                </span>
              </div>
            </div>

            {/* Gapless Playback */}
            <div className="flex items-center justify-between bg-neutral-950/40 p-3 rounded-lg border border-neutral-800/80">
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-200 block">{t.gapless}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold">
                    {t.gaplessBadge}
                  </span>
                </div>
                <span className="text-neutral-400 text-[11px] block mt-0.5">
                  {t.gaplessDesc}
                </span>
              </div>
              <input
                type="checkbox"
                id="settings-gapless-playback-toggle"
                checked={settings.gaplessPlayback ?? true}
                onChange={(e) => updateSetting('gaplessPlayback', e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer flex-shrink-0"
              />
            </div>

            {/* Harmonisation du Volume Sonore */}
            <div className="flex items-center justify-between bg-neutral-950/40 p-3 rounded-lg border border-neutral-800/80">
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-200 block">{t.normalization}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                    {t.normalizationBadge}
                  </span>
                </div>
                <span className="text-neutral-400 text-[11px] block mt-0.5">
                  {t.normalizationDesc}
                </span>
              </div>
              <input
                type="checkbox"
                id="settings-volume-normalization-toggle"
                checked={settings.volumeNormalization}
                onChange={(e) => updateSetting('volumeNormalization', e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer flex-shrink-0"
              />
            </div>

            {/* Auto Cache Favorites */}
            <div className="flex items-center justify-between bg-neutral-950/40 p-3 rounded-lg border border-neutral-800/80">
              <div>
                <span className="font-semibold text-neutral-200 block">{t.autoCache}</span>
                <span className="text-neutral-400 text-[11px]">
                  {t.autoCacheDesc}
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoCacheFavorites}
                onChange={(e) => updateSetting('autoCacheFavorites', e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Mode Lecteur Compact */}
            <div className="flex flex-col gap-2.5 bg-neutral-950/40 p-3 rounded-lg border border-neutral-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-neutral-200 block">{t.compactDock}</span>
                  <span className="text-neutral-400 text-[11px]">
                    {t.compactDockDesc}
                  </span>
                </div>
                <select
                  value={settings.compactPlayerDock || 'bottom'}
                  onChange={(e) => updateSetting('compactPlayerDock', e.target.value as any)}
                  className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-neutral-200 cursor-pointer focus:outline-none focus:border-emerald-500"
                >
                  <option value="bottom">{t.dockBottom}</option>
                  <option value="top">{t.dockTop}</option>
                  <option value="floating">{t.dockFloating}</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60">
                <div>
                  <span className="text-xs font-semibold text-neutral-300 block">{t.ghostMode}</span>
                  <span className="text-neutral-500 text-[11px]">
                    {t.ghostModeDesc}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={!!settings.compactPlayerGhost}
                  onChange={(e) => updateSetting('compactPlayerGhost', e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bibliothèque Locale & Détection Musicale PC */}
        <div className="flex flex-col gap-3.5 border-t border-neutral-800 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-400" />
              <span>Bibliothèque & Détection Musicale PC</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleScanMusicNow}
                disabled={isScanningSettings}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningSettings ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                <span>{isScanningSettings ? 'Scan...' : 'Scanner le PC'}</span>
              </button>

              <button
                type="button"
                onClick={handleAddMusicFolder}
                disabled={isScanningSettings}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700/80 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ajouter un dossier...</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-neutral-400">
            FlowLuna surveille automatiquement vos dossiers audio (<span className="text-white font-medium">Musique</span>, <span className="text-white font-medium">OneDrive</span>, <span className="text-white font-medium">Téléchargements</span> et dossiers personnalisés) et indexe instantanément les fichiers grâce au moteur embarqué FFprobe.
          </p>

          {/* Feedback alert */}
          {scanMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
                scanMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              }`}
            >
              {scanMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{scanMessage.text}</span>
            </div>
          )}

          {/* Scanned directories listing */}
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col gap-2">
            <span className="text-xs font-bold text-neutral-300">Dossiers surveillés & synchronisés :</span>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-neutral-400">
              <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">📁 ~/Music</span>
              <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">📁 ~/OneDrive/Music</span>
              <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">📁 ~/Downloads</span>
              {customFolders.map((f, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/20 text-cyan-300 truncate max-w-xs" title={f}>
                  📁 {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Moteur de Téléchargement & Binaires (yt-dlp & FFmpeg) */}
        <div className="flex flex-col gap-3.5 border-t border-neutral-800 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-2">
              <Cpu className="w-4 h-4 text-rose-400" />
              <span>Moteur de Téléchargement & Binaires Windows</span>
            </h3>
            <button
              type="button"
              onClick={handleUpdateYtdlp}
              disabled={isUpdatingYtdlp}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700/80 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingYtdlp ? 'animate-spin text-rose-400' : 'text-neutral-400'}`} />
              <span>{isUpdatingYtdlp ? 'Mise à jour...' : 'Mettre à jour yt-dlp'}</span>
            </button>
          </div>

          <p className="text-xs text-neutral-400">
            FlowLuna utilise <span className="text-white font-medium">yt-dlp.exe</span> pour l'extraction de métadonnées et <span className="text-white font-medium">ffmpeg.exe</span> pour le réencodage haute fidélité (FLAC, MP3 320k, WAV, 4K). En cas d'installation protégée, les mises à jour sont automatiquement sécurisées dans votre dossier utilisateur local (%APPDATA%).
          </p>

          {/* Feedback alert */}
          {updateMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
                updateMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              }`}
            >
              {updateMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{updateMessage.text}</span>
            </div>
          )}

          {/* Status grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* yt-dlp card */}
            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-rose-400" />
                  <span>yt-dlp</span>
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                    binariesStatus?.ytdlp?.available
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-950/80 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {binariesStatus?.ytdlp?.available ? 'Opérationnel' : 'Non détecté'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-neutral-400 truncate">
                Version : <span className="text-neutral-200">{binariesStatus?.ytdlp?.version || 'N/A'}</span>
              </div>
              <div className="text-[10px] text-neutral-500 font-mono truncate" title={binariesStatus?.ytdlp?.path}>
                {binariesStatus?.ytdlp?.path || 'Recherche dynamique...'}
              </div>
            </div>

            {/* ffmpeg card */}
            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  <span>FFmpeg</span>
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                    binariesStatus?.ffmpeg?.available
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-950/80 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {binariesStatus?.ffmpeg?.available ? 'Opérationnel' : 'Non détecté'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-neutral-400 truncate">
                Moteur : <span className="text-neutral-200">{binariesStatus?.ffmpeg?.available ? 'FFmpeg v9.0+ Hi-Fi' : 'N/A'}</span>
              </div>
              <div className="text-[10px] text-neutral-500 font-mono truncate" title={binariesStatus?.ffmpeg?.path}>
                {binariesStatus?.ffmpeg?.path || 'Recherche dynamique...'}
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts PC */}
        <div className="flex flex-col gap-3 border-t border-neutral-800 pt-4">
          <h3 className="text-xs uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-purple-400" />
            {t.shortcutsTitle}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80">
            {SHORTCUTS.map((sc) => (
              <div key={sc.key} className="flex items-center justify-between text-xs py-1">
                <span className="text-neutral-400">{sc.desc}</span>
                <kbd className="font-mono px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 text-[11px] font-semibold">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

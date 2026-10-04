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
  Radio,
  Film,
  Sliders,
} from 'lucide-react';
import { PlayerSettings, AccentColor, APP_VERSION } from '../types';
import { SUPPORTED_LANGUAGES, getT } from '../i18n';
import { CountryFlag } from './CountryFlag';

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

const ACCENT_SWITCH: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500',
  violet: 'bg-violet-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  cyan: 'bg-cyan-500',
};

const ACCENT_ACTIVE_TAB: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
  violet: 'bg-violet-500/15 text-violet-400 border-violet-500/40',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
  rose: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
  cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40',
};

const SHORTCUT_GROUPS = [
  {
    title: 'Lecture & Navigation',
    shortcuts: [
      { key: 'Espace', desc: 'Lecture / Pause' },
      { key: '← / →', desc: 'Reculer / Avancer de 5s' },
      { key: 'N', desc: 'Titre suivant' },
      { key: 'P', desc: 'Titre précédent' },
      { key: 'S', desc: 'Mode Aléatoire (Shuffle)' },
      { key: 'R', desc: 'Mode Répétition (Off / Tout / 1)' },
    ],
  },
  {
    title: 'Volume & Audio',
    shortcuts: [
      { key: '↑ / ↓', desc: 'Volume +/-' },
      { key: 'M', desc: 'Activer / Couper le son (Muet)' },
      { key: 'L', desc: 'Ajouter / Retirer des Favoris' },
      { key: 'E', desc: 'Ouvrir l’Égaliseur 10 bandes' },
    ],
  },
  {
    title: 'Interface & Affichage',
    shortcuts: [
      { key: 'F', desc: 'Plein Écran & Paroles synchronisées' },
      { key: 'W', desc: 'Mini-Barre d’appoint / Widget compact' },
      { key: 'Ctrl + K', desc: 'Palette de commandes rapide' },
    ],
  },
];

type SettingsTab = 'appearance' | 'audio' | 'general' | 'system' | 'shortcuts';

interface ToggleSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: AccentColor;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  checked,
  onChange,
  accent = 'emerald',
  disabled = false,
}) => (
  <button
    type="button"
    id={id}
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer flex-shrink-0 disabled:opacity-50 ${
      checked ? ACCENT_SWITCH[accent] : 'bg-neutral-800 border border-neutral-700/80'
    }`}
  >
    <span
      className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
  onDataReload,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [binariesStatus, setBinariesStatus] = useState<any>(null);
  const [isUpdatingYtdlp, setIsUpdatingYtdlp] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isScanningSettings, setIsScanningSettings] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [isUpdatingLibVlc, setIsUpdatingLibVlc] = useState(false);
  const [libVlcMessage, setLibVlcMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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
      setScanMessage({ text: 'Erreur lors de la détection musicale', type: 'error' });
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

  const handleUpdateLibVlc = async () => {
    setIsUpdatingLibVlc(true);
    setLibVlcMessage(null);
    try {
      let result: any;
      if (window.electronAPI?.updateLibVlc) {
        result = await window.electronAPI.updateLibVlc();
      } else {
        const res = await fetch('/api/engine/update-libvlc', { method: 'POST' });
        result = await res.json();
      }

      setLibVlcMessage({
        text: result.message || 'Moteur multimédia LibVLCSharp à jour !',
        type: result.success ? 'success' : 'error',
      });
    } catch (err: any) {
      setLibVlcMessage({
        text: err.message || 'Erreur lors de la vérification LibVLCSharp',
        type: 'error',
      });
    } finally {
      setIsUpdatingLibVlc(false);
    }
  };

  if (!isOpen) return null;

  const t = getT(settings.language);
  const accent = settings.accent || 'emerald';

  const updateSetting = <K extends keyof PlayerSettings>(key: K, value: PlayerSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === (settings.language || 'fr')) || SUPPORTED_LANGUAGES[0];

  const TABS = [
    { id: 'appearance' as SettingsTab, label: 'Apparence', icon: Sparkles },
    { id: 'audio' as SettingsTab, label: 'Audio & Écoute', icon: Volume2 },
    { id: 'general' as SettingsTab, label: 'Général & Système', icon: Globe },
    { id: 'system' as SettingsTab, label: 'Moteurs & Fichiers', icon: Cpu },
    { id: 'shortcuts' as SettingsTab, label: 'Raccourcis Clavier', icon: Keyboard },
  ];

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        id="settings-modal-content"
        className="w-full max-w-3xl max-h-[88vh] rounded-2xl border border-neutral-700/80 bg-[#13131c] text-neutral-100 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-neutral-800 bg-[#0e0e16]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-neutral-800 text-white border border-neutral-700/60 shadow-xs">
              <Settings className="w-5 h-5 text-neutral-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">{t.settingsTitle}</h2>
              <p className="text-xs text-neutral-400">{t.settingsSubtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-neutral-800 bg-[#0e0e16] overflow-x-auto scrollbar-none flex-shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? `${ACCENT_ACTIVE_TAB[accent]} border shadow-xs`
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? '' : 'text-neutral-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 bg-[#13131c]">
          {/* TAB 1: APPARENCE */}
          {activeTab === 'appearance' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-150">
              {/* Thème Sombre / Clair */}
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Mode Thème
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    id="theme-dark-btn"
                    onClick={() => updateSetting('theme', 'dark')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      settings.theme === 'dark'
                        ? 'border-neutral-500 bg-neutral-800/90 text-white font-bold shadow-md ring-1 ring-neutral-400/30'
                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        <Moon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-semibold block text-white">{t.themeDark}</span>
                        <span className="text-[10px] text-neutral-400">Contraste infini & sobriété</span>
                      </div>
                    </div>
                    {settings.theme === 'dark' && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    id="theme-light-btn"
                    onClick={() => updateSetting('theme', 'light')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      settings.theme === 'light'
                        ? 'border-neutral-500 bg-neutral-800/90 text-white font-bold shadow-md ring-1 ring-neutral-400/30'
                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Sun className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-semibold block text-white">{t.themeLight}</span>
                        <span className="text-[10px] text-neutral-400">Luminosité & clarté diurne</span>
                      </div>
                    </div>
                    {settings.theme === 'light' && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>
              </div>

              {/* Effet Pure Glass (Translucidité & Verre Dépoli) */}
              <div className="flex flex-col gap-3.5 bg-neutral-900/60 p-4.5 rounded-xl border border-neutral-800">
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
                <div className="flex flex-col gap-2.5 pt-1">
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

              {/* Couleur d'Accentuation */}
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">{t.accentColor}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ACCENT_OPTIONS.map((acc) => {
                    const isSelected = settings.accent === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => updateSetting('accent', acc.id)}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-neutral-400 bg-neutral-800 text-white font-semibold ring-1 ring-neutral-400/30 shadow-xs'
                            : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
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

              {/* Style du Visualiseur Audio */}
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">{t.visualizerStyle}</label>
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
                      className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                        settings.visualizerStyle === style.id
                          ? 'border-neutral-400 bg-neutral-800 text-white font-bold ring-1 ring-neutral-400/30'
                          : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIO & ÉCOUTE */}
          {activeTab === 'audio' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Fondu Enchaîné (Crossfade) */}
              <div className="flex items-center justify-between bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700/60 transition-colors">
                <div>
                  <span className="font-semibold text-neutral-200 block text-xs">{t.crossfade}</span>
                  <span className="text-neutral-400 text-[11px] leading-relaxed">{t.crossfadeDesc}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={settings.crossfadeDuration}
                    onChange={(e) => updateSetting('crossfadeDuration', parseInt(e.target.value, 10))}
                    className="w-28 accent-emerald-500 cursor-pointer"
                  />
                  <span className="font-mono text-neutral-200 w-8 text-right font-bold text-xs">
                    {settings.crossfadeDuration}s
                  </span>
                </div>
              </div>

              {/* Lecture Sans Interruption (Gapless) */}
              <div className="flex items-center justify-between bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700/60 transition-colors">
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-200 block text-xs">{t.gapless}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                      {t.gaplessBadge}
                    </span>
                  </div>
                  <span className="text-neutral-400 text-[11px] block mt-1 leading-relaxed">
                    {t.gaplessDesc}
                  </span>
                </div>
                <ToggleSwitch
                  id="settings-gapless-playback-toggle"
                  checked={settings.gaplessPlayback ?? true}
                  onChange={(val) => updateSetting('gaplessPlayback', val)}
                  accent={accent}
                />
              </div>

              {/* Harmonisation du Volume Sonore */}
              <div className="flex flex-col gap-3 bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700/60 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-200 block text-xs">{t.normalization}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                        {t.normalizationBadge}
                      </span>
                    </div>
                    <span className="text-neutral-400 text-[11px] block mt-1 leading-relaxed">
                      {t.normalizationDesc}
                    </span>
                  </div>
                  <ToggleSwitch
                    id="settings-volume-normalization-toggle"
                    checked={settings.volumeNormalization}
                    onChange={(val) => updateSetting('volumeNormalization', val)}
                    accent={accent}
                  />
                </div>

                {settings.volumeNormalization && (
                  <div className="pt-3 border-t border-neutral-800/80 flex flex-col gap-2">
                    <span className="text-[11px] text-neutral-400 font-medium">Standard cible :</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'streaming', label: t.targetStreaming },
                        { id: 'replaygain', label: t.targetReplayGain },
                        { id: 'broadcast', label: t.targetBroadcast },
                      ].map((target) => (
                        <button
                          key={target.id}
                          type="button"
                          onClick={() => updateSetting('normalizationTarget', target.id as any)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer text-center truncate border ${
                            (settings.normalizationTarget ?? 'streaming') === target.id
                              ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50 font-bold shadow-xs'
                              : 'bg-neutral-950/60 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:border-neutral-700'
                          }`}
                        >
                          {target.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cache Automatique des Favoris */}
              <div className="flex items-center justify-between bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700/60 transition-colors">
                <div>
                  <span className="font-semibold text-neutral-200 block text-xs">{t.autoCache}</span>
                  <span className="text-neutral-400 text-[11px] leading-relaxed">
                    {t.autoCacheDesc}
                  </span>
                </div>
                <ToggleSwitch
                  checked={settings.autoCacheFavorites}
                  onChange={(val) => updateSetting('autoCacheFavorites', val)}
                  accent={accent}
                />
              </div>

              {/* Lecteur Compact & Mode Discret */}
              <div className="flex flex-col gap-3.5 bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700/60 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-neutral-200 block text-xs">{t.compactDock}</span>
                    <span className="text-neutral-400 text-[11px] leading-relaxed">
                      {t.compactDockDesc}
                    </span>
                  </div>
                  <select
                    value={settings.compactPlayerDock || 'bottom'}
                    onChange={(e) => updateSetting('compactPlayerDock', e.target.value as any)}
                    className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-neutral-200 cursor-pointer focus:outline-none focus:border-emerald-500"
                  >
                    <option value="bottom">{t.dockBottom}</option>
                    <option value="top">{t.dockTop}</option>
                    <option value="floating">{t.dockFloating}</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                  <div>
                    <span className="text-xs font-semibold text-neutral-300 block">{t.ghostMode}</span>
                    <span className="text-neutral-500 text-[11px]">
                      {t.ghostModeDesc}
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={!!settings.compactPlayerGhost}
                    onChange={(val) => updateSetting('compactPlayerGhost', val)}
                    accent={accent}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GÉNÉRAL & SYSTÈME */}
          {activeTab === 'general' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-150">
              {/* Langue & Région */}
              <div className="flex flex-col gap-3.5 bg-neutral-900/60 p-4.5 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs uppercase tracking-wider text-neutral-300 font-bold">{t.languageSection}</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/25 font-semibold flex items-center gap-2">
                    <CountryFlag code={currentLang.code} size="sm" />
                    <span>{currentLang.name}</span>
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  {t.languageDescription}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = (settings.language || 'fr') === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        id={`language-option-${lang.code}`}
                        onClick={() => updateSetting('language', lang.code)}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/15 text-white font-bold ring-1 ring-emerald-500/30 shadow-xs'
                            : 'border-neutral-800 bg-neutral-950/60 text-neutral-300 hover:text-white hover:border-neutral-700 hover:bg-neutral-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CountryFlag code={lang.code} size="md" />
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

              {/* Contrôles Multimédias Windows (SMTC) */}
              <div className="flex items-center justify-between bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700/60 transition-colors">
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-200 block text-xs">{t.smtcTitle}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                      {t.smtcBadge}
                    </span>
                  </div>
                  <span className="text-neutral-400 text-[11px] block mt-1 leading-relaxed">
                    {t.smtcDesc}
                  </span>
                </div>
                <ToggleSwitch
                  id="settings-smtc-toggle"
                  checked={settings.smtcEnabled ?? true}
                  onChange={(val) => updateSetting('smtcEnabled', val)}
                  accent="blue"
                />
              </div>

              {/* Discord Rich Presence (RPC) */}
              <div className="flex items-center justify-between bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700/60 transition-colors">
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-200 block text-xs">{t.discordRpcTitle}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30">
                      {t.discordRpcBadge}
                    </span>
                  </div>
                  <span className="text-neutral-400 text-[11px] block mt-1 leading-relaxed">
                    {t.discordRpcDesc}
                  </span>
                </div>
                <ToggleSwitch
                  id="settings-discord-rpc-toggle"
                  checked={settings.discordRpcEnabled ?? true}
                  onChange={(val) => updateSetting('discordRpcEnabled', val)}
                  accent="violet"
                />
              </div>
            </div>
          )}

          {/* TAB 4: MOTEURS & FICHIERS */}
          {activeTab === 'system' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-150">
              {/* Bibliothèque Locale & Détection Musicale PC */}
              <div className="flex flex-col gap-3.5 bg-neutral-900/60 p-4.5 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs uppercase tracking-wider text-neutral-300 font-bold">Bibliothèque & Détection Musicale PC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleScanMusicNow}
                      disabled={isScanningSettings}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScanningSettings ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                      <span>{isScanningSettings ? 'Scan...' : 'Scanner le PC'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddMusicFolder}
                      disabled={isScanningSettings}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Ajouter un dossier...</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  FlowLuna surveille automatiquement vos dossiers audio (<strong className="text-white">Musique</strong>, <strong className="text-white">OneDrive</strong>, <strong className="text-white">Téléchargements</strong> et dossiers personnalisés) et indexe instantanément les fichiers.
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
              <div className="flex flex-col gap-3.5 bg-neutral-900/60 p-4.5 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-rose-400" />
                    <span className="text-xs uppercase tracking-wider text-neutral-300 font-bold">Moteur de Téléchargement & Binaires Windows</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdateYtdlp}
                    disabled={isUpdatingYtdlp}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingYtdlp ? 'animate-spin text-rose-400' : 'text-neutral-400'}`} />
                    <span>{isUpdatingYtdlp ? 'Mise à jour...' : 'Mettre à jour yt-dlp'}</span>
                  </button>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  FlowLuna utilise <strong className="text-white">yt-dlp.exe</strong> pour l'extraction de métadonnées et <strong className="text-white">ffmpeg.exe</strong> pour le réencodage haute fidélité (FLAC, MP3 320k, WAV, 4K).
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* yt-dlp card */}
                  <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 flex flex-col gap-2">
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
                  <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 flex flex-col gap-2">
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

              {/* Moteur Multimédia LibVLCSharp (VideoLAN) */}
              <div className="flex flex-col gap-3.5 bg-neutral-900/60 p-4.5 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-amber-400" />
                    <span className="text-xs uppercase tracking-wider text-neutral-300 font-bold">Moteur Multimédia LibVLCSharp (VideoLAN)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdateLibVlc}
                    disabled={isUpdatingLibVlc}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-500/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingLibVlc ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
                    <span>{isUpdatingLibVlc ? 'Vérification...' : 'Vérifier / Mettre à jour LibVLCSharp'}</span>
                  </button>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  FlowLuna est propulsé par le moteur officiel <strong className="text-white">LibVLCSharp / VideoLAN</strong> (moteur audio/vidéo universel) garantissant un décodage matériel ultra-rapide de tous les formats audio & vidéo.
                </p>

                {libVlcMessage && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
                      libVlcMessage.type === 'success'
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    {libVlcMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{libVlcMessage.text}</span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-xs">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-200">LibVLCSharp Audio & Video Core</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                          Opérationnel • v3.9.4
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        Moteur multimédia natif haute performance • LibVLC .NET / WinUI
                      </span>
                    </div>
                  </div>
                  <a
                    href="https://github.com/videolan/libvlcsharp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-mono font-semibold"
                  >
                    GitHub LibVLCSharp ↗
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RACCOURCIS CLAVIER */}
          {activeTab === 'shortcuts' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-purple-400" />
                  <span className="text-xs uppercase tracking-wider text-neutral-300 font-bold">{t.shortcutsTitle}</span>
                </div>
                <span className="text-[11px] text-neutral-400 font-mono">
                  13 raccourcis configurés
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {SHORTCUT_GROUPS.map((group) => (
                  <div key={group.title} className="flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-neutral-300">{group.title}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.shortcuts.map((sc) => (
                        <div
                          key={sc.key}
                          className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700/80 transition-colors"
                        >
                          <span className="text-xs text-neutral-300">{sc.desc}</span>
                          <kbd className="font-mono px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-700/80 text-neutral-200 text-xs font-semibold shadow-xs">
                            {sc.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-[#0e0e16] flex items-center justify-between">
          <span className="text-[11px] text-neutral-500 font-mono">
            FlowLuna v{APP_VERSION} • Tous les réglages sont sauvegardés automatiquement
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white transition-all cursor-pointer active:scale-95 border border-neutral-700/60"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

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
  Tv,
  Sliders,
  Download,
  ArrowUpCircle,
  ExternalLink,
  Zap,
  Disc,
  Trash2,
  Key,
  Eye,
  EyeOff,
  Bot,
  Cloud,
  Server,
  RotateCcw,
  Info,
} from 'lucide-react';
import {
  PlayerSettings,
  AccentColor,
  APP_VERSION,
  AppUpdateInfo,
  AppUpdateProgress,
  DEFAULT_MARATHON_CONFIG,
  AIProviderId,
  AISettings,
  DEFAULT_AI_SETTINGS,
} from '../types';
import { SUPPORTED_LANGUAGES, getT } from '../i18n';
import { CountryFlag } from './CountryFlag';
import { backgroundScanner } from '../services/backgroundScanner';
import { saveTracks } from '../services/audioDb';
import { testAnimeSkipApiKey, testCloudAiApiKey } from '../services/openingDetectorService';
import { AI_PROVIDERS, getEffectiveAiConfig, fetchAvailableLocalModels, testAiConnection } from '../services/aiService';
import { compareSemVer } from '../utils/semver';
import { ClearCacheModal } from './ClearCacheModal';
import { formatBytes } from '../services/cacheCleanerService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PlayerSettings;
  onChange: (settings: PlayerSettings) => void;
  tracksCount?: number;
  playlistsCount?: number;
  onDataReload?: () => Promise<void> | void;
  initialTab?: SettingsTab;
  appUpdateInfo?: AppUpdateInfo | null;
  appVersion?: string;
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

const ACCENT_SUBTLE_BTN: Record<AccentColor, string> = {
  emerald: 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-500/30',
  violet: 'bg-violet-950/80 hover:bg-violet-900 text-violet-300 border-violet-500/30',
  blue: 'bg-blue-950/80 hover:bg-blue-900 text-blue-300 border-blue-500/30',
  amber: 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-500/30',
  rose: 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-500/30',
  cyan: 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border-cyan-500/30',
};

const ACCENT_TEXT: Record<AccentColor, string> = {
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  cyan: 'text-cyan-400',
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
  {
    title: 'Lecteur Vidéo & Mode Marathon',
    shortcuts: [
      { key: 'S', desc: "Passer l'opening (Skip Opening)" },
      { key: 'N', desc: "Épisode suivant / Forcer l'enchaînement immédiat" },
      { key: 'Échap', desc: "Annuler l'enchaînement automatique / Réduire en PiP" },
      { key: 'Double-tap / Clic', desc: 'Reculer (-10s à gauche) / Avancer (+10s à droite)' },
    ],
  },
];

export type SettingsTab = 'appearance' | 'audio' | 'video' | 'ai' | 'general' | 'system' | 'shortcuts';

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
  initialTab,
  appUpdateInfo: initialAppUpdateInfo,
  appVersion,
}) => {
  const effectiveVersion = appVersion || APP_VERSION;
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'appearance');
  const [binariesStatus, setBinariesStatus] = useState<any>(null);
  const [isUpdatingYtdlp, setIsUpdatingYtdlp] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isScanningSettings, setIsScanningSettings] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [isUpdatingLibVlc, setIsUpdatingLibVlc] = useState(false);
  const [libVlcMessage, setLibVlcMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // App Auto-Update State
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [appUpdateInfo, setAppUpdateInfo] = useState<AppUpdateInfo | null>(initialAppUpdateInfo || null);
  const [isDownloadingAppUpdate, setIsDownloadingAppUpdate] = useState(false);
  const [appUpdateProgress, setAppUpdateProgress] = useState<AppUpdateProgress | null>(null);
  const [updateAlertMessage, setUpdateAlertMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showRestartModal, setShowRestartModal] = useState(false);

  // Clear Cache Modal State & Toast Notification
  const [isClearCacheModalOpen, setIsClearCacheModalOpen] = useState(false);
  const [cacheToastMessage, setCacheToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Anime-Skip & AI Skip States
  const [showAnimeSkipKey, setShowAnimeSkipKey] = useState(false);
  const [isTestingAnimeSkip, setIsTestingAnimeSkip] = useState(false);
  const [animeSkipTestResult, setAnimeSkipTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [showAiKey, setShowAiKey] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    models?: string[];
  } | null>(null);

  const effectiveAiSettings: AISettings = settings.aiSettings || DEFAULT_AI_SETTINGS;
  const initialActiveProvider: AIProviderId =
    effectiveAiSettings.activeProvider ||
    (settings.skipOpAiProvider as AIProviderId) ||
    'gemini';

  const [selectedProviderId, setSelectedProviderId] = useState<AIProviderId>(initialActiveProvider);
  const [selectedAiCategory, setSelectedAiCategory] = useState<'cloud' | 'local'>(
    AI_PROVIDERS[initialActiveProvider]?.category || 'cloud'
  );
  const [detectedLocalModels, setDetectedLocalModels] = useState<string[]>([]);
  const [isFetchingLocalModels, setIsFetchingLocalModels] = useState(false);

  const updateAiSetting = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    const currentAi = settings.aiSettings || DEFAULT_AI_SETTINGS;
    const updatedAi: AISettings = {
      ...currentAi,
      [key]: value,
    };
    const effective = getEffectiveAiConfig(updatedAi, updatedAi.activeProvider);
    onChange({
      ...settings,
      aiSettings: updatedAi,
      skipOpAiProvider: updatedAi.activeProvider,
      skipOpAiApiKey: effective.apiKey || '',
      skipOpAiEndpoint: effective.endpoint,
      skipOpAiModel: effective.model,
    });
  };

  const updateProviderConfig = (providerId: AIProviderId, updates: Record<string, any>) => {
    const currentAi = settings.aiSettings || DEFAULT_AI_SETTINGS;
    const currentProviderConf = (currentAi as any)[providerId] || {};
    const updatedAi: AISettings = {
      ...currentAi,
      [providerId]: {
        ...currentProviderConf,
        ...updates,
      },
    };
    const effective = getEffectiveAiConfig(updatedAi, updatedAi.activeProvider);
    onChange({
      ...settings,
      aiSettings: updatedAi,
      skipOpAiProvider: updatedAi.activeProvider,
      skipOpAiApiKey: effective.apiKey || '',
      skipOpAiEndpoint: effective.endpoint,
      skipOpAiModel: effective.model,
    });
  };

  const handleTestAnimeSkip = async () => {
    setIsTestingAnimeSkip(true);
    setAnimeSkipTestResult(null);
    try {
      const res = await testAnimeSkipApiKey(settings.animeSkipClientId);
      setAnimeSkipTestResult(res);
    } catch (err: any) {
      setAnimeSkipTestResult({ success: false, message: err?.message || 'Erreur lors du test' });
    } finally {
      setIsTestingAnimeSkip(false);
    }
  };

  const handleTestAiKey = async (overrideConfig?: any) => {
    setIsTestingAi(true);
    setAiTestResult(null);
    try {
      const currentAi = settings.aiSettings || DEFAULT_AI_SETTINGS;
      const targetProvider = overrideConfig?.provider || selectedProviderId || currentAi.activeProvider;
      const config = overrideConfig || getEffectiveAiConfig(currentAi, targetProvider);
      const res = await testAiConnection(config);
      setAiTestResult(res);
      if (res.models && res.models.length > 0) {
        setDetectedLocalModels(res.models);
      }
    } catch (err: any) {
      setAiTestResult({ success: false, message: err?.message || 'Erreur lors du test' });
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleFetchLocalModels = async (provider: 'ollama' | 'lmstudio') => {
    setIsFetchingLocalModels(true);
    try {
      const currentAi = settings.aiSettings || DEFAULT_AI_SETTINGS;
      const conf = (currentAi as any)[provider];
      const endpoint = conf?.endpoint || AI_PROVIDERS[provider].defaultEndpoint;
      const res = await fetchAvailableLocalModels(provider, endpoint);
      if (res.success && res.models.length > 0) {
        setDetectedLocalModels(res.models);
        if (!conf?.model || conf?.model === AI_PROVIDERS[provider].defaultModel) {
          updateProviderConfig(provider, { model: res.models[0] });
        }
      }
    } finally {
      setIsFetchingLocalModels(false);
    }
  };

  useEffect(() => {
    if (initialAppUpdateInfo) {
      const isReallyNewer = compareSemVer(initialAppUpdateInfo.latestVersion, effectiveVersion) > 0;
      setAppUpdateInfo({
        ...initialAppUpdateInfo,
        currentVersion: effectiveVersion,
        hasUpdate: isReallyNewer,
      });
    }
  }, [initialAppUpdateInfo, effectiveVersion]);


  useEffect(() => {
    if (cacheToastMessage) {
      const timer = setTimeout(() => setCacheToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [cacheToastMessage]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

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
      const newlyDiscovered = await backgroundScanner.runScan(false, true);
      const count = newlyDiscovered?.length ?? 0;
      setScanMessage({
        text: count > 0
          ? `${count} morceau(x) indexé(s) et synchronisé(s) sur le PC !`
          : 'Bibliothèque synchronisée avec vos dossiers musicaux.',
        type: 'success',
      });
      if (onDataReload) await onDataReload();
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
            if (Array.isArray(data.tracks) && data.tracks.length > 0) {
              await saveTracks(data.tracks);
              await backgroundScanner.runScan(false, true);
            }
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

  const handleCheckAppUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateAlertMessage(null);
    try {
      const res = await fetch('/api/app/check-update');
      if (res.ok) {
        const data: AppUpdateInfo = await res.json();
        const isReallyNewer = compareSemVer(data.latestVersion, effectiveVersion) > 0;
        const normalizedData: AppUpdateInfo = {
          ...data,
          currentVersion: effectiveVersion,
          hasUpdate: isReallyNewer,
        };
        setAppUpdateInfo(normalizedData);
        if (isReallyNewer) {
          setUpdateAlertMessage({
            text: `Nouvelle version v${data.latestVersion} disponible !`,
            type: 'info',
          });
        } else {
          setUpdateAlertMessage({
            text: `Votre application est à jour (v${effectiveVersion}).`,
            type: 'success',
          });
        }

      } else {
        throw new Error('Erreur lors de la vérification de mise à jour');
      }
    } catch {
      setUpdateAlertMessage({
        text: 'Impossible de joindre le serveur de mise à jour.',
        type: 'error',
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleStartAppUpdateDownload = async () => {
    setIsDownloadingAppUpdate(true);
    setUpdateAlertMessage(null);
    try {
      const res = await fetch('/api/app/download-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downloadUrl: appUpdateInfo?.downloadUrl,
          version: appUpdateInfo?.latestVersion,
        }),
      });

      if (!res.ok) throw new Error('Erreur de démarrage du téléchargement');

      const pollTimer = setInterval(async () => {
        try {
          const progRes = await fetch('/api/app/update-progress');
          if (progRes.ok) {
            const prog: AppUpdateProgress = await progRes.json();
            setAppUpdateProgress(prog);

            if (prog.status === 'ready_to_install') {
              clearInterval(pollTimer);
              setIsDownloadingAppUpdate(false);
              setUpdateAlertMessage({
                text: 'Mise à jour téléchargée avec succès ! Prête pour l’installation.',
                type: 'success',
              });
            } else if (prog.status === 'error') {
              clearInterval(pollTimer);
              setIsDownloadingAppUpdate(false);
              setUpdateAlertMessage({
                text: prog.message || 'Erreur lors du téléchargement de la mise à jour',
                type: 'error',
              });
            }
          }
        } catch {
          clearInterval(pollTimer);
          setIsDownloadingAppUpdate(false);
        }
      }, 500);
    } catch (e: any) {
      setIsDownloadingAppUpdate(false);
      setUpdateAlertMessage({
        text: e.message || 'Erreur lors du téléchargement',
        type: 'error',
      });
    }
  };

  const handleApplyAppUpdate = async () => {
    setShowRestartModal(false);
    try {
      if (window.electronAPI?.applyUpdate) {
        await window.electronAPI.applyUpdate(appUpdateProgress?.installerPath);
      } else {
        await fetch('/api/app/apply-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ installerPath: appUpdateProgress?.installerPath }),
        });
      }
    } catch {}
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
    { id: 'video' as SettingsTab, label: 'Vidéo', icon: Film },
    { id: 'ai' as SettingsTab, label: "Modèles d'IA", icon: Bot },
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
        className="w-full max-w-3xl max-h-[88vh] rounded-2xl border border-white/10 dark:border-white/10 glass-modal text-neutral-900 dark:text-neutral-100 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/10 bg-white/[0.04] dark:bg-black/[0.20] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 dark:bg-white/5 text-neutral-800 dark:text-white border border-white/10 shadow-xs">
              <Settings className="w-5 h-5 text-neutral-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">{t.settingsTitle}</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.settingsSubtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-white/10 bg-white/[0.02] dark:bg-black/[0.12] overflow-x-auto scrollbar-none flex-shrink-0 backdrop-blur-md">
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
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 bg-transparent">
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

              {/* Choix du Matériau / Effet Visuel : Pure Glass vs Mica & Acrylic */}
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  {t.visualEffectMode || 'Effet Visuel & Matériau de Fond'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    id="effect-glass-btn"
                    onClick={() => updateSetting('backdropEffect', 'glass')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      (settings.backdropEffect || 'glass') === 'glass'
                        ? 'border-neutral-500 bg-neutral-800/90 text-white font-bold shadow-md ring-1 ring-neutral-400/30'
                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-semibold block text-white">
                          {t.visualEffectGlass || 'Pure Glass (Actuel)'}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {t.visualEffectGlassDesc || 'Verre dépoli vibrant, halos lumineux & intensité réglable'}
                        </span>
                      </div>
                    </div>
                    {(settings.backdropEffect || 'glass') === 'glass' && (
                      <Check className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    id="effect-acrylic-btn"
                    onClick={() => updateSetting('backdropEffect', 'acrylic')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      settings.backdropEffect === 'acrylic' || settings.backdropEffect === 'mica'
                        ? 'border-neutral-500 bg-neutral-800/90 text-white font-bold shadow-md ring-1 ring-neutral-400/30'
                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-semibold block text-white">
                          {t.visualEffectAcrylic || t.visualEffectMica || 'Acrylic (Windows 11)'}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {t.visualEffectAcrylicDesc || t.visualEffectMicaDesc || 'Transparence dépolie fluide de bureau (Desktop Acrylic)'}
                        </span>
                      </div>
                    </div>
                    {(settings.backdropEffect === 'acrylic' || settings.backdropEffect === 'mica') && (
                      <Check className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Si Pure Glass actif : Paramètres d'intensité */}
              {(settings.backdropEffect || 'glass') === 'glass' ? (
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
              ) : (
                /* Si Acrylic actif : Description, Réglage d'Intensité & Aperçu Fluent */
                <div className="flex flex-col gap-3.5 bg-neutral-900/60 p-4.5 rounded-xl border border-neutral-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                        Matériau Desktop Acrylic Fluent
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-400 border border-indigo-500/30">
                      {(settings.acrylicIntensity ?? 30)}% {(settings.acrylicIntensity ?? 30) === 30 ? 'Par défaut' : (settings.acrylicIntensity ?? 30) < 30 ? 'Ultra Clair' : (settings.acrylicIntensity ?? 30) >= 80 ? 'Opaque' : 'Équilibré'}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Le mode <strong className="text-white">Desktop Acrylic</strong> applique la transparence dépolie officielle de Windows 11. Grâce au flou d'arrière-plan DWM translucide, les fenêtres d'arrière-plan et le bureau apparaissent en transparence sous FlowLuna. Ajustez la translucidité ci-dessous.
                  </p>

                  {/* Slider de réglage de l'intensité acrylique (0% à 100%, par défaut 30%) */}
                  <div className="flex flex-col gap-2.5 pt-1">
                    <div className="flex items-center justify-between text-xs text-neutral-300">
                      <span className="font-semibold">Transparence & Profondeur Acrylique</span>
                      <span className="font-mono text-indigo-400 font-bold">{(settings.acrylicIntensity ?? 30)}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-neutral-500 font-semibold w-8">0%</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={settings.acrylicIntensity ?? 30}
                        onChange={(e) => updateSetting('acrylicIntensity', parseInt(e.target.value, 10))}
                        className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                      />
                      <span className="text-[11px] font-mono text-indigo-400 font-bold w-10 text-right">100%</span>
                    </div>

                    {/* Raccourcis / Préréglages rapides */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {[
                        { value: 10, label: '10% Ultra Clair' },
                        { value: 30, label: '30% Par défaut' },
                        { value: 55, label: '55% Équilibré' },
                        { value: 85, label: '85% Opaque' },
                      ].map((preset) => {
                        const isActive = (settings.acrylicIntensity ?? 30) === preset.value;
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => updateSetting('acrylicIntensity', preset.value)}
                            className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all text-center cursor-pointer border ${
                              isActive
                                ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-200 font-bold shadow-xs ring-1 ring-indigo-500/30'
                                : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Visual Desktop Acrylic Preview */}
                  <div
                    className="mt-1 p-3.5 rounded-xl border border-white/15 relative overflow-hidden flex items-center justify-between transition-all"
                    style={{
                      backdropFilter: `blur(${Math.round(Math.min(50, Math.max(8, 16 + ((settings.acrylicIntensity ?? 30) / 100) * 32)))}px) saturate(140%)`,
                      WebkitBackdropFilter: `blur(${Math.round(Math.min(50, Math.max(8, 16 + ((settings.acrylicIntensity ?? 30) / 100) * 32)))}px) saturate(140%)`,
                      backgroundColor:
                        settings.theme === 'light'
                          ? `rgba(255, 255, 255, ${Math.min(0.95, Math.max(0.08, 0.45 * ((settings.acrylicIntensity ?? 30) / 30))).toFixed(3)})`
                          : `rgba(18, 18, 28, ${Math.min(0.95, Math.max(0.08, 0.45 * ((settings.acrylicIntensity ?? 30) / 30))).toFixed(3)})`,
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
                    }}
                  >
                    <div className="flex items-center gap-2.5 z-10">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                      <span className="text-xs font-semibold text-neutral-200">
                        {settings.theme === 'dark' ? 'Surface Acrylique Translucide Sombre' : 'Surface Acrylique Translucide Claire'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-300 font-semibold px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/20 z-10">
                      DWM Desktop Acrylic ({(settings.acrylicIntensity ?? 30)}%)
                    </span>
                  </div>
                </div>
              )}

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
              {/* Enchaînement & Transitions Audio (Exclusif & Intelligent) */}
              <div className="flex flex-col gap-3 bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700/60 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-neutral-200 block text-xs">
                      Enchaînement & Transitions Audio
                    </span>
                    <span className="text-neutral-400 text-[11px] leading-relaxed">
                      Choisissez le comportement d'enchaînement entre les morceaux
                    </span>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold border ${
                      settings.gaplessPlayback
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                        : settings.crossfadeDuration > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-neutral-800/60 text-neutral-400 border-neutral-700/50'
                    }`}
                  >
                    {settings.gaplessPlayback
                      ? 'ZÉRO BLANC'
                      : settings.crossfadeDuration > 0
                      ? `FONDU ${settings.crossfadeDuration}s`
                      : 'STANDARD'}
                  </span>
                </div>

                {/* 3 Choix exclusifs de transition */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
                  {/* Option 1: Gapless (Zéro Blanc) */}
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...settings, gaplessPlayback: true, crossfadeDuration: 0 });
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      settings.gaplessPlayback
                        ? 'bg-sky-500/15 border-sky-500/50 text-white shadow-xs ring-1 ring-sky-500/30'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-sky-300">
                      <Zap className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Zéro Blanc (Gapless)</span>
                    </div>
                    <span className="text-[11px] text-neutral-300 leading-tight">
                      Enchaîne les pistes instantanément sans aucun silence à 100% de volume (idéal albums live et mix).
                    </span>
                    <span className="text-[10px] font-mono text-sky-400/80 uppercase font-semibold">
                      Recommandé Hi-Fi
                    </span>
                  </button>

                  {/* Option 2: Crossfade (Fondu Enchaîné) */}
                  <button
                    type="button"
                    onClick={() => {
                      const dur = settings.crossfadeDuration > 0 ? settings.crossfadeDuration : 3;
                      onChange({ ...settings, gaplessPlayback: false, crossfadeDuration: dur });
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      !settings.gaplessPlayback && settings.crossfadeDuration > 0
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-xs ring-1 ring-emerald-500/30'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-300">
                      <Sliders className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Fondu Enchaîné</span>
                    </div>
                    <span className="text-[11px] text-neutral-300 leading-tight">
                      Transition fluide avec fondu croisé progressif entre la fin et le début de chaque morceau.
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400/80 uppercase font-semibold">
                      Style Radio / DJ
                    </span>
                  </button>

                  {/* Option 3: Standard (Fin naturelle) */}
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...settings, gaplessPlayback: false, crossfadeDuration: 0 });
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      !settings.gaplessPlayback && settings.crossfadeDuration === 0
                        ? 'bg-neutral-800/40 border-neutral-600 text-white shadow-xs ring-1 ring-neutral-500/30'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-300">
                      <Disc className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span>Fin Naturelle</span>
                    </div>
                    <span className="text-[11px] text-neutral-300 leading-tight">
                      Laisse chaque morceau se terminer normalement sans aucune modification sonore.
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400 uppercase font-semibold">
                      Standard
                    </span>
                  </button>
                </div>

                {/* Slider de durée si Fondu Enchaîné est sélectionné */}
                {!settings.gaplessPlayback && settings.crossfadeDuration > 0 && (
                  <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-neutral-200 block">Durée du fondu croisé</span>
                      <span className="text-[11px] text-neutral-400">Temps de chevauchement progressif</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <input
                        type="range"
                        min={1}
                        max={12}
                        step={1}
                        value={settings.crossfadeDuration}
                        onChange={(e) => updateSetting('crossfadeDuration', parseInt(e.target.value, 10))}
                        className="w-32 accent-emerald-500 cursor-pointer"
                      />
                      <span className="font-mono text-emerald-300 w-10 text-right font-bold text-xs">
                        {settings.crossfadeDuration}s
                      </span>
                    </div>
                  </div>
                )}

                {/* Note d'exclusion vidéo */}
                <div className="flex items-center gap-2 pt-2 text-[11px] text-neutral-400 border-t border-neutral-800/50">
                  <Film className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>
                    Actif sur la musique uniquement — Désactivé automatiquement lors du visionnage de vidéos (dialogues et génériques intacts).
                  </span>
                </div>
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
                    <span className="text-[10px] text-neutral-500 italic mt-0.5">
                      Idéal pour égaliser le niveau sonore entre musiques douces et fortes, ou préserver les voix en mode Cinéma.
                    </span>
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

              {/* Mode Discret (Ghost) */}
              <div className="flex items-center justify-between bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700/60 transition-colors">
                <div>
                  <span className="text-xs font-semibold text-neutral-300 block">{t.ghostMode}</span>
                  <span className="text-neutral-500 text-[11px] leading-relaxed">
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
          )}

          {/* TAB : VIDÉO & LECTURE */}
          {activeTab === 'video' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-150">
              {/* En-tête de section */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-sky-400" />
                  <span className="text-xs uppercase tracking-wider text-neutral-300 font-bold">
                    Paramètres Vidéo & Pas de Lecture
                  </span>
                </div>
              </div>

              {/* 1. Intervalle de saut temporel (Skip & Molette) */}
              <div className="flex flex-col gap-3.5 bg-neutral-900/60 p-4.5 rounded-xl border border-neutral-800 hover:border-neutral-700/60 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-neutral-200 block text-xs">
                      Intervalle de saut temporel (Skip & Molette)
                    </span>
                    <span className="text-neutral-400 text-[11px] leading-relaxed">
                      Définit le pas temporel en secondes lors d'un saut (flèches clavier, boutons d'avance/retour, double-clic et défilement molette).
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-sky-950/80 text-sky-400 border border-sky-500/30 whitespace-nowrap">
                    {settings.videoSkipForwardInterval ?? 10}s{' '}
                    {(settings.videoSkipForwardInterval ?? 10) === 10
                      ? '(Par défaut)'
                      : (settings.videoSkipForwardInterval ?? 10) >= 60
                      ? `(${Math.floor((settings.videoSkipForwardInterval ?? 10) / 60)} min${
                          (settings.videoSkipForwardInterval ?? 10) % 60 > 0
                            ? ` ${(settings.videoSkipForwardInterval ?? 10) % 60}s`
                            : ''
                        })`
                      : ''}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 pt-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-neutral-500 font-semibold w-8">5s</span>
                    <input
                      type="range"
                      min={5}
                      max={90}
                      step={5}
                      value={settings.videoSkipForwardInterval ?? 10}
                      onChange={(e) => updateSetting('videoSkipForwardInterval', parseInt(e.target.value, 10))}
                      className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                    />
                    <span className="text-[11px] font-mono text-sky-400 font-bold w-16 text-right">90s (1m30)</span>
                  </div>

                  {/* Raccourcis / Préréglages rapides */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                    {[
                      { value: 5, label: '5s' },
                      { value: 10, label: '10s (Défaut)' },
                      { value: 15, label: '15s' },
                      { value: 30, label: '30s' },
                      { value: 60, label: '60s (1 min)' },
                      { value: 90, label: '90s (1m30)' },
                    ].map((preset) => {
                      const isActive = (settings.videoSkipForwardInterval ?? 10) === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => updateSetting('videoSkipForwardInterval', preset.value)}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all text-center cursor-pointer border ${
                            isActive
                              ? 'border-sky-500/60 bg-sky-500/20 text-sky-200 font-bold shadow-xs ring-1 ring-sky-500/30'
                              : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Format & Ratio d'affichage (Aspect Ratio) */}
              <div className="flex flex-col gap-3.5 bg-neutral-900/60 p-4.5 rounded-xl border border-neutral-800 hover:border-neutral-700/60 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-sky-400" />
                    <span className="font-semibold text-neutral-200 block text-xs">
                      Ratio & Format d'affichage (Aspect Ratio)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-sky-950/80 text-sky-400 border border-sky-500/30 uppercase">
                    {settings.videoAspectRatio ?? 'contain'}
                  </span>
                </div>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Détermine la mise à l'échelle de la vidéo à l'écran : ajuster avec barres d'adaptation, remplir sans bandes noires ou forcer le ratio 16:9.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {[
                    {
                      id: 'contain' as const,
                      label: 'Ajuster (Contain)',
                      desc: 'Conserve les proportions originales sans déformation (recommandé).',
                      badge: 'Défaut',
                    },
                    {
                      id: 'cover' as const,
                      label: 'Remplir (Cover)',
                      desc: 'Occupe tout l\'écran sans bandes noires avec léger zoom centré.',
                      badge: 'Immersif',
                    },
                    {
                      id: '16-9' as const,
                      label: 'Format 16:9',
                      desc: 'Force le ratio panoramique standard 16:9 sur tout contenu vidéo.',
                      badge: '16:9',
                    },
                  ].map((option) => {
                    const isSelected = (settings.videoAspectRatio ?? 'contain') === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => updateSetting('videoAspectRatio', option.id)}
                        className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer gap-2 ${
                          isSelected
                            ? 'bg-neutral-800/90 border-sky-400/60 text-white ring-1 ring-sky-400/40 shadow-xs'
                            : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-200">{option.label}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-neutral-500'
                            }`}
                          >
                            {option.badge}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400 leading-tight">
                          {option.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Détection & Saut d'Opening (Skip OP) */}
              <div className="flex flex-col gap-3 bg-neutral-900/60 p-4.5 rounded-xl border border-neutral-800 hover:border-neutral-700/60 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="pr-4">
                    <span className="font-semibold text-neutral-200 block text-xs">
                      Fonctionnalité Skip Opening (Détection des génériques)
                    </span>
                    <span className="text-neutral-400 text-[11px] leading-relaxed">
                      Active ou désactive complètement la détection des génériques. Si désactivé, le bouton « Passer l'opening » est totalement masqué sur le lecteur et les déclencheurs sont ignorés.
                    </span>
                  </div>
                  <ToggleSwitch
                    id="settings-enable-skip-op-toggle"
                    checked={settings.enableSkipOpening ?? true}
                    onChange={(val) => updateSetting('enableSkipOpening', val)}
                    accent={accent}
                  />
                </div>

                {/* Sous-option : Saut automatique si la fonctionnalité globale est activée */}
                {(settings.enableSkipOpening ?? true) && (
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80 animate-in fade-in duration-150">
                    <div className="pr-4">
                      <span className="font-medium text-neutral-300 block text-xs">
                        Saut automatique direct (Auto-Skip)
                      </span>
                      <span className="text-neutral-400 text-[11px] leading-relaxed">
                        Passe automatiquement à la fin de l'opening sans intervention manuelle. Désactivé : conserve l'opening et affiche le bouton manuel « Passer l'opening ».
                      </span>
                    </div>
                    <ToggleSwitch
                      id="settings-auto-skip-op-toggle-video"
                      checked={!!settings.autoSkipOpening}
                      onChange={(val) => updateSetting('autoSkipOpening', val)}
                      accent={accent}
                    />
                  </div>
                )}

                {/* Sous-option : Calage chirurgical aux silences audio (Time Adjustment inspiré d'intro-skipper) */}
                {(settings.enableSkipOpening ?? true) && (
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80 animate-in fade-in duration-150">
                    <div className="pr-4">
                      <span className="font-medium text-neutral-300 block text-xs flex items-center gap-1.5">
                        <span>Ajustement acoustique & Silences (Snapping)</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                          Inspiré Intro-Skipper
                        </span>
                      </span>
                      <span className="text-neutral-400 text-[11px] leading-relaxed">
                        Analyse les transitions sonores et cale chirurgicalement le début et la fin du saut sur les silences audio ou coupures réelles pour éliminer toute coupure brutale de réplique ou de musique.
                      </span>
                    </div>
                    <ToggleSwitch
                      id="settings-silence-snapping-toggle-video"
                      checked={settings.enableSilenceSnapping ?? true}
                      onChange={(val) => updateSetting('enableSilenceSnapping', val)}
                      accent={accent}
                    />
                  </div>
                )}

                {/* Sous-option : Clé API / Client ID Anime-Skip */}
                {(settings.enableSkipOpening ?? true) && (
                  <div className="flex flex-col gap-3 pt-3.5 border-t border-neutral-800/80 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-emerald-400" />
                        <div>
                          <span className="font-medium text-neutral-200 block text-xs">
                            Clé API / Client ID Anime-Skip (Optionnel)
                          </span>
                          <span className="text-neutral-400 text-[11px] leading-relaxed">
                            Permet d'utiliser votre propre compte Anime-Skip pour éviter tout rate-limiting. Laissez vide pour utiliser la clé partagée intégrée.
                          </span>
                        </div>
                      </div>
                      <a
                        href="https://anime-skip.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-sky-400 hover:text-sky-300 border border-sky-500/20 hover:border-sky-500/40 text-[11px] font-medium transition-colors shrink-0"
                        title="Ouvrir anime-skip.com dans le navigateur"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>anime-skip.com</span>
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showAnimeSkipKey ? 'text' : 'password'}
                          value={settings.animeSkipClientId || ''}
                          onChange={(e) => updateSetting('animeSkipClientId', e.target.value)}
                          placeholder="Client ID Anime-Skip (ex: DLyfrLMiQc3xCgAM...)"
                          className="w-full bg-neutral-950/80 border border-neutral-800 focus:border-emerald-500/60 rounded-lg px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 outline-none font-mono pr-9 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAnimeSkipKey(!showAnimeSkipKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                          title={showAnimeSkipKey ? 'Masquer la clé' : 'Afficher la clé'}
                        >
                          {showAnimeSkipKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleTestAnimeSkip}
                        disabled={isTestingAnimeSkip}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-medium border border-neutral-700/80 transition-all cursor-pointer shrink-0"
                      >
                        {isTestingAnimeSkip ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>Tester</span>
                      </button>
                    </div>

                    {animeSkipTestResult && (
                      <div
                        className={`flex items-center gap-2 p-2 rounded-lg text-[11px] border ${
                          animeSkipTestResult.success
                            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {animeSkipTestResult.success ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        )}
                        <span>{animeSkipTestResult.message}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Sous-option : Moteur d'Assistance IA pour la détection OP / ED */}
                {(settings.enableSkipOpening ?? true) && (
                  <div className="flex flex-col gap-3.5 pt-3.5 border-t border-neutral-800/80 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <div>
                          <span className="font-semibold text-neutral-200 block text-xs">
                            Assistance IA pour la Détection OP / ED (Mode en 2 temps)
                          </span>
                          <span className="text-neutral-400 text-[11px] leading-relaxed">
                            Améliore la détection lorsque les bases communautaires ne contiennent aucun marqueur (animes récents, versions Blu-Ray décalées ou OAVs).
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30">
                        {settings.skipOpAiMode === 'cloud'
                          ? 'IA Cloud'
                          : settings.skipOpAiMode === 'local'
                          ? 'IA Locale'
                          : 'Désactivé'}
                      </span>
                    </div>

                    {/* Sélecteur des 3 modes */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        {
                          id: 'disabled' as const,
                          label: 'Standard (Sans IA)',
                          badge: 'APIs seules',
                          desc: 'S\'en remet uniquement aux bases Aniskip & Anime-Skip.',
                        },
                        {
                          id: 'cloud' as const,
                          label: 'IA Cloud (Clé API)',
                          badge: 'Gemini / OpenAI',
                          desc: 'Analyse sémantique fine des sous-titres, paroles et karaokés.',
                        },
                        {
                          id: 'local' as const,
                          label: 'IA Locale (100% Hors-ligne)',
                          badge: 'Privé & Local',
                          desc: 'Empreinte acoustique inter-épisodes et transitions sonores (FFmpeg).',
                        },
                      ].map((modeOption) => {
                        const isSelected = (settings.skipOpAiMode ?? 'disabled') === modeOption.id;
                        return (
                          <button
                            key={modeOption.id}
                            type="button"
                            onClick={() => updateSetting('skipOpAiMode', modeOption.id)}
                            className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer gap-1.5 ${
                              isSelected
                                ? 'bg-violet-950/30 border-violet-500/60 text-white ring-1 ring-violet-500/40 shadow-xs'
                                : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-neutral-200">{modeOption.label}</span>
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                                  isSelected ? 'bg-violet-500/20 text-violet-300 font-bold' : 'text-neutral-500'
                                }`}
                              >
                                {modeOption.badge}
                              </span>
                            </div>
                            <span className="text-[10px] text-neutral-400 leading-tight">
                              {modeOption.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Configuration spécifique au Mode IA Cloud */}
                    {settings.skipOpAiMode === 'cloud' && (
                      <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-neutral-950/70 border border-violet-500/30 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-neutral-300">Fournisseur Cloud Actif :</span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('ai')}
                            className="text-[11px] text-violet-400 hover:text-violet-300 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <span>Ouvrir le Gestionnaire de Modèles d'IA</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Choix rapide du provider cloud */}
                        <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800 flex-wrap">
                          {(['gemini', 'openai', 'anthropic', 'mistral', 'custom'] as AIProviderId[]).map((pId) => {
                            const pMeta = AI_PROVIDERS[pId];
                            const isChosen = (settings.skipOpAiProvider || effectiveAiSettings.activeProvider) === pId;
                            return (
                              <button
                                key={pId}
                                type="button"
                                onClick={() => {
                                  updateSetting('skipOpAiProvider', pId);
                                  updateAiSetting('activeProvider', pId);
                                  setSelectedProviderId(pId);
                                }}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                                  isChosen
                                    ? 'bg-violet-500/30 text-violet-200 font-bold border border-violet-500/40 shadow-xs'
                                    : 'text-neutral-400 hover:text-neutral-200'
                                }`}
                              >
                                {pMeta.name}
                              </button>
                            );
                          })}
                        </div>

                        {/* Champ Clé API IA */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-neutral-400">
                              Clé API {AI_PROVIDERS[(settings.skipOpAiProvider as AIProviderId) || 'gemini']?.name || 'IA'} :
                            </span>
                            {AI_PROVIDERS[(settings.skipOpAiProvider as AIProviderId) || 'gemini']?.keyUrl && (
                              <a
                                href={AI_PROVIDERS[(settings.skipOpAiProvider as AIProviderId) || 'gemini']?.keyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-violet-400 hover:text-violet-300 hover:underline flex items-center gap-1"
                              >
                                <span>Obtenir une clé</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type={showAiKey ? 'text' : 'password'}
                                value={settings.skipOpAiApiKey || ''}
                                onChange={(e) => updateSetting('skipOpAiApiKey', e.target.value)}
                                placeholder={
                                  AI_PROVIDERS[(settings.skipOpAiProvider as AIProviderId) || 'gemini']?.keyPlaceholder ||
                                  'Clé API...'
                                }
                                className="w-full bg-neutral-900 border border-neutral-800 focus:border-violet-500/60 rounded-lg px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 outline-none font-mono pr-9 transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => setShowAiKey(!showAiKey)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                                title={showAiKey ? 'Masquer la clé' : 'Afficher la clé'}
                              >
                                {showAiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleTestAiKey(getEffectiveAiConfig(effectiveAiSettings, (settings.skipOpAiProvider as AIProviderId) || 'gemini'))}
                              disabled={isTestingAi || !settings.skipOpAiApiKey}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-medium border border-neutral-700/80 transition-all cursor-pointer shrink-0"
                            >
                              {isTestingAi ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" />
                              ) : (
                                <Bot className="w-3.5 h-3.5 text-violet-400" />
                              )}
                              <span>Tester</span>
                            </button>
                          </div>

                          {aiTestResult && (
                            <div
                              className={`flex items-center gap-2 p-2 rounded-lg text-[11px] border ${
                                aiTestResult.success
                                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                              }`}
                            >
                              {aiTestResult.success ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              )}
                              <span>{aiTestResult.message}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Configuration spécifique au Mode IA Locale (Ollama, LM Studio, Acoustique) */}
                    {settings.skipOpAiMode === 'local' && (
                      <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-neutral-950/70 border border-emerald-500/30 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Server className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-neutral-200">
                              Inférence Locale Privée (Ollama & LM Studio)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAiCategory('local');
                              setActiveTab('ai');
                            }}
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <span>Gérer les modèles locaux</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Choix du moteur local */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              updateSetting('skipOpAiProvider', 'ollama');
                              updateAiSetting('activeProvider', 'ollama');
                              setSelectedProviderId('ollama');
                            }}
                            className={`flex-1 p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                              (settings.skipOpAiProvider || effectiveAiSettings.activeProvider) === 'ollama'
                                ? 'bg-emerald-950/30 border-emerald-500/50 text-white font-bold'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            <span className="block font-bold">Ollama</span>
                            <span className="text-[10px] text-neutral-400">Port 11434 (LLM local)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              updateSetting('skipOpAiProvider', 'lmstudio');
                              updateAiSetting('activeProvider', 'lmstudio');
                              setSelectedProviderId('lmstudio');
                            }}
                            className={`flex-1 p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                              (settings.skipOpAiProvider || effectiveAiSettings.activeProvider) === 'lmstudio'
                                ? 'bg-emerald-950/30 border-emerald-500/50 text-white font-bold'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            <span className="block font-bold">LM Studio</span>
                            <span className="text-[10px] text-neutral-400">Port 1234 (Serveur local)</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-neutral-400 bg-neutral-900/60 p-2 rounded-lg border border-neutral-800">
                          <span>
                            Modèle configuré : <strong className="text-white font-mono">{((effectiveAiSettings as any)[(settings.skipOpAiProvider as any) || 'ollama']?.model) || 'Défaut'}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTestAiKey(getEffectiveAiConfig(effectiveAiSettings, (settings.skipOpAiProvider as AIProviderId) || 'ollama'))}
                            disabled={isTestingAi}
                            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Tester la connexion</span>
                          </button>
                        </div>

                        {aiTestResult && (
                          <div
                            className={`flex items-center gap-2 p-2 rounded-lg text-[11px] border ${
                              aiTestResult.success
                                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            {aiTestResult.success ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            )}
                            <span>{aiTestResult.message}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Mode Marathon (Auto-Chain & Smart Transitions) */}
              <div className="flex flex-col gap-3.5 bg-neutral-900/60 p-4.5 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs uppercase tracking-wider text-neutral-300 font-bold">
                      Mode Marathon (Enchaînement automatique & Smart Transitions)
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={!!(settings.marathonConfig?.enabled ?? DEFAULT_MARATHON_CONFIG.enabled)}
                    onChange={(val) => {
                      const cur = settings.marathonConfig || DEFAULT_MARATHON_CONFIG;
                      updateSetting('marathonConfig', { ...cur, enabled: val });
                    }}
                    accent={accent}
                  />
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Automatise les transitions entre épisodes en sautant intelligemment les génériques d'intro et de fin, avec préchargement d'arrière-plan sans écran noir.
                </p>

                {(settings.marathonConfig?.enabled ?? DEFAULT_MARATHON_CONFIG.enabled) && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-neutral-800/80 animate-in fade-in duration-200">
                    {/* Conserver l'opening de l'épisode 1 */}
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <span className="font-semibold text-neutral-200 block text-xs">
                          Passer l'opening dès le 1er épisode
                        </span>
                        <span className="text-neutral-400 text-[11px] leading-relaxed">
                          Désactivé : écoute l'opening en entier au premier épisode, ne saute automatiquement qu'à partir de l'épisode 2.
                        </span>
                      </div>
                      <ToggleSwitch
                        checked={!!(settings.marathonConfig?.skipFirstEpisodeOp ?? DEFAULT_MARATHON_CONFIG.skipFirstEpisodeOp)}
                        onChange={(val) => {
                          const cur = settings.marathonConfig || DEFAULT_MARATHON_CONFIG;
                          updateSetting('marathonConfig', { ...cur, skipFirstEpisodeOp: val });
                        }}
                        accent={accent}
                      />
                    </div>

                    {/* Sauter l'ending (ED) */}
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <span className="font-semibold text-neutral-200 block text-xs">
                          Sauter le générique de fin (ED)
                        </span>
                        <span className="text-neutral-400 text-[11px] leading-relaxed">
                          Déclenche le passage à l'épisode suivant dès le début de l'ending.
                        </span>
                      </div>
                      <ToggleSwitch
                        checked={!!(settings.marathonConfig?.skipEnding ?? DEFAULT_MARATHON_CONFIG.skipEnding)}
                        onChange={(val) => {
                          const cur = settings.marathonConfig || DEFAULT_MARATHON_CONFIG;
                          updateSetting('marathonConfig', { ...cur, skipEnding: val });
                        }}
                        accent={accent}
                      />
                    </div>

                    {/* Scènes post-crédits / teasers */}
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <span className="font-semibold text-neutral-200 block text-xs">
                          Lire la scène post-crédits / teaser si présente
                        </span>
                        <span className="text-neutral-400 text-[11px] leading-relaxed">
                          Saute l'ending pour aller directement au teaser, puis enchaîne l'épisode suivant une fois le teaser terminé.
                        </span>
                      </div>
                      <ToggleSwitch
                        checked={!!(settings.marathonConfig?.playPostCreditsScene ?? DEFAULT_MARATHON_CONFIG.playPostCreditsScene)}
                        onChange={(val) => {
                          const cur = settings.marathonConfig || DEFAULT_MARATHON_CONFIG;
                          updateSetting('marathonConfig', { ...cur, playPostCreditsScene: val });
                        }}
                        accent={accent}
                      />
                    </div>

                    {/* Compte à rebours avant transition */}
                    <div className="flex flex-col gap-1.5 py-1">
                      <span className="font-semibold text-neutral-200 block text-xs">
                        Délai du compte à rebours avant l'épisode suivant
                      </span>
                      <span className="text-neutral-400 text-[11px] leading-relaxed">
                        Affiche une bannière avec mini-chrono avant de lancer l'épisode suivant (Raccourci N pour forcer, Échap pour annuler).
                      </span>
                      <div className="grid grid-cols-4 gap-2 pt-1.5">
                        {[
                          { secs: 0, label: 'Instantané (0s)' },
                          { secs: 3, label: '3 secondes' },
                          { secs: 5, label: '5 secondes' },
                          { secs: 10, label: '10 secondes' },
                        ].map(({ secs, label }) => {
                          const currentDuration =
                            settings.marathonConfig?.countdownDuration ?? DEFAULT_MARATHON_CONFIG.countdownDuration;
                          const isSelected = currentDuration === secs;
                          return (
                            <button
                              key={secs}
                              type="button"
                              onClick={() => {
                                const cur = settings.marathonConfig || DEFAULT_MARATHON_CONFIG;
                                updateSetting('marathonConfig', { ...cur, countdownDuration: secs });
                              }}
                              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                                isSelected
                                  ? 'bg-neutral-800 text-white border-amber-400/60 ring-1 ring-amber-400/40 shadow-sm'
                                  : 'bg-neutral-900/60 text-neutral-400 hover:text-white border-neutral-800 hover:border-neutral-700'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: MODÈLES D'INTELLIGENCE ARTIFICIELLE (AGNOSTIQUE CLOUD & INFÉRENCE LOCALE) */}
          {activeTab === 'ai' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-150">
              {/* En-tête */}
              <div className="flex flex-col gap-2 p-4.5 rounded-xl bg-gradient-to-r from-violet-950/40 via-purple-950/20 to-neutral-900/60 border border-violet-500/30">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-xs">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Gestionnaire des Modèles d'Intelligence Artificielle
                      </h3>
                      <p className="text-xs text-neutral-400">
                        Système agnostique prenant en charge les fournisseurs Cloud (OpenAI, Anthropic, Mistral, Gemini, Custom) et l'inférence locale privée (Ollama, LM Studio).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900/80 border border-neutral-700/60 text-xs">
                    <span className="text-neutral-400">Fournisseur actif :</span>
                    <span className="font-bold text-violet-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {AI_PROVIDERS[effectiveAiSettings.activeProvider]?.name || effectiveAiSettings.activeProvider}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sélecteur d'Axe : Fournisseurs Cloud vs Inférence Locale */}
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Environnement d'Inférence
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAiCategory('cloud');
                      if (AI_PROVIDERS[selectedProviderId]?.category !== 'cloud') {
                        const fallbackCloud = (['gemini', 'openai', 'anthropic', 'mistral', 'custom'] as AIProviderId[]).includes(effectiveAiSettings.activeProvider)
                          ? effectiveAiSettings.activeProvider
                          : 'gemini';
                        setSelectedProviderId(fallbackCloud);
                        updateAiSetting('activeProvider', fallbackCloud);
                      }
                    }}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      selectedAiCategory === 'cloud'
                        ? 'border-violet-500/60 bg-violet-950/30 text-white font-bold shadow-md ring-1 ring-violet-500/40'
                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-semibold block text-white">Fournisseurs Cloud (Clé API)</span>
                        <span className="text-[10px] text-neutral-400">OpenAI, Anthropic Claude, Mistral AI, Google Gemini, Custom Endpoint</span>
                      </div>
                    </div>
                    {selectedAiCategory === 'cloud' && <Check className="w-4 h-4 text-violet-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAiCategory('local');
                      if (AI_PROVIDERS[selectedProviderId]?.category !== 'local') {
                        const fallbackLocal = (['ollama', 'lmstudio'] as AIProviderId[]).includes(effectiveAiSettings.activeProvider)
                          ? effectiveAiSettings.activeProvider
                          : 'ollama';
                        setSelectedProviderId(fallbackLocal);
                        updateAiSetting('activeProvider', fallbackLocal);
                      }
                    }}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      selectedAiCategory === 'local'
                        ? 'border-emerald-500/60 bg-emerald-950/30 text-white font-bold shadow-md ring-1 ring-emerald-500/40'
                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Server className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-semibold block text-white">Inférence Locale (100% Hors-ligne & Privé)</span>
                        <span className="text-[10px] text-neutral-400">Ollama, LM Studio (aucun envoi de données, sans Internet)</span>
                      </div>
                    </div>
                    {selectedAiCategory === 'local' && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>
              </div>

              {/* Grille des Fournisseurs disponibles selon la catégorie */}
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  {selectedAiCategory === 'cloud' ? 'Sélectionner un Fournisseur Cloud' : 'Sélectionner un Moteur Local'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {(selectedAiCategory === 'cloud'
                    ? (['gemini', 'openai', 'anthropic', 'mistral', 'custom'] as AIProviderId[])
                    : (['ollama', 'lmstudio'] as AIProviderId[])
                  ).map((pId) => {
                    const pMeta = AI_PROVIDERS[pId];
                    const isCurrentActive = effectiveAiSettings.activeProvider === pId;
                    const isSelected = selectedProviderId === pId;

                    return (
                      <button
                        key={pId}
                        type="button"
                        onClick={() => {
                          setSelectedProviderId(pId);
                          updateAiSetting('activeProvider', pId);
                        }}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer gap-2 ${
                          isSelected
                            ? 'bg-neutral-800/90 border-violet-500 text-white ring-1 ring-violet-500/40 shadow-xs'
                            : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-neutral-200">{pMeta.name}</span>
                          {isCurrentActive ? (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Actif
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-neutral-500 uppercase">
                              {pMeta.category}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                          {pMeta.description}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1.5 border-t border-neutral-800/80">
                          <span className="font-mono text-neutral-400 truncate max-w-[150px]">
                            {((effectiveAiSettings as any)[pId]?.model) || pMeta.defaultModel}
                          </span>
                          <span className="text-violet-400 font-medium">Configurer</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Formulaire de configuration du fournisseur sélectionné */}
              {(() => {
                const currentMeta = AI_PROVIDERS[selectedProviderId];
                const currentConfig = (effectiveAiSettings as any)[selectedProviderId] || {};
                const isLocal = currentMeta.category === 'local';

                return (
                  <div className="flex flex-col gap-4 p-4.5 rounded-xl bg-neutral-900/70 border border-neutral-800 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg border ${
                          isLocal
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                        }`}>
                          {isLocal ? <Server className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                            Paramètres : {currentMeta.name}
                            {effectiveAiSettings.activeProvider === selectedProviderId && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                Fournisseur Actif
                              </span>
                            )}
                          </h4>
                          <span className="text-[11px] text-neutral-400">
                            {currentMeta.description}
                          </span>
                        </div>
                      </div>

                      {effectiveAiSettings.activeProvider !== selectedProviderId && (
                        <button
                          type="button"
                          onClick={() => updateAiSetting('activeProvider', selectedProviderId)}
                          className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                          Définir comme actif
                        </button>
                      )}
                    </div>

                    {/* Champ 1 : Endpoint / URL de base */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-neutral-300 flex items-center gap-1.5">
                          <span>URL de l'Endpoint / API Base :</span>
                          {isLocal && (
                            <span className="text-[10px] text-emerald-400 font-mono">(Port local machine)</span>
                          )}
                        </label>
                        {currentConfig.endpoint && currentConfig.endpoint !== currentMeta.defaultEndpoint && (
                          <button
                            type="button"
                            onClick={() => updateProviderConfig(selectedProviderId, { endpoint: currentMeta.defaultEndpoint })}
                            className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Rétablir défaut ({currentMeta.defaultEndpoint})</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={currentConfig.endpoint ?? currentMeta.defaultEndpoint}
                        onChange={(e) => updateProviderConfig(selectedProviderId, { endpoint: e.target.value })}
                        placeholder={currentMeta.defaultEndpoint}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500/60 rounded-lg px-3 py-2 text-xs text-neutral-200 placeholder-neutral-600 outline-none font-mono transition-colors"
                      />
                    </div>

                    {/* Champ 2 : Clé API (si fournisseur Cloud ou Custom) */}
                    {(currentMeta.requiresApiKey || selectedProviderId === 'custom') && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-medium text-neutral-300">
                            Clé API d'authentification {currentMeta.requiresApiKey ? '*' : '(optionnelle)'} :
                          </label>
                          {currentMeta.keyUrl && (
                            <a
                              href={currentMeta.keyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-violet-400 hover:text-violet-300 hover:underline flex items-center gap-1"
                            >
                              <span>Obtenir une clé API {currentMeta.name}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type={showAiKey ? 'text' : 'password'}
                            value={currentConfig.apiKey || ''}
                            onChange={(e) => updateProviderConfig(selectedProviderId, { apiKey: e.target.value })}
                            placeholder={currentMeta.keyPlaceholder || 'Clé API...'}
                            className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500/60 rounded-lg px-3 py-2 text-xs text-neutral-200 placeholder-neutral-600 outline-none font-mono pr-9 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAiKey(!showAiKey)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                            title={showAiKey ? 'Masquer la clé' : 'Afficher la clé'}
                          >
                            {showAiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Champ 3 : Sélection du modèle (détection dynamique pour Ollama/LM Studio & suggestions pour Cloud) */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-neutral-300">
                          Nom du Modèle :
                        </label>
                        {isLocal && (
                          <button
                            type="button"
                            onClick={() => handleFetchLocalModels(selectedProviderId as 'ollama' | 'lmstudio')}
                            disabled={isFetchingLocalModels}
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${isFetchingLocalModels ? 'animate-spin' : ''}`} />
                            <span>Détecter les modèles locaux</span>
                          </button>
                        )}
                      </div>

                      {/* Dropdown si des modèles locaux ont été détectés */}
                      {isLocal && detectedLocalModels.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-neutral-400 whitespace-nowrap">Modèles détectés :</span>
                          <select
                            value={currentConfig.model || currentMeta.defaultModel}
                            onChange={(e) => updateProviderConfig(selectedProviderId, { model: e.target.value })}
                            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 outline-none font-mono"
                          >
                            {detectedLocalModels.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Suggestions rapides sous forme de chips pour les Cloud */}
                      {!isLocal && currentMeta.suggestedModels.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-neutral-500">Suggestions :</span>
                          {currentMeta.suggestedModels.map((sm) => {
                            const isChosen = (currentConfig.model || currentMeta.defaultModel) === sm;
                            return (
                              <button
                                key={sm}
                                type="button"
                                onClick={() => updateProviderConfig(selectedProviderId, { model: sm })}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                                  isChosen
                                    ? 'bg-violet-500/30 text-violet-200 border border-violet-500/40 font-bold'
                                    : 'bg-neutral-800/80 text-neutral-400 hover:text-white border border-neutral-700/60'
                                }`}
                              >
                                {sm}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <input
                        type="text"
                        value={currentConfig.model ?? currentMeta.defaultModel}
                        onChange={(e) => updateProviderConfig(selectedProviderId, { model: e.target.value })}
                        placeholder={currentMeta.defaultModel}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500/60 rounded-lg px-3 py-2 text-xs text-neutral-200 placeholder-neutral-600 outline-none font-mono transition-colors"
                      />
                    </div>

                    {/* Zone de test & Diagnostic */}
                    <div className="pt-2 border-t border-neutral-800/80 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-neutral-400">
                          Vérifiez la disponibilité de l'endpoint et les temps de réponse :
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTestAiKey(getEffectiveAiConfig(effectiveAiSettings, selectedProviderId))}
                          disabled={isTestingAi || (currentMeta.requiresApiKey && !currentConfig.apiKey)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-all cursor-pointer"
                        >
                          {isTestingAi ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span>Tester la connexion & latence</span>
                        </button>
                      </div>

                      {aiTestResult && (
                        <div
                          className={`flex items-start gap-2.5 p-3 rounded-lg text-xs border animate-in fade-in ${
                            aiTestResult.success
                              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                          }`}
                        >
                          {aiTestResult.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold">{aiTestResult.message}</span>
                            {aiTestResult.latencyMs !== undefined && (
                              <span className="text-[10px] text-emerald-400/90 font-mono">
                                Latence mesurée : {aiTestResult.latencyMs} ms
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
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

              {/* Lecteur Multimédia par Défaut Windows */}
              <div className="flex items-center justify-between bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700/60 transition-colors">
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-200 block text-xs">Lecteur Multimédia par Défaut Windows</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      WINDOWS 11 / 10
                    </span>
                  </div>
                  <span className="text-neutral-400 text-[11px] block mt-1 leading-relaxed">
                    Associer FlowLuna à vos musiques et vidéos (.mp3, .flac, .wav, .m4a, .mp4, .mkv, etc.) pour les ouvrir directement au double-clic dans l'explorateur.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.electronAPI?.openDefaultAppsSettings) {
                      window.electronAPI.openDefaultAppsSettings();
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700/80 hover:border-neutral-600 text-xs font-medium transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                  title="Ouvrir les Paramètres d'applications par défaut de Windows"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Paramètres Windows</span>
                </button>
              </div>

              {/* Gestion du Stockage & Cache */}
              <div className="flex items-center justify-between bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700/60 transition-colors">
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span className="font-semibold text-neutral-200 block text-xs">Gestion du Stockage & Cache</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                      NETTOYAGE
                    </span>
                  </div>
                  <span className="text-neutral-400 text-[11px] block mt-1 leading-relaxed">
                    Libérez de l'espace disque en nettoyant sélectivement l'historique des téléchargements, les vidéos temporaires et les caches audio sans altérer votre bibliothèque.
                  </span>
                </div>
                <button
                  type="button"
                  id="open-clear-cache-modal-btn"
                  onClick={() => setIsClearCacheModalOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-rose-950/40 text-neutral-200 hover:text-rose-300 border border-neutral-700/80 hover:border-rose-500/40 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                  title="Ouvrir la boîte de dialogue pour vider le cache"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Vider le cache…</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: MOTEURS & FICHIERS */}
          {activeTab === 'system' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-150">
              {/* Mises à jour du Logiciel FlowLuna */}
              <div className="flex flex-col gap-3.5 bg-neutral-900/60 p-4.5 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs uppercase tracking-wider text-neutral-300 font-bold">
                      {t.softwareUpdateTitle || 'Mise à jour du Logiciel FlowLuna'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-semibold">
                      v{effectiveVersion}
                    </span>
                    <button
                      type="button"
                      id="check-app-update-btn"
                      onClick={handleCheckAppUpdate}
                      disabled={isCheckingUpdate || isDownloadingAppUpdate}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 border border-cyan-500/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin text-cyan-300' : 'text-cyan-400'}`} />
                      <span>{isCheckingUpdate ? (t.checkingUpdate || 'Vérification...') : (t.checkUpdateBtn || 'Rechercher une mise à jour')}</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  {t.softwareUpdateDesc || 'Téléchargez et installez directement les dernières versions officielles avec correctifs et nouveautés.'}
                </p>

                {/* Feedback alert */}
                {updateAlertMessage && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
                      updateAlertMessage.type === 'success'
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                        : updateAlertMessage.type === 'info'
                        ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-200'
                        : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    {updateAlertMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : updateAlertMessage.type === 'info' ? (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{updateAlertMessage.text}</span>
                  </div>
                )}

                {/* Application up to date panel */}
                {(!appUpdateInfo || !appUpdateInfo.hasUpdate || compareSemVer(appUpdateInfo.latestVersion, effectiveVersion) <= 0) && (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">Votre application est à jour</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                            v{effectiveVersion}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Vous disposez de la version la plus récente de FlowLuna avec toutes les améliorations et correctifs de sécurité.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Update available panel */}
                {appUpdateInfo?.hasUpdate && compareSemVer(appUpdateInfo.latestVersion, effectiveVersion) > 0 && (

                  <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col gap-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          FlowLuna v{appUpdateInfo.latestVersion}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                          {t.updateAvailable || 'Nouvelle version !'}
                        </span>
                      </div>
                      {appUpdateProgress?.status === 'ready_to_install' ? (
                        <button
                          type="button"
                          id="install-app-update-btn"
                          onClick={() => setShowRestartModal(true)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer active:scale-95"
                        >
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                          <span>{t.restartToUpdateBtn || 'Redémarrer et Installer'}</span>
                        </button>
                      ) : !isDownloadingAppUpdate ? (
                        <button
                          type="button"
                          id="download-app-update-btn"
                          onClick={handleStartAppUpdateDownload}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2 shadow-lg shadow-cyan-950/50 transition-all cursor-pointer active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{t.downloadUpdateBtn || 'Télécharger la mise à jour'}</span>
                        </button>
                      ) : null}
                    </div>

                    {appUpdateInfo.releaseNotes && (
                      <p className="text-[11px] text-neutral-300 bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800 line-clamp-3">
                        {appUpdateInfo.releaseNotes}
                      </p>
                    )}

                    {/* Download Progress Bar */}
                    {(isDownloadingAppUpdate || appUpdateProgress?.status === 'downloading') && (
                      <div className="flex flex-col gap-2 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-300 font-medium flex items-center gap-2">
                            <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                            <span>{t.downloadingUpdate || 'Téléchargement de la mise à jour...'}</span>
                          </span>
                          <span className="font-mono text-cyan-300 font-bold">
                            {(appUpdateProgress?.percent || 0).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, appUpdateProgress?.percent || 0))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                          <span>
                            {(appUpdateProgress?.downloadedBytes
                              ? (appUpdateProgress.downloadedBytes / (1024 * 1024)).toFixed(1)
                              : appUpdateProgress?.downloadedMb?.toFixed(1) || '0')}{' '}
                            / {(appUpdateProgress?.totalBytes
                              ? (appUpdateProgress.totalBytes / (1024 * 1024)).toFixed(1)
                              : appUpdateProgress?.totalMb?.toFixed(1) || '?')} Mo
                          </span>
                          <span>
                            {appUpdateProgress?.speed || (appUpdateProgress?.speedMbS ? `${appUpdateProgress.speedMbS.toFixed(1)} Mo/s` : '')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bibliothèque Locale & Détection Musicale PC */}
              <div className="flex flex-col gap-3.5 bg-neutral-900/60 p-4.5 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className={`w-4 h-4 ${ACCENT_TEXT[settings.accent] || 'text-emerald-400'}`} />
                    <span className="text-xs uppercase tracking-wider text-neutral-300 font-bold">Bibliothèque & Détection Musicale PC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleScanMusicNow}
                      disabled={isScanningSettings}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs ${
                        ACCENT_SUBTLE_BTN[settings.accent] || ACCENT_SUBTLE_BTN.emerald
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScanningSettings ? 'animate-spin' : ''} ${ACCENT_TEXT[settings.accent] || 'text-emerald-400'}`} />
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
                          <span className="text-xs text-neutral-300">
                            {sc.key === 'Double-tap / Clic' && group.title.includes('Vidéo')
                              ? `Reculer (-10s à gauche) / Avancer (+${settings.videoSkipForwardInterval ?? 10}s à droite)`
                              : sc.desc}
                          </span>
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
        <div className="px-6 py-3.5 border-t border-white/10 bg-white/[0.04] dark:bg-black/[0.20] flex items-center justify-between backdrop-blur-md">
          <span className="text-[11px] text-neutral-500 font-mono">
            FlowLuna v{effectiveVersion} • Tous les réglages sont sauvegardés automatiquement
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-neutral-900 dark:text-white transition-all cursor-pointer active:scale-95 border border-white/10"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Modal Confirmation de Redémarrage pour Mise à jour */}
      {showRestartModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setShowRestartModal(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-neutral-700 bg-[#161622] p-6 shadow-2xl text-neutral-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <ArrowUpCircle className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Redémarrer FlowLuna ?</h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Installation de FlowLuna v{appUpdateInfo?.latestVersion || 'nouvelle'}
                </p>
              </div>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {t.updateReadyPrompt ||
                'La mise à jour a été téléchargée avec succès. Redémarrer FlowLuna maintenant pour l’installer ?'}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRestartModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                id="confirm-restart-install-btn"
                onClick={handleApplyAppUpdate}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>{t.restartToUpdateBtn || 'Redémarrer et Installer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Granulaire de Nettoyage du Cache */}
      <ClearCacheModal
        isOpen={isClearCacheModalOpen}
        onClose={() => setIsClearCacheModalOpen(false)}
        onSuccess={(result) => {
          const formatted = formatBytes(result.clearedBytes);
          setCacheToastMessage({
            text:
              result.clearedBytes > 0
                ? `Cache nettoyé avec succès : ${formatted} libérés !`
                : 'Cache nettoyé avec succès (aucun fichier temporaire à supprimer).',
            type: 'success',
          });
        }}
        onError={(errorMsg) => {
          setCacheToastMessage({
            text: `Erreur lors du nettoyage du cache : ${errorMsg}`,
            type: 'error',
          });
        }}
        accent={settings.accent}
        theme={settings.theme}
        settings={settings}
      />

      {/* Toast Notification pour le Cache */}
      {cacheToastMessage && (
        <div className="fixed bottom-6 right-6 z-[80] flex items-center gap-2.5 px-4 py-3 rounded-xl bg-neutral-900/95 border border-neutral-700 text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
          {cacheToastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-medium">{cacheToastMessage.text}</span>
        </div>
      )}
    </div>
  );
};

export const APP_VERSION = '1.21.4';

export type MediaFormat =
  | 'mp3'
  | 'flac'
  | 'wav'
  | 'ogg'
  | 'm4a'
  | 'aac'
  | 'webm'
  | 'mp4'
  | 'mkv'
  | 'mov'
  | 'avi'
  | 'm4v';

export type AudioFormat = MediaFormat;

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  format: MediaFormat;
  bitrate?: number; // e.g. 320
  url: string; // Blob URL or audio stream URL
  coverUrl?: string;
  source: 'local' | 'youtube' | 'cloud_drive' | 'cloud_onedrive' | 'default';
  isFavorite: boolean;
  isCachedOffline: boolean;
  cachedAt?: number; // timestamp
  playCount: number;
  addedAt: number;
  lyrics?: string[];
  lyricsOffset?: number; // In seconds (e.g. -1.5s to +2.0s) for manual sync calibration
  sizeInBytes?: number;
  year?: string;
  genre?: string;
  trackNumber?: number;
  isVideo?: boolean;
  videoWidth?: number;
  videoHeight?: number;
  filePath?: string;
  chapters?: VideoChapter[];
}

export interface VideoChapter {
  id?: number | string;
  title: string;
  startTime: number;
  endTime: number;
}

export type SkipSource = 'chapter' | 'api' | 'acoustic' | 'subtitle' | 'heuristic';
export type SkipConfidence = 'high' | 'moderate' | 'low';

export interface SkipInterval {
  start: number; // en secondes
  end: number;   // en secondes
  type: 'op' | 'ed' | 'recap' | 'preview';
  source: SkipSource;
  confidence: SkipConfidence;
  title?: string;
  snapped?: boolean;        // Si le marqueur a été ajusté sur un silence/coupure (TimeAdjustment inspiré d'intro-skipper)
  snapType?: 'silence' | 'black' | 'none';
  offsetApplied?: number;   // Décalage en secondes appliqué lors du snapping
}

export interface PlayerSkipState {
  currentInterval: SkipInterval | null;
  isVisible: boolean;
  autoSkipEnabled: boolean;
}

export interface VideoSkipMarkers {
  op: SkipInterval | null;
  ed: SkipInterval | null;
  recap?: SkipInterval | null;
  preview?: SkipInterval | null;
  hasPostCredits: boolean;
  postCreditsStart?: number;
  driftDetected?: boolean;        // true si écart significatif entre durée vidéo et référence API (> 4s)
  referenceDuration?: number;     // durée théorique fournie par l'API
  snapped?: boolean;              // true si un micro-ajustement audio/silence a été appliqué
}

export interface MarathonConfig {
  enabled: boolean;
  skipFirstEpisodeOp: boolean;    // false = on écoute l'OP de l'ep 1, true = skip direct
  skipEnding: boolean;            // Sauter l'ED pour passer directement à la suite
  playPostCreditsScene: boolean;  // Si présent, lit la scène post-crédits après le skip de l'ED
  countdownDuration: number;      // Délai en secondes avant transition (0 = instantané)
}

export const DEFAULT_MARATHON_CONFIG: MarathonConfig = {
  enabled: true,
  skipFirstEpisodeOp: false,
  skipEnding: true,
  playPostCreditsScene: true,
  countdownDuration: 5,
};

export interface PlaylistState {
  playlist: Array<{ id: string; episodeNumber: number; url: string; title?: string }>;
  currentIndex: number;
  hasNext: boolean;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  icon?: string; // icon identifier (e.g. 'music', 'flame', 'zap') or emoji (e.g. '🔥', '🎧', '🎌')
  iconColor?: string; // hex or color identifier (e.g. '#10b981', 'emerald', 'violet')
  iconType?: 'lucide' | 'emoji' | 'image';
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
  isSmart?: boolean;
  smartType?: 'favorites' | 'offline' | 'recent' | 'youtube' | 'most_played';
  isPinned?: boolean; // If true, displayed in the sidebar playlist list. If false, only accessible in 'Toutes les Playlists'
}

export interface EqualizerBand {
  frequency: number; // in Hz: 32, 64, 125, 250, 500, 1k, 2k, 4k, 8k, 16k
  gain: number; // in dB: -12 to +12
  label: string;
}

export type EqualizerPresetName =
  | 'Flat'
  | 'Bass Boost'
  | 'Treble Boost'
  | 'Vocal'
  | 'Rock'
  | 'Electronic'
  | 'Hip-Hop'
  | 'Classical'
  | 'Jazz'
  | 'Acoustic'
  | 'Custom';

export interface EqualizerSettings {
  enabled: boolean;
  preset: EqualizerPresetName;
  bands: EqualizerBand[];
  bassBoost: number; // 0 to 10
  trebleBoost: number; // 0 to 10
  preampGain: number; // -12dB to +12dB
  surroundEffect: boolean;
  stereoWidth?: number; // 0 (mono) to 1.0 (normal) to 2.0 (ultra-wide 3D spatial)
  playbackSpeed?: number; // 0.5 to 2.0
}

export type ThemeMode = 'dark' | 'light';

export type AccentColor =
  | 'emerald' // Modern green
  | 'violet' // Cyberpunk purple
  | 'blue' // Deep cobalt
  | 'amber' // Warm gold
  | 'rose' // Crimson
  | 'cyan'; // Synthwave cyan

export type CompactPlayerDock = 'bottom' | 'top' | 'floating';

export type VideoAspectRatio = 'contain' | 'cover' | '16-9';

export type BackdropEffect = 'glass' | 'acrylic' | 'mica';

export type LanguageCode = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt' | 'ja' | 'zh' | 'ru';

export interface AppUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseName?: string;
  releaseNotes?: string;
  downloadUrl?: string;
  assetName?: string;
  publishedAt?: string;
}

export interface AppUpdateProgress {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready_to_install' | 'error';
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: string;
  downloadedMb?: number;
  totalMb?: number;
  speedMbS?: number;
  message?: string;
  installerPath?: string;
}

export interface PlayerSettings {
  language?: LanguageCode;
  theme: ThemeMode;
  accent: AccentColor;
  backdropEffect?: BackdropEffect; // 'glass' (Pure Glass / Verre dépoli) or 'acrylic' (Desktop Acrylic transparent)
  glassIntensity?: number; // 0 (opaque) to 100% (pure crystal frosted glass)
  acrylicIntensity?: number; // 0 to 100% (Desktop Acrylic material intensity, default 30%)
  visualizerStyle: 'bars' | 'wave' | 'circle' | 'minimal' | 'pillars';
  crossfadeDuration: number; // seconds (0 to 12)
  gaplessPlayback?: boolean; // Enchaînement sans aucun blanc ni silence
  autoCacheFavorites: boolean;
  maxCacheSizeMb: number; // e.g. 1024 MB
  highQualityStream: boolean;
  volumeNormalization: boolean;
  normalizationTarget?: 'streaming' | 'replaygain' | 'broadcast'; // 'streaming' (-14 LUFS), 'replaygain' (-18 LUFS), 'broadcast' (-23 LUFS)
  discordRpcEnabled?: boolean; // Discord Rich Presence
  smtcEnabled?: boolean; // Windows System Media Transport Controls
  compactMode: boolean;
  compactPlayerDock?: CompactPlayerDock;
  compactPlayerGhost?: boolean;
  stereoWidth?: number; // 0 to 200%
  playbackSpeed?: number; // 0.5 to 2.0
  autoSkipOpening?: boolean; // Saut automatique des génériques/openings (Auto-skip)
  enableSkipOpening?: boolean; // Activation globale de la fonctionnalité Skip OP (si faux, masque le bouton et ignore les génériques)
  enableSilenceSnapping?: boolean; // Calage automatique chirurgical aux silences audio / fondus (TimeAdjustment inspiré d'intro-skipper)
  marathonConfig?: MarathonConfig; // Mode Marathon (Auto-chain & transitions intelligentes)
  videoSkipForwardInterval?: number; // Intervalle de saut temporel (Skip & Molette) en secondes (5s à 90s, step 5s, défaut 10s)
  videoAspectRatio?: VideoAspectRatio; // Ratio d'affichage vidéo ('contain', 'cover', '16-9')
}

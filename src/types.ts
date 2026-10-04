export const APP_VERSION = '1.1.6';

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
  sizeInBytes?: number;
  year?: string;
  genre?: string;
  trackNumber?: number;
  isVideo?: boolean;
  videoWidth?: number;
  videoHeight?: number;
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
}

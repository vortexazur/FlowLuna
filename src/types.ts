declare const __APP_VERSION__: string | undefined;
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.23.8';

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
  | 'm4v'
  | 'wmv'
  | 'flv'
  | '3gp'
  | 'ts'
  | 'm2ts'
  | 'ogv';

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
  source: 'local' | 'youtube' | 'cloud_drive' | 'cloud_onedrive' | 'default' | 'ephemeral';
  isFavorite: boolean;
  isCachedOffline: boolean;
  isTransient?: boolean; // Set true for on-the-fly explorer opened files (no persistent DB or disk cache)
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
  subtitles?: SubtitleTrack[];
  audioTracks?: AudioStreamTrack[];
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language?: string;
  format?: string;
  type: 'embedded' | 'sidecar' | 'custom';
  streamIndex?: number;
  filePath?: string;
  url?: string;
  isDefault?: boolean;
}

export interface AudioStreamTrack {
  id: string;
  index: number;
  label: string;
  language?: string;
  codec?: string;
  channels?: number;
  isDefault?: boolean;
}

export interface VideoChapter {
  id?: number | string;
  title: string;
  startTime: number;
  endTime: number;
}

export type SkipSource = 'chapter' | 'api' | 'acoustic' | 'subtitle' | 'heuristic' | 'ai';
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
  drift?: boolean;          // true si cet intervalle provient d'une API avec dérive temporelle détectée (> 4s)
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
  /** @deprecated Utiliser interval.drift à la place. Conservé uniquement pour la rétro-compatibilité du cache localStorage. */
  driftDetected?: boolean;
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

export type SmartType =
  | 'favorites'
  | 'offline'
  | 'recent'
  | 'youtube'
  | 'most_played'
  | 'forgotten'
  | 'hires'
  | 'video_collection'
  | 'custom';

export type SmartRuleField =
  | 'title'
  | 'artist'
  | 'album'
  | 'genre'
  | 'format'
  | 'playCount'
  | 'addedAt'
  | 'duration'
  | 'isFavorite'
  | 'isVideo';

export type SmartRuleOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'isTrue'
  | 'isFalse';

export interface SmartPlaylistRule {
  id: string;
  field: SmartRuleField;
  operator: SmartRuleOperator;
  value: string | number | boolean;
}

export interface SmartPlaylistConfig {
  type: SmartType;
  matchType?: 'all' | 'any';
  rules?: SmartPlaylistRule[];
  limit?: number; // e.g. 50
  sortBy?: 'playCount' | 'addedAt' | 'title' | 'artist' | 'duration';
  sortOrder?: 'asc' | 'desc';
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
  smartType?: SmartType;
  smartConfig?: SmartPlaylistConfig;
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

export type ThemeMode = 'dark' | 'light' | 'transparent';

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
  animeSkipClientId?: string; // Clé personnalisée / Client ID Anime-Skip (optionnel, fallback sur clé publique intégrée)
  skipOpAiMode?: 'disabled' | 'cloud' | 'local'; // Mode d'assistance IA pour la détection OP/ED
  skipOpAiProvider?: AIProviderId | 'gemini' | 'openai'; // Fournisseur IA Cloud ou Local
  skipOpAiApiKey?: string; // Clé API pour l'IA Cloud (Google Gemini ou OpenAI)
  skipOpAiEndpoint?: string; // Endpoint personnalisé ou local (Ollama, LM Studio, etc.)
  skipOpAiModel?: string; // Modèle spécifique (ex: llama3.2, gpt-4o-mini, etc.)
  aiSettings?: AISettings; // Configuration globale unifiée des modèles d'IA (Cloud et Local)
  remoteControl?: RemoteControlSettings; // Télécommande Web Mobile Locale
}

export interface RemoteControlSettings {
  enabled: boolean;
  port: number;
  pin: string;
  allowLan: boolean;
}

export const DEFAULT_REMOTE_SETTINGS: RemoteControlSettings = {
  enabled: true,
  port: 3000,
  pin: '4242',
  allowLan: true,
};

export interface RemotePlaybackState {
  track: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    duration: number;
    coverUrl?: string;
    isFavorite?: boolean;
  } | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  queueLength: number;
  hasOpening?: boolean;
  openingSkipped?: boolean;
  openingStart?: number;
  openingEnd?: number;
  lastUpdated: number;
}

export interface RemoteCommand {
  id: string;
  action:
    | 'play'
    | 'pause'
    | 'togglePlay'
    | 'prev'
    | 'next'
    | 'seek'
    | 'setVolume'
    | 'toggleMute'
    | 'toggleFavorite'
    | 'skipOpening';
  payload?: any;
  timestamp: number;
}

export type AIProviderId =
  | 'openai'
  | 'anthropic'
  | 'mistral'
  | 'gemini'
  | 'custom'
  | 'ollama'
  | 'lmstudio';

export type AIProviderCategory = 'cloud' | 'local';

export interface AIProviderProfile {
  id: AIProviderId;
  name: string;
  category: AIProviderCategory;
  defaultEndpoint: string;
  defaultModel: string;
  suggestedModels: string[];
  requiresApiKey: boolean;
  keyUrl?: string;
  keyPlaceholder?: string;
  description: string;
}

export interface AIModelConfig {
  provider: AIProviderId;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AISettings {
  enabled: boolean;
  activeProvider: AIProviderId;
  openai: { apiKey: string; model: string; endpoint: string };
  anthropic: { apiKey: string; model: string; endpoint: string };
  mistral: { apiKey: string; model: string; endpoint: string };
  gemini: { apiKey: string; model: string; endpoint: string };
  custom: { apiKey: string; model: string; endpoint: string };
  ollama: { endpoint: string; model: string };
  lmstudio: { endpoint: string; model: string };
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: false,
  activeProvider: 'gemini',
  openai: {
    apiKey: '',
    model: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1',
  },
  anthropic: {
    apiKey: '',
    model: 'claude-3-5-haiku-20241022',
    endpoint: 'https://api.anthropic.com/v1',
  },
  mistral: {
    apiKey: '',
    model: 'mistral-small-latest',
    endpoint: 'https://api.mistral.ai/v1',
  },
  gemini: {
    apiKey: '',
    model: 'gemini-flash-latest',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
  },
  custom: {
    apiKey: '',
    model: 'llama-3.3-70b-versatile',
    endpoint: 'https://api.groq.com/openai/v1',
  },
  ollama: {
    endpoint: 'http://localhost:11434',
    model: 'llama3.2',
  },
  lmstudio: {
    endpoint: 'http://localhost:1234',
    model: 'local-model',
  },
};

export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
  language: 'fr',
  theme: 'dark',
  accent: 'emerald',
  backdropEffect: 'glass',
  glassIntensity: 70,
  acrylicIntensity: 30,
  visualizerStyle: 'minimal',
  crossfadeDuration: 0,
  gaplessPlayback: true,
  autoCacheFavorites: true,
  maxCacheSizeMb: 1024,
  highQualityStream: true,
  volumeNormalization: true,
  normalizationTarget: 'streaming',
  discordRpcEnabled: true,
  smtcEnabled: true,
  compactMode: false,
  compactPlayerDock: 'bottom',
  compactPlayerGhost: false,
  autoSkipOpening: false,
  enableSkipOpening: true,
  marathonConfig: DEFAULT_MARATHON_CONFIG,
  videoSkipForwardInterval: 10,
  videoAspectRatio: 'contain',
  animeSkipClientId: '',
  skipOpAiMode: 'disabled',
  skipOpAiProvider: 'gemini',
  skipOpAiApiKey: '',
  aiSettings: DEFAULT_AI_SETTINGS,
  remoteControl: DEFAULT_REMOTE_SETTINGS,
};

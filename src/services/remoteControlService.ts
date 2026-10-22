import { Track, SkipInterval } from '../types';

export interface RemoteTrackSummary {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl?: string;
  isVideo?: boolean;
  isFavorite: boolean;
}

export interface RemotePlaybackState {
  currentTrack: RemoteTrackSummary | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  queue: Array<{ id: string; title: string; artist: string; duration: number }>;
  currentTrackIndex: number;
  isOpButtonVisible: boolean;
  opInterval: SkipInterval | null;
  lastUpdated: number;
}

export type RemoteCommandType =
  | 'play'
  | 'pause'
  | 'toggle_play'
  | 'next'
  | 'prev'
  | 'seek'
  | 'volume'
  | 'mute'
  | 'toggle_mute'
  | 'toggle_favorite'
  | 'toggle_shuffle'
  | 'cycle_repeat'
  | 'skip_opening'
  | 'play_queue_index';

export interface RemoteCommand {
  id: string;
  type: RemoteCommandType;
  value?: any;
  timestamp: number;
}

export interface RemoteInfo {
  enabled: boolean;
  port: number;
  localIp: string;
  pin: string;
  token: string;
  url: string;
}

/**
 * Récupère les métadonnées de connexion de la télécommande Web locale.
 */
export async function fetchRemoteInfo(): Promise<RemoteInfo | null> {
  try {
    const res = await fetch('/api/remote/info');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[FlowLuna Remote] Impossible de joindre /api/remote/info:', err);
    return null;
  }
}

/**
 * Transmet l'état courant de lecture au serveur pour mise à disposition de la télécommande mobile.
 */
export async function syncRemoteState(state: RemotePlaybackState): Promise<boolean> {
  try {
    const res = await fetch('/api/remote/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Récupère les commandes envoyées par la télécommande mobile au serveur.
 */
export async function fetchPendingRemoteCommands(): Promise<RemoteCommand[]> {
  try {
    const res = await fetch('/api/remote/commands');
    if (!res.ok) return [];
    const data = await res.json();
    return data.commands || [];
  } catch {
    return [];
  }
}

import {
  RemoteTrackSummary,
  RemotePlaybackState,
  RemoteCommandType,
  RemoteCommand,
} from '../types';

export type {
  RemoteTrackSummary,
  RemotePlaybackState,
  RemoteCommandType,
  RemoteCommand,
};

export interface RemoteInfo {
  enabled: boolean;
  port: number;
  localIp: string;
  pin: string;
  token: string;
  url: string;
}

/**
 * Filtre les URLs de pochettes pour ne transmettre au mobile que des URLs joignables sur le LAN
 * (évite les URLs mémoire blob:http://127.0.0.1:... propres au WebView desktop).
 */
export function sanitizeCoverUrlForRemote(coverUrl?: string): string | undefined {
  if (!coverUrl || typeof coverUrl !== 'string') return undefined;
  if (coverUrl.startsWith('blob:') || coverUrl.startsWith('file:')) return undefined;
  if (coverUrl.startsWith('data:image/') && coverUrl.length > 120_000) return undefined;
  return coverUrl;
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
    if (Array.isArray(data)) return data;
    return Array.isArray(data?.commands) ? data.commands : [];
  } catch {
    return [];
  }
}

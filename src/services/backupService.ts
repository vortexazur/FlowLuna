import { Track, Playlist, PlayerSettings } from '../types';
import { getAllTracks, getAllPlaylists, saveTrack, savePlaylist, getSetting, saveSetting } from './audioDb';

export interface ExportArchiveData {
  app: string;
  version: string;
  exportedAt: string;
  deviceInfo?: string;
  tracksCount: number;
  playlistsCount: number;
  tracks: Partial<Track>[];
  playlists: Partial<Playlist>[];
  playerSettings?: Partial<PlayerSettings>;
}

/**
 * Exporte l'intégralité de la bibliothèque (pistes, métadonnées, favoris, playlists et réglages)
 * dans un fichier portable .json pour une synchronisation multi-appareils sans dépendance au cloud.
 */
export async function exportLibraryArchive(): Promise<{ filename: string; tracksCount: number; playlistsCount: number }> {
  const tracks = await getAllTracks();
  const playlists = await getAllPlaylists();
  const settings = await getSetting<PlayerSettings | null>('player_settings', null);

  // Nettoyage et sérialisation des pistes
  const cleanTracks: Partial<Track>[] = tracks.map((t) => ({
    id: String(t.id),
    title: String(t.title || 'Sans titre'),
    artist: String(t.artist || 'Artiste inconnu'),
    album: String(t.album || ''),
    duration: typeof t.duration === 'number' ? t.duration : 0,
    format: t.format || 'mp3',
    bitrate: typeof t.bitrate === 'number' ? t.bitrate : undefined,
    coverUrl: typeof t.coverUrl === 'string' ? t.coverUrl : undefined,
    url: t.source === 'local' ? '' : typeof t.url === 'string' ? t.url : '',
    source: t.source || 'default',
    isFavorite: Boolean(t.isFavorite),
    isCachedOffline: Boolean(t.isCachedOffline),
    cachedAt: typeof t.cachedAt === 'number' ? t.cachedAt : undefined,
    playCount: typeof t.playCount === 'number' ? t.playCount : 0,
    addedAt: typeof t.addedAt === 'number' ? t.addedAt : Date.now(),
    lyrics: Array.isArray(t.lyrics) ? t.lyrics : undefined,
    sizeInBytes: typeof t.sizeInBytes === 'number' ? t.sizeInBytes : undefined,
  }));

  // Nettoyage et sérialisation des playlists
  const cleanPlaylists: Partial<Playlist>[] = playlists.map((p) => ({
    id: String(p.id),
    title: String(p.title || 'Playlist'),
    description: typeof p.description === 'string' ? p.description : undefined,
    coverUrl: typeof p.coverUrl === 'string' ? p.coverUrl : undefined,
    icon: typeof p.icon === 'string' ? p.icon : undefined,
    iconColor: typeof p.iconColor === 'string' ? p.iconColor : undefined,
    iconType: p.iconType,
    trackIds: Array.isArray(p.trackIds) ? p.trackIds.map(String) : [],
    createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
    isSmart: Boolean(p.isSmart),
    smartType: p.smartType,
    isPinned: p.isPinned !== false,
  }));

  const backupData: ExportArchiveData = {
    app: 'FlowLuna',
    version: '3.0',
    exportedAt: new Date().toISOString(),
    deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'PC / Mobile',
    tracksCount: cleanTracks.length,
    playlistsCount: cleanPlaylists.length,
    tracks: cleanTracks,
    playlists: cleanPlaylists,
    playerSettings: settings || undefined,
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const filename = `flowluna_sauvegarde_${new Date().toISOString().slice(0, 10)}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    filename,
    tracksCount: cleanTracks.length,
    playlistsCount: cleanPlaylists.length,
  };
}

/**
 * Importe un fichier .json de sauvegarde sur cet appareil.
 * Synchronise les pistes, les playlists et les réglages utilisateur.
 */
export async function importLibraryArchive(file: File): Promise<{
  tracksImported: number;
  playlistsImported: number;
  settingsRestored: boolean;
}> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error('Le fichier sélectionné n\'est pas un fichier JSON valide.');
  }

  if (!parsed || (typeof parsed !== 'object')) {
    throw new Error('Format de sauvegarde non reconnu.');
  }

  let tracksCount = 0;
  let playlistsCount = 0;
  let settingsRestored = false;

  // Restauration des pistes
  if (Array.isArray(parsed.tracks)) {
    for (const rawTrack of parsed.tracks) {
      if (rawTrack && rawTrack.id && rawTrack.title) {
        const track: Track = {
          id: String(rawTrack.id),
          title: String(rawTrack.title),
          artist: String(rawTrack.artist || 'Artiste inconnu'),
          album: String(rawTrack.album || ''),
          duration: typeof rawTrack.duration === 'number' ? rawTrack.duration : 0,
          format: rawTrack.format || 'mp3',
          bitrate: typeof rawTrack.bitrate === 'number' ? rawTrack.bitrate : undefined,
          coverUrl: typeof rawTrack.coverUrl === 'string' ? rawTrack.coverUrl : undefined,
          url: typeof rawTrack.url === 'string' ? rawTrack.url : '',
          source: rawTrack.source || 'default',
          isFavorite: Boolean(rawTrack.isFavorite),
          isCachedOffline: Boolean(rawTrack.isCachedOffline),
          cachedAt: typeof rawTrack.cachedAt === 'number' ? rawTrack.cachedAt : undefined,
          playCount: typeof rawTrack.playCount === 'number' ? rawTrack.playCount : 0,
          addedAt: typeof rawTrack.addedAt === 'number' ? rawTrack.addedAt : Date.now(),
          lyrics: Array.isArray(rawTrack.lyrics) ? rawTrack.lyrics : undefined,
          sizeInBytes: typeof rawTrack.sizeInBytes === 'number' ? rawTrack.sizeInBytes : undefined,
        };
        await saveTrack(track);
        tracksCount++;
      }
    }
  }

  // Restauration des playlists
  if (Array.isArray(parsed.playlists)) {
    for (const rawPl of parsed.playlists) {
      if (rawPl && rawPl.id && rawPl.title) {
        const pl: Playlist = {
          id: String(rawPl.id),
          title: String(rawPl.title),
          description: typeof rawPl.description === 'string' ? rawPl.description : undefined,
          coverUrl: typeof rawPl.coverUrl === 'string' ? rawPl.coverUrl : undefined,
          icon: typeof rawPl.icon === 'string' ? rawPl.icon : undefined,
          iconColor: typeof rawPl.iconColor === 'string' ? rawPl.iconColor : undefined,
          iconType: rawPl.iconType,
          trackIds: Array.isArray(rawPl.trackIds) ? rawPl.trackIds.map(String) : [],
          createdAt: typeof rawPl.createdAt === 'number' ? rawPl.createdAt : Date.now(),
          updatedAt: typeof rawPl.updatedAt === 'number' ? rawPl.updatedAt : Date.now(),
          isSmart: Boolean(rawPl.isSmart),
          smartType: rawPl.smartType,
          isPinned: rawPl.isPinned !== false,
        };
        await savePlaylist(pl);
        playlistsCount++;
      }
    }
  }

  // Restauration des réglages du lecteur si présents
  if (parsed.playerSettings && typeof parsed.playerSettings === 'object') {
    try {
      const existingSettings = await getSetting<PlayerSettings | null>('player_settings', null);
      if (existingSettings) {
        const mergedSettings = { ...existingSettings, ...parsed.playerSettings };
        await saveSetting('player_settings', mergedSettings);
        settingsRestored = true;
      }
    } catch {
      // ignore
    }
  }

  return {
    tracksImported: tracksCount,
    playlistsImported: playlistsCount,
    settingsRestored,
  };
}

/**
 * Exporte une playlist au format .m3u
 */
export function exportPlaylistToM3U(playlist: Playlist, allTracks: Track[]): void {
  const trackMap = new Map(allTracks.map((t) => [t.id, t]));
  let m3uContent = '#EXTM3U\n';
  m3uContent += `#PLAYLIST:${playlist.title}\n\n`;

  for (const tid of playlist.trackIds) {
    const track = trackMap.get(tid);
    if (track) {
      m3uContent += `#EXTINF:${Math.round(track.duration)},${track.artist} - ${track.title}\n`;
      m3uContent += `${track.url}\n\n`;
    }
  }

  const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${playlist.title.replace(/\s+/g, '_')}.m3u`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

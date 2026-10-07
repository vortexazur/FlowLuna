import { Track, Playlist, PlayerSettings } from '../types';

const DB_NAME = 'pc_music_player_db';
const DB_VERSION = 1;

interface DBSchema {
  tracks: Track;
  audioBlobs: { trackId: string; blob: Blob; size: number; cachedAt: number };
  playlists: Playlist;
  settings: { key: string; value: any };
}

let dbInstance: IDBDatabase | null = null;

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('tracks')) {
        db.createObjectStore('tracks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('audioBlobs')) {
        db.createObjectStore('audioBlobs', { keyPath: 'trackId' });
      }
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

const MAX_ACTIVE_BLOB_URLS = 8;
const activeBlobUrls = new Map<string, string>();

// Memory optimization: revoke old blob URLs safely using LRU cache
export function revokeTrackBlobUrl(trackId?: string) {
  while (activeBlobUrls.size > MAX_ACTIVE_BLOB_URLS) {
    const oldestKey = activeBlobUrls.keys().next().value;
    if (!oldestKey) break;
    // Don't evict the specified active track unless necessary
    if (trackId && oldestKey === trackId && activeBlobUrls.size > 1) {
      const entries = Array.from(activeBlobUrls.keys());
      const otherKey = entries.find((k) => k !== trackId);
      if (otherKey) {
        const otherUrl = activeBlobUrls.get(otherKey);
        if (otherUrl) {
          try {
            URL.revokeObjectURL(otherUrl);
          } catch {}
          activeBlobUrls.delete(otherKey);
        }
        continue;
      }
    }
    const oldUrl = activeBlobUrls.get(oldestKey);
    if (oldUrl) {
      try {
        URL.revokeObjectURL(oldUrl);
      } catch {}
      activeBlobUrls.delete(oldestKey);
    }
  }
}

export function forceRevokeTrackBlobUrl(trackId: string) {
  const existingUrl = activeBlobUrls.get(trackId);
  if (existingUrl) {
    try {
      URL.revokeObjectURL(existingUrl);
    } catch {}
    activeBlobUrls.delete(trackId);
  }
}

export function revokeAllBlobUrls() {
  activeBlobUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  });
  activeBlobUrls.clear();
}

export async function saveAudioBlob(trackId: string, blob: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audioBlobs', 'readwrite');
    const store = tx.objectStore('audioBlobs');
    store.put({
      trackId,
      blob,
      size: blob.size,
      cachedAt: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAudioBlob(trackId: string): Promise<Blob | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audioBlobs', 'readonly');
    const store = tx.objectStore('audioBlobs');
    const request = store.get(trackId);
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.blob);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getTrackPlayableUrl(track: Track): Promise<string> {
  // Check if we have an active blob URL in memory
  if (activeBlobUrls.has(track.id)) {
    const active = activeBlobUrls.get(track.id);
    if (active) {
      // Re-insert to refresh LRU order
      activeBlobUrls.delete(track.id);
      activeBlobUrls.set(track.id, active);
      return active;
    }
  }

  // 1. FAST PATH: If track has a direct non-blob URL (HTTP/streaming), return immediately without touching IndexedDB
  if (track.url && track.url.trim().length > 0 && !track.url.startsWith('blob:')) {
    return track.url;
  }

  // 2. FAST PATH: If track has a local filePath and is not cached as offline blob, stream directly from server
  if (track.filePath && track.filePath.trim().length > 0 && !track.isCachedOffline) {
    return `/api/library/stream?file=${encodeURIComponent(track.filePath)}`;
  }

  // 3. Check if saved in IndexedDB (only if marked offline or only has blob url)
  if (track.isCachedOffline || !track.url || track.url.startsWith('blob:')) {
    try {
      const blob = await getAudioBlob(track.id);
      if (blob && blob.size > 20000) {
        // Evict oldest entry if pool is full
        if (activeBlobUrls.size >= MAX_ACTIVE_BLOB_URLS) {
          const oldestKey = activeBlobUrls.keys().next().value;
          if (oldestKey) {
            const oldUrl = activeBlobUrls.get(oldestKey);
            if (oldUrl) {
              try {
                URL.revokeObjectURL(oldUrl);
              } catch {}
              activeBlobUrls.delete(oldestKey);
            }
          }
        }
        const url = URL.createObjectURL(blob);
        activeBlobUrls.set(track.id, url);
        return url;
      }
    } catch (err) {
      console.warn('IndexedDB blob retrieval warning:', err);
    }
  }

  // 4. Fallback if filePath exists
  if (track.filePath && track.filePath.trim().length > 0) {
    return `/api/library/stream?file=${encodeURIComponent(track.filePath)}`;
  }

  // 5. Fallback for any remaining URL
  if (track.url && track.url.trim().length > 0) {
    return track.url;
  }

  return '';
}

export async function removeAudioBlob(trackId: string): Promise<void> {
  forceRevokeTrackBlobUrl(trackId);
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audioBlobs', 'readwrite');
    const store = tx.objectStore('audioBlobs');
    store.delete(trackId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveTrack(track: Track): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    store.put(track);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveTracks(tracks: Track[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    tracks.forEach((t) => store.put(t));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllTracks(): Promise<Track[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readonly');
    const store = tx.objectStore('tracks');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTrack(trackId: string): Promise<void> {
  await removeAudioBlob(trackId);
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    store.delete(trackId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readwrite');
    const store = tx.objectStore('playlists');
    store.put(playlist);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readonly');
    const store = tx.objectStore('playlists');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readwrite');
    const store = tx.objectStore('playlists');
    store.delete(playlistId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCacheStats(): Promise<{ cachedCount: number; totalSizeBytes: number }> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audioBlobs', 'readonly');
    const store = tx.objectStore('audioBlobs');
    const request = store.getAll();
    request.onsuccess = () => {
      const items = request.result || [];
      const totalSizeBytes = items.reduce((acc: number, item: any) => acc + (item.size || 0), 0);
      resolve({
        cachedCount: items.length,
        totalSizeBytes,
      });
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllAudioCache(): Promise<void> {
  revokeAllBlobUrls();
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    } catch {
      // ignore
    }
  }
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audioBlobs', 'readwrite');
    const store = tx.objectStore('audioBlobs');
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAudioCacheAndResetTracks(
  tracks: Track[],
  options?: { clearLocalFiles?: boolean }
): Promise<{ clearedCount: number; clearedBytes: number }> {
  revokeAllBlobUrls();

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    } catch {
      // ignore
    }
  }

  const db = await getDB();
  let clearedCount = 0;
  let clearedBytes = 0;

  const localTrackIds = new Set(
    tracks.filter((t) => t.source === 'local').map((t) => t.id)
  );

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('audioBlobs', 'readwrite');
    const store = tx.objectStore('audioBlobs');

    if (options?.clearLocalFiles) {
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        clearedCount = items.length;
        clearedBytes = items.reduce((acc: number, item: any) => acc + (item.size || 0), 0);
        store.clear();
      };
    } else {
      const req = store.openCursor();
      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const trackId = cursor.key as string;
          if (!localTrackIds.has(trackId)) {
            clearedCount++;
            clearedBytes += cursor.value?.size || 0;
            cursor.delete();
          }
          cursor.continue();
        }
      };
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Update track records: set isCachedOffline to false
  const updatedTracks: Track[] = tracks.map((t) => {
    if (options?.clearLocalFiles) {
      return { ...t, isCachedOffline: false };
    }
    if (t.source !== 'local') {
      return { ...t, isCachedOffline: false };
    }
    return t;
  });

  await saveTracks(updatedTracks);

  return { clearedCount, clearedBytes };
}

export async function saveSetting(key: string, value: any): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    store.put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get(key);
    request.onsuccess = () => {
      if (request.result && request.result.value !== undefined) {
        resolve(request.result.value as T);
      } else {
        resolve(defaultValue);
      }
    };
    request.onerror = () => resolve(defaultValue);
  });
}

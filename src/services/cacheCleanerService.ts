import { getDB, getAllTracks, saveTracks, removeAudioBlob, revokeAllBlobUrls } from './audioDb';

export interface CacheCategoryStats {
  count: number;
  bytes: number;
}

export interface CacheOverallStats {
  downloadHistory: CacheCategoryStats;
  tempVideos: CacheCategoryStats;
  audioFiles: CacheCategoryStats;
  totalBytes: number;
}

export interface ClearCacheSelection {
  downloadHistory: boolean;
  tempVideos: boolean;
  audioFiles: boolean;
}

export interface ClearCacheResult {
  clearedBytes: number;
  clearedItems: number;
  clearedTypes: string[];
}

/**
 * Formats byte size into human readable string (e.g. 14.2 Mo)
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 Mo';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

/**
 * Inspects cache usage across download history, video blobs and audio blobs
 */
export async function getCacheUsageStats(): Promise<CacheOverallStats> {
  const stats: CacheOverallStats = {
    downloadHistory: { count: 0, bytes: 0 },
    tempVideos: { count: 0, bytes: 0 },
    audioFiles: { count: 0, bytes: 0 },
    totalBytes: 0,
  };

  // 1. Download History
  try {
    const rawDl = localStorage.getItem('flowluna_dl_history');
    if (rawDl) {
      const parsed = JSON.parse(rawDl);
      if (Array.isArray(parsed)) {
        stats.downloadHistory.count = parsed.length;
        stats.downloadHistory.bytes = new Blob([rawDl]).size;
      }
    }
  } catch {}

  // 2. Video and Audio Blobs in IndexedDB
  try {
    const db = await getDB();
    const tracks = await getAllTracks();
    const trackMap = new Map(tracks.map((t) => [t.id, t]));

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('audioBlobs', 'readonly');
      const store = tx.objectStore('audioBlobs');
      const req = store.openCursor();

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const trackId = cursor.key as string;
          const size = cursor.value?.size || 0;
          const track = trackMap.get(trackId);

          if (track?.isVideo) {
            stats.tempVideos.count++;
            stats.tempVideos.bytes += size;
          } else {
            stats.audioFiles.count++;
            stats.audioFiles.bytes += size;
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[CacheCleaner] Error fetching IndexedDB stats:', err);
  }

  stats.totalBytes =
    stats.downloadHistory.bytes + stats.tempVideos.bytes + stats.audioFiles.bytes;

  return stats;
}

/**
 * Cleans user-selected cache categories safely
 */
export async function clearSelectedCache(
  selection: ClearCacheSelection
): Promise<ClearCacheResult> {
  let clearedBytes = 0;
  let clearedItems = 0;
  const clearedTypes: string[] = [];

  // 1. Download History
  if (selection.downloadHistory) {
    try {
      const rawDl = localStorage.getItem('flowluna_dl_history');
      if (rawDl) {
        const parsed = JSON.parse(rawDl);
        const count = Array.isArray(parsed) ? parsed.length : 1;
        const bytes = new Blob([rawDl]).size;
        localStorage.removeItem('flowluna_dl_history');
        clearedBytes += bytes;
        clearedItems += count;
        clearedTypes.push('Historique des téléchargements');
      }
    } catch (err) {
      console.warn('[CacheCleaner] Erreur vidage historique téléchargements:', err);
    }
  }

  // 2. Video & Audio files in IndexedDB
  if (selection.tempVideos || selection.audioFiles) {
    try {
      const db = await getDB();
      const tracks = await getAllTracks();
      const trackMap = new Map(tracks.map((t) => [t.id, t]));

      const targetTrackIdsToDeleteBlobs: string[] = [];
      const updatedTracks = [...tracks];

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('audioBlobs', 'readwrite');
        const store = tx.objectStore('audioBlobs');
        const req = store.openCursor();

        req.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const trackId = cursor.key as string;
            const size = cursor.value?.size || 0;
            const track = trackMap.get(trackId);
            const isVideo = !!track?.isVideo;

            const shouldDelete =
              (isVideo && selection.tempVideos) ||
              (!isVideo && selection.audioFiles);

            if (shouldDelete) {
              clearedBytes += size;
              clearedItems++;
              targetTrackIdsToDeleteBlobs.push(trackId);
              cursor.delete();
            }

            cursor.continue();
          } else {
            resolve();
          }
        };

        req.onerror = () => reject(req.error);
      });

      // Cleanup blob memory URLs
      targetTrackIdsToDeleteBlobs.forEach((id) => {
        removeAudioBlob(id);
      });

      // Update track records: mark offline cache as false
      const toDeleteSet = new Set(targetTrackIdsToDeleteBlobs);
      const remainingTracks = updatedTracks.map((t) => {
        if (toDeleteSet.has(t.id)) {
          return { ...t, isCachedOffline: false };
        }
        return t;
      });

      await saveTracks(remainingTracks);

      if (selection.tempVideos) {
        clearedTypes.push('Vidéos temporaires');
      }
      if (selection.audioFiles) {
        clearedTypes.push('Fichiers audio');
      }
    } catch (err) {
      console.warn('[CacheCleaner] Erreur vidage audioBlobs:', err);
      throw new Error("Erreur lors de la suppression du cache IndexedDB");
    }
  }

  // 3. Clear window.caches (Service Worker / Application Cache)
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await window.caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('flowluna')).map((k) => window.caches.delete(k))
      );
    } catch {}
  }

  revokeAllBlobUrls();

  return {
    clearedBytes,
    clearedItems,
    clearedTypes,
  };
}

import { Track } from '../types';
import { getAllTracks, saveTrack, saveTracks } from './audioDb';

export interface BackgroundScanStatus {
  isScanning: boolean;
  totalIndexed: number;
  lastScannedCount: number;
  lastScanTimestamp: number | null;
  error: string | null;
}

type ScanCallback = (newTracks: Track[]) => void;

class BackgroundLibraryScanner {
  private isScanning = false;
  private listeners: Set<ScanCallback> = new Set();
  private lastScanTimestamp: number | null = null;
  private lastScannedCount = 0;
  private scanIntervalId: any = null;

  constructor() {
    // Listen to window focus for instant discovery when user drops files into local music folder
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        // Trigger subtle background check on window focus
        this.runScan(true);
      });
    }
  }

  public subscribe(callback: ScanCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getStatus(): BackgroundScanStatus {
    return {
      isScanning: this.isScanning,
      totalIndexed: this.lastScannedCount,
      lastScannedCount: this.lastScannedCount,
      lastScanTimestamp: this.lastScanTimestamp,
      error: null,
    };
  }

  /**
   * Starts periodic background scan (runs every 45s without impacting UI performance)
   */
  public start(intervalMs = 45000) {
    // Run initial scan immediately
    this.runScan(false);

    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
    }
    this.scanIntervalId = setInterval(() => {
      this.runScan(true);
    }, intervalMs);
  }

  public stop() {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }
  }

  private activeScanPromise: Promise<Track[]> | null = null;

  /**
   * Executes a background scan against local server storage and IndexedDB
   */
  public async runScan(isSilent = false, force = false): Promise<Track[]> {
    if (this.isScanning && !force && this.activeScanPromise) {
      return this.activeScanPromise;
    }
    this.isScanning = true;
    this.activeScanPromise = this.executeScan(isSilent);
    try {
      return await this.activeScanPromise;
    } finally {
      this.isScanning = false;
      this.activeScanPromise = null;
    }
  }

  private async executeScan(isSilent = false): Promise<Track[]> {
    try {
      const response = await fetch('/api/library/scan');
      if (!response.ok) {
        throw new Error(`Scan server error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !Array.isArray(data.tracks)) {
        return [];
      }

      const scannedTracks: Track[] = data.tracks;
      this.lastScannedCount = scannedTracks.length;
      this.lastScanTimestamp = Date.now();

      // Retrieve existing tracks from IndexedDB
      const existing = await getAllTracks();

      // Find brand new tracks or existing tracks that need duration correction
      const newlyDiscovered: Track[] = [];
      const updatedExisting: Track[] = [];

      for (const scanned of scannedTracks) {
        const signature = `${scanned.title.toLowerCase().trim()}:::${scanned.artist.toLowerCase().trim()}`;
        const existingTrack = existing.find(
          (t) =>
            t.id === scanned.id ||
            (scanned.filePath && t.filePath && t.filePath.toLowerCase() === scanned.filePath.toLowerCase()) ||
            (scanned.url && t.url === scanned.url) ||
            (!scanned.filePath && `${t.title.toLowerCase().trim()}:::${t.artist.toLowerCase().trim()}` === signature && (t.album === scanned.album || (!t.album && !scanned.album)))
        );

        if (!existingTrack) {
          newlyDiscovered.push(scanned);
        } else {
          let hasUpdated = false;

          // If the existing track had an inaccurate/fallback duration (180 or 0) and scanned has a real duration
          if ((!existingTrack.duration || existingTrack.duration === 180) && scanned.duration && scanned.duration > 0 && scanned.duration !== 180) {
            existingTrack.duration = scanned.duration;
            if (scanned.bitrate) existingTrack.bitrate = scanned.bitrate;
            hasUpdated = true;
          }

          // If the existing track had a fallback Unsplash cover or no cover, and scanned track has a real cover
          const isGenericCover = !existingTrack.coverUrl || existingTrack.coverUrl.includes('images.unsplash.com');
          const isNewRealCover = scanned.coverUrl && !scanned.coverUrl.includes('images.unsplash.com');
          if (isGenericCover && isNewRealCover) {
            existingTrack.coverUrl = scanned.coverUrl;
            hasUpdated = true;
          }

          // If the existing track had default/missing album/genre/year and scanned has real metadata
          if ((!existingTrack.album || existingTrack.album === 'Bibliothèque Locale' || existingTrack.album === 'Fichiers PC Locaux') && scanned.album && scanned.album !== 'Bibliothèque Locale') {
            existingTrack.album = scanned.album;
            hasUpdated = true;
          }
          if (!existingTrack.genre && scanned.genre) {
            existingTrack.genre = scanned.genre;
            hasUpdated = true;
          }
          if (!existingTrack.filePath && scanned.filePath) {
            existingTrack.filePath = scanned.filePath;
            hasUpdated = true;
          }
          if ((!existingTrack.url || existingTrack.url.startsWith('blob:')) && scanned.url) {
            existingTrack.url = scanned.url;
            hasUpdated = true;
          }

          if (hasUpdated) {
            updatedExisting.push(existingTrack);
          }
        }
      }

      const allToPersist = [...newlyDiscovered, ...updatedExisting];
      if (allToPersist.length > 0) {
        // Save automatically into IndexedDB
        await saveTracks(allToPersist);

        // Notify subscribers (App.tsx updates React state immediately)
        this.listeners.forEach((callback) => {
          try {
            callback(allToPersist);
          } catch (e) {
            console.error('Error in background scanner listener:', e);
          }
        });

        if (!isSilent) {
          console.info(`[BackgroundScanner] Updated ${allToPersist.length} tracks (${newlyDiscovered.length} new, ${updatedExisting.length} duration fixed).`);
        }
      }

      return allToPersist;
    } catch (err) {
      console.warn('[BackgroundScanner] Local library scan check:', err);
      return [];
    } finally {
      this.isScanning = false;
    }
  }
}

export const backgroundScanner = new BackgroundLibraryScanner();

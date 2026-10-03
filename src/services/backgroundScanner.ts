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

  /**
   * Executes a background scan against local server storage and IndexedDB
   */
  public async runScan(isSilent = false): Promise<Track[]> {
    if (this.isScanning) return [];
    this.isScanning = true;

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
      const existingUrls = new Set(existing.map((t) => t.url).filter(Boolean));
      const existingIds = new Set(existing.map((t) => t.id));
      const existingTitleArtist = new Set(
        existing.map((t) => `${t.title.toLowerCase().trim()}:::${t.artist.toLowerCase().trim()}`)
      );

      // Find brand new tracks not yet in the library
      const newlyDiscovered: Track[] = [];

      for (const scanned of scannedTracks) {
        const signature = `${scanned.title.toLowerCase().trim()}:::${scanned.artist.toLowerCase().trim()}`;
        const alreadyExists =
          existingIds.has(scanned.id) ||
          (scanned.url && existingUrls.has(scanned.url)) ||
          existingTitleArtist.has(signature);

        if (!alreadyExists) {
          newlyDiscovered.push(scanned);
        }
      }

      if (newlyDiscovered.length > 0) {
        // Save automatically into IndexedDB
        await saveTracks(newlyDiscovered);

        // Notify subscribers (App.tsx updates React state immediately)
        this.listeners.forEach((callback) => {
          try {
            callback(newlyDiscovered);
          } catch (e) {
            console.error('Error in background scanner listener:', e);
          }
        });

        if (!isSilent) {
          console.info(`[BackgroundScanner] Auto-indexed ${newlyDiscovered.length} new local tracks.`);
        }
      }

      return newlyDiscovered;
    } catch (err) {
      console.warn('[BackgroundScanner] Local library scan check:', err);
      return [];
    } finally {
      this.isScanning = false;
    }
  }
}

export const backgroundScanner = new BackgroundLibraryScanner();

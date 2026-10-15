import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onMaximizedChange: (callback: (maximized: boolean) => void) => () => void;
  onMediaControl: (callback: (action: 'play-pause' | 'next' | 'prev' | 'stop') => void) => () => void;
  updateTrayTrack: (info: { title: string; artist: string; isPlaying: boolean }) => Promise<void>;
  getBinariesStatus: () => Promise<any>;
  updateYtdlp: () => Promise<any>;
  getLibVlcStatus?: () => Promise<any>;
  updateLibVlc?: () => Promise<any>;
  setCompactMode?: (enabled: boolean, width?: number, height?: number) => Promise<any>;
  selectMusicFolder: () => Promise<string | null>;
  selectMusicFiles: () => Promise<string[]>;
  setBackdrop?: (effect: string, theme: string) => Promise<any>;
  applyUpdate?: (installerPath?: string) => Promise<any>;
  openDefaultAppsSettings?: () => Promise<void>;
  onOpenFiles?: (callback: (filePaths: string[]) => void) => () => void;
  getPendingOpenFiles?: () => Promise<string[]>;
  ackOpenFiles?: (files: string[]) => Promise<void>;
  toggleFullscreen: () => Promise<boolean>;
  setFullScreen: (enabled: boolean) => Promise<boolean>;
  isFullScreen: () => Promise<boolean>;
  onFullScreenChange?: (callback: (fullscreen: boolean) => void) => () => void;
  getAppVersion: () => Promise<string>;
  showSaveDialog?: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
}


// Proactive buffer for incoming files (sent from main before React subscribes)
let openFilesListeners: ((files: string[]) => void)[] = [];
let preloadBufferedFiles: string[] = [];

ipcRenderer.on('open-files', (_event, files: string[]) => {
  if (!Array.isArray(files) || files.length === 0) return;
  if (openFilesListeners.length > 0) {
    for (const listener of openFilesListeners) {
      try {
        listener(files);
      } catch (err) {
        console.error('[Preload] Error in open-files listener:', err);
      }
    }
  } else {
    for (const f of files) {
      if (!preloadBufferedFiles.includes(f)) {
        preloadBufferedFiles.push(f);
      }
    }
  }
});

const api: ElectronAPI = {
  isElectron: true,
  platform: process.platform,
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizedChange: (callback: (maximized: boolean) => void) => {
    const subscription = (_event: any, value: boolean) => callback(value);
    ipcRenderer.on('window-maximized-changed', subscription);
    return () => {
      ipcRenderer.removeListener('window-maximized-changed', subscription);
    };
  },
  onMediaControl: (callback: (action: 'play-pause' | 'next' | 'prev' | 'stop') => void) => {
    const subscription = (_event: any, action: 'play-pause' | 'next' | 'prev' | 'stop') => callback(action);
    ipcRenderer.on('media-control', subscription);
    return () => {
      ipcRenderer.removeListener('media-control', subscription);
    };
  },
  updateTrayTrack: (info: { title: string; artist: string; isPlaying: boolean }) =>
    ipcRenderer.invoke('update-tray-track', info),
  getBinariesStatus: () => ipcRenderer.invoke('get-binaries-status'),
  updateYtdlp: () => ipcRenderer.invoke('update-ytdlp'),
  getLibVlcStatus: () => fetch('/api/engine/libvlc-status').then((r) => r.json()),
  updateLibVlc: () => fetch('/api/engine/update-libvlc', { method: 'POST' }).then((r) => r.json()),
  setCompactMode: (enabled: boolean, width = 360, height = 240) =>
    ipcRenderer.invoke('window-set-compact-mode', enabled, width, height),
  selectMusicFolder: () => ipcRenderer.invoke('select-music-folder'),
  selectMusicFiles: () => ipcRenderer.invoke('select-music-files'),
  setBackdrop: (effect: string, theme: string) =>
    ipcRenderer.invoke('window-set-backdrop', effect, theme),
  openDefaultAppsSettings: () => ipcRenderer.invoke('open-default-apps-settings'),
  onOpenFiles: (callback: (filePaths: string[]) => void) => {
    openFilesListeners.push(callback);
    if (preloadBufferedFiles.length > 0) {
      const buffered = [...preloadBufferedFiles];
      preloadBufferedFiles = [];
      setTimeout(() => {
        try {
          callback(buffered);
        } catch (err) {
          console.error('[Preload] Error flushing buffered files:', err);
        }
      }, 0);
    }
    return () => {
      openFilesListeners = openFilesListeners.filter((cb) => cb !== callback);
    };
  },
  getPendingOpenFiles: async () => {
    const buffered = [...preloadBufferedFiles];
    preloadBufferedFiles = [];
    try {
      const fromMain = await ipcRenderer.invoke('get-pending-open-files');
      const combined = Array.from(new Set([...buffered, ...(Array.isArray(fromMain) ? fromMain : [])]));
      if (combined.length > 0) {
        ipcRenderer.invoke('ack-open-files', combined).catch(() => {});
      }
      return combined;
    } catch {
      return buffered;
    }
  },
  ackOpenFiles: (files: string[]) => ipcRenderer.invoke('ack-open-files', files),
  applyUpdate: (installerPath?: string) =>
    fetch('/api/app/apply-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installerPath }),
    }).then((r) => r.json()),
  toggleFullscreen: () => ipcRenderer.invoke('window-toggle-fullscreen'),
  setFullScreen: (enabled: boolean) => ipcRenderer.invoke('window-set-fullscreen', enabled),
  isFullScreen: () => ipcRenderer.invoke('window-is-fullscreen'),
  onFullScreenChange: (callback: (fullscreen: boolean) => void) => {
    const subscription = (_event: any, value: boolean) => callback(value);
    ipcRenderer.on('window-fullscreen-changed', subscription);
    return () => {
      ipcRenderer.removeListener('window-fullscreen-changed', subscription);
    };
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  showSaveDialog: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('show-save-dialog', options),
};

contextBridge.exposeInMainWorld('electronAPI', api);


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
  toggleFullscreen: () => Promise<boolean>;
  isFullScreen: () => Promise<boolean>;
  onFullScreenChange?: (callback: (fullscreen: boolean) => void) => () => void;
}

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
    const subscription = (_event: any, filePaths: string[]) => callback(filePaths);
    ipcRenderer.on('open-files', subscription);
    return () => {
      ipcRenderer.removeListener('open-files', subscription);
    };
  },
  applyUpdate: (installerPath?: string) =>
    fetch('/api/app/apply-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installerPath }),
    }).then((r) => r.json()),
  toggleFullscreen: () => ipcRenderer.invoke('window-toggle-fullscreen'),
  isFullScreen: () => ipcRenderer.invoke('window-is-fullscreen'),
  onFullScreenChange: (callback: (fullscreen: boolean) => void) => {
    const subscription = (_event: any, value: boolean) => callback(value);
    ipcRenderer.on('window-fullscreen-changed', subscription);
    return () => {
      ipcRenderer.removeListener('window-fullscreen-changed', subscription);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

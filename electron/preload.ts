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
  selectMusicFolder: () => Promise<string | null>;
  selectMusicFiles: () => Promise<string[]>;
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
  selectMusicFolder: () => ipcRenderer.invoke('select-music-folder'),
  selectMusicFiles: () => ipcRenderer.invoke('select-music-files'),
};

contextBridge.exposeInMainWorld('electronAPI', api);

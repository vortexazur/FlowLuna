/// <reference types="vite/client" />

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

export interface ElectronAPIType {
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

declare global {
  interface Window {
    electronAPI?: ElectronAPIType;
  }
}

import { useState, useCallback, useRef, useEffect } from 'react';
import { Track } from '../types';
import { SettingsTab } from '../components/SettingsModal';

export interface ModalManager {
  // Equalizer Modal
  isEqualizerOpen: boolean;
  setIsEqualizerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openEqualizer: () => void;
  closeEqualizer: () => void;
  toggleEqualizer: () => void;

  // Settings Modal & Active Tab
  isSettingsOpen: boolean;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  settingsInitialTab: SettingsTab;
  setSettingsInitialTab: React.Dispatch<React.SetStateAction<SettingsTab>>;
  openSettings: (tab?: SettingsTab) => void;
  closeSettings: () => void;
  toggleSettings: () => void;

  // Lyrics & Fullscreen
  isFullscreenOpen: boolean;
  setIsFullscreenOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openFullscreen: () => void;
  closeFullscreen: () => void;
  toggleFullscreen: () => void;

  // Queue Drawer
  isQueueOpen: boolean;
  setIsQueueOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openQueue: () => void;
  closeQueue: () => void;
  toggleQueue: () => void;

  // MiniPlayer / Floating Widget
  isMiniPlayer: boolean;
  setIsMiniPlayer: React.Dispatch<React.SetStateAction<boolean>>;
  openMiniPlayer: () => void;
  closeMiniPlayer: () => void;
  toggleMiniPlayer: () => void;
  handleOpenDetachedPip: () => Promise<void>;

  // Detached Picture-in-Picture Window & Notifications
  detachedPipWindow: Window | null;
  setDetachedPipWindow: React.Dispatch<React.SetStateAction<Window | null>>;
  closeDetachedPip: () => void;
  pipNotification: string | null;
  setPipNotification: React.Dispatch<React.SetStateAction<string | null>>;
  showPipNotification: (message: string, durationMs?: number) => void;

  // Playlist Modals
  isCreatePlaylistModalOpen: boolean;
  setIsCreatePlaylistModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openCreatePlaylistModal: () => void;
  closeCreatePlaylistModal: () => void;

  isManageSidebarOpen: boolean;
  setIsManageSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openManageSidebar: () => void;
  closeManageSidebar: () => void;

  // Audio Processing Modals
  trimmerTrack: Track | null;
  setTrimmerTrack: React.Dispatch<React.SetStateAction<Track | null>>;
  openTrimmer: (track: Track) => void;
  closeTrimmer: () => void;

  tagEditorTrack: Track | null;
  setTagEditorTrack: React.Dispatch<React.SetStateAction<Track | null>>;
  openTagEditor: (track: Track) => void;
  closeTagEditor: () => void;

  isDeduplicatorOpen: boolean;
  setIsDeduplicatorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openDeduplicator: () => void;
  closeDeduplicator: () => void;
  toggleDeduplicator: () => void;

  isMergerOpen: boolean;
  setIsMergerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openMerger: () => void;
  closeMerger: () => void;
  toggleMerger: () => void;

  isStatsOpen: boolean;
  setIsStatsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openStats: () => void;
  closeStats: () => void;
  toggleStats: () => void;

  // Global Command Palette
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  // Remote Control Modal (FlowLuna Remote)
  isRemoteModalOpen: boolean;
  setIsRemoteModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openRemoteModal: () => void;
  closeRemoteModal: () => void;
  toggleRemoteModal: () => void;

  // Global Actions
  closeAllModals: () => void;
}

/**
 * useModalManager
 * Centralizes UI modal, drawer, dialog, and floating widget state management.
 * Decouples state mutations from App.tsx and provides atomic, testable actions.
 */
export function useModalManager(): ModalManager {
  // Modal states
  const [isEqualizerOpen, setIsEqualizerOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('appearance');
  const [isFullscreenOpen, setIsFullscreenOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isMiniPlayer, setIsMiniPlayer] = useState<boolean>(false);
  const [detachedPipWindow, setDetachedPipWindow] = useState<Window | null>(null);
  const [pipNotification, setPipNotification] = useState<string | null>(null);
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState<boolean>(false);
  const [isManageSidebarOpen, setIsManageSidebarOpen] = useState<boolean>(false);
  const [trimmerTrack, setTrimmerTrack] = useState<Track | null>(null);
  const [tagEditorTrack, setTagEditorTrack] = useState<Track | null>(null);
  const [isDeduplicatorOpen, setIsDeduplicatorOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isMergerOpen, setIsMergerOpen] = useState<boolean>(false);
  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState<boolean>(false);

  const pipTimerRef = useRef<NodeJS.Timeout | number | null>(null);

  useEffect(() => {
    return () => {
      if (pipTimerRef.current) {
        clearTimeout(pipTimerRef.current);
      }
    };
  }, []);

  const showPipNotification = useCallback((message: string, durationMs = 3000) => {
    setPipNotification(message);
    if (pipTimerRef.current) {
      clearTimeout(pipTimerRef.current);
    }
    pipTimerRef.current = setTimeout(() => {
      setPipNotification(null);
      pipTimerRef.current = null;
    }, durationMs);
  }, []);

  // Equalizer
  const openEqualizer = useCallback(() => setIsEqualizerOpen(true), []);
  const closeEqualizer = useCallback(() => setIsEqualizerOpen(false), []);
  const toggleEqualizer = useCallback(() => setIsEqualizerOpen((prev) => !prev), []);

  // Settings
  const openSettings = useCallback((tab?: SettingsTab) => {
    if (tab) {
      setSettingsInitialTab(tab);
    }
    setIsSettingsOpen(true);
  }, []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const toggleSettings = useCallback(() => setIsSettingsOpen((prev) => !prev), []);

  // Fullscreen
  const openFullscreen = useCallback(() => setIsFullscreenOpen(true), []);
  const closeFullscreen = useCallback(() => setIsFullscreenOpen(false), []);
  const toggleFullscreen = useCallback(() => setIsFullscreenOpen((prev) => !prev), []);

  // Queue
  const openQueue = useCallback(() => setIsQueueOpen(true), []);
  const closeQueue = useCallback(() => setIsQueueOpen(false), []);
  const toggleQueue = useCallback(() => setIsQueueOpen((prev) => !prev), []);

  // MiniPlayer
  const openMiniPlayer = useCallback(() => setIsMiniPlayer(true), []);
  const closeMiniPlayer = useCallback(() => setIsMiniPlayer(false), []);
  const toggleMiniPlayer = useCallback(() => setIsMiniPlayer((prev) => !prev), []);

  // Detached Picture-in-Picture / Compact widget toggle
  const handleOpenDetachedPip = useCallback(async () => {
    setIsMiniPlayer((prev) => {
      const next = !prev;
      if (next) {
        window.electronAPI?.setCompactMode?.(true, 360, 240);
        showPipNotification('Mode Widget Flottant activé');
      } else {
        window.electronAPI?.setCompactMode?.(false);
      }
      return next;
    });
  }, [showPipNotification]);

  const closeDetachedPip = useCallback(() => {
    if (detachedPipWindow && !detachedPipWindow.closed) {
      try {
        detachedPipWindow.close();
      } catch {}
    }
    setDetachedPipWindow(null);
  }, [detachedPipWindow]);

  // Playlist Modals
  const openCreatePlaylistModal = useCallback(() => setIsCreatePlaylistModalOpen(true), []);
  const closeCreatePlaylistModal = useCallback(() => setIsCreatePlaylistModalOpen(false), []);

  const openManageSidebar = useCallback(() => setIsManageSidebarOpen(true), []);
  const closeManageSidebar = useCallback(() => setIsManageSidebarOpen(false), []);

  // Audio Tools
  const openTrimmer = useCallback((track: Track) => setTrimmerTrack(track), []);
  const closeTrimmer = useCallback(() => setTrimmerTrack(null), []);

  const openTagEditor = useCallback((track: Track) => setTagEditorTrack(track), []);
  const closeTagEditor = useCallback(() => setTagEditorTrack(null), []);

  const openDeduplicator = useCallback(() => setIsDeduplicatorOpen(true), []);
  const closeDeduplicator = useCallback(() => setIsDeduplicatorOpen(false), []);
  const toggleDeduplicator = useCallback(() => setIsDeduplicatorOpen((prev) => !prev), []);

  const openMerger = useCallback(() => setIsMergerOpen(true), []);
  const closeMerger = useCallback(() => setIsMergerOpen(false), []);
  const toggleMerger = useCallback(() => setIsMergerOpen((prev) => !prev), []);

  const openStats = useCallback(() => setIsStatsOpen(true), []);
  const closeStats = useCallback(() => setIsStatsOpen(false), []);
  const toggleStats = useCallback(() => setIsStatsOpen((prev) => !prev), []);

  // Command Palette
  const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);
  const toggleCommandPalette = useCallback(() => setIsCommandPaletteOpen((prev) => !prev), []);

  // Remote Control Modal
  const openRemoteModal = useCallback(() => setIsRemoteModalOpen(true), []);
  const closeRemoteModal = useCallback(() => setIsRemoteModalOpen(false), []);
  const toggleRemoteModal = useCallback(() => setIsRemoteModalOpen((prev) => !prev), []);

  // Close All Modals
  const closeAllModals = useCallback(() => {
    setIsEqualizerOpen(false);
    setIsSettingsOpen(false);
    setIsFullscreenOpen(false);
    setIsQueueOpen(false);
    setIsCreatePlaylistModalOpen(false);
    setIsManageSidebarOpen(false);
    setTrimmerTrack(null);
    setTagEditorTrack(null);
    setIsDeduplicatorOpen(false);
    setIsCommandPaletteOpen(false);
    setIsStatsOpen(false);
    setIsMergerOpen(false);
    setIsRemoteModalOpen(false);
  }, []);

  return {
    isEqualizerOpen,
    setIsEqualizerOpen,
    openEqualizer,
    closeEqualizer,
    toggleEqualizer,

    isSettingsOpen,
    setIsSettingsOpen,
    settingsInitialTab,
    setSettingsInitialTab,
    openSettings,
    closeSettings,
    toggleSettings,

    isFullscreenOpen,
    setIsFullscreenOpen,
    openFullscreen,
    closeFullscreen,
    toggleFullscreen,

    isQueueOpen,
    setIsQueueOpen,
    openQueue,
    closeQueue,
    toggleQueue,

    isMiniPlayer,
    setIsMiniPlayer,
    openMiniPlayer,
    closeMiniPlayer,
    toggleMiniPlayer,
    handleOpenDetachedPip,

    detachedPipWindow,
    setDetachedPipWindow,
    closeDetachedPip,
    pipNotification,
    setPipNotification,
    showPipNotification,

    isCreatePlaylistModalOpen,
    setIsCreatePlaylistModalOpen,
    openCreatePlaylistModal,
    closeCreatePlaylistModal,

    isManageSidebarOpen,
    setIsManageSidebarOpen,
    openManageSidebar,
    closeManageSidebar,

    trimmerTrack,
    setTrimmerTrack,
    openTrimmer,
    closeTrimmer,

    tagEditorTrack,
    setTagEditorTrack,
    openTagEditor,
    closeTagEditor,

    isDeduplicatorOpen,
    setIsDeduplicatorOpen,
    openDeduplicator,
    closeDeduplicator,
    toggleDeduplicator,

    isMergerOpen,
    setIsMergerOpen,
    openMerger,
    closeMerger,
    toggleMerger,

    isStatsOpen,
    setIsStatsOpen,
    openStats,
    closeStats,
    toggleStats,

    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,

    isRemoteModalOpen,
    setIsRemoteModalOpen,
    openRemoteModal,
    closeRemoteModal,
    toggleRemoteModal,

    closeAllModals,
  };
}

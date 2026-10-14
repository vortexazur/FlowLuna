import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Track,
  Playlist,
  PlayerSettings,
  EqualizerSettings,
  EqualizerBand,
  AccentColor,
  BackdropEffect,
  AppUpdateInfo,
  DEFAULT_MARATHON_CONFIG,
  APP_VERSION,
} from './types';
import { compareSemVer } from './utils/semver';
import {
  getAllTracks,
  saveTracks,
  saveTrack,
  deleteTrack as dbDeleteTrack,
  getAllPlaylists,
  savePlaylist,
  deletePlaylist as dbDeletePlaylist,
  getTrackPlayableUrl,
  revokeTrackBlobUrl,
  getSetting,
  saveSetting,
  saveAudioBlob,
  getAudioBlob,
} from './services/audioDb';
import { INITIAL_PLAYLISTS } from './data/defaultTracks';
import { audioEngine, DEFAULT_EQ_FREQUENCIES, EQ_PRESETS } from './services/audioEngine';
import { processLocalAudioFile } from './utils/fileAudioLoader';
import { Sidebar } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { LibraryView } from './components/LibraryView';
import { PlaylistView } from './components/PlaylistView';
import { EqualizerModal } from './components/EqualizerModal';
import { SettingsModal } from './components/SettingsModal';
import { LyricsAndFullscreen } from './components/LyricsAndFullscreen';
import { QueueDrawer } from './components/QueueDrawer';
import { MiniPlayer } from './components/MiniPlayer';
import { DetachedMiniPlayerPortal } from './components/DetachedMiniPlayer';
import { openAlwaysOnTopWindow } from './services/pictureInPictureService';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { ManageSidebarPlaylistsModal } from './components/ManageSidebarPlaylistsModal';
import { AllPlaylistsView } from './components/AllPlaylistsView';
import { AudioTrimmerModal } from './components/AudioTrimmerModal';
import { TrackTagEditorModal } from './components/TrackTagEditorModal';
import { DuplicateFinderModal } from './components/DuplicateFinderModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { ListeningStatsModal } from './components/ListeningStatsModal';
import { AudioMergerModal } from './components/AudioMergerModal';
import { VideoPlayer, VideoDisplayMode } from './components/VideoPlayer';
import { VideosView } from './components/VideosView';
import { DownloaderView } from './components/DownloaderView';
import { backgroundScanner } from './services/backgroundScanner';
import { Layers, Maximize2 } from 'lucide-react';
import { TitleBar } from './components/TitleBar';
import { discordRpc } from './services/discordRpcService';
import { UpdateNotificationToast } from './components/UpdateNotificationToast';
import { showSystemNotification } from './utils/systemNotification';

const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
  language: 'fr',
  theme: 'dark',
  accent: 'emerald',
  backdropEffect: 'glass',
  glassIntensity: 70,
  acrylicIntensity: 30,
  visualizerStyle: 'bars',
  crossfadeDuration: 0,
  gaplessPlayback: true,
  autoCacheFavorites: true,
  maxCacheSizeMb: 1024,
  highQualityStream: true,
  volumeNormalization: true,
  normalizationTarget: 'streaming',
  discordRpcEnabled: true,
  smtcEnabled: true,
  compactMode: false,
  compactPlayerDock: 'bottom',
  compactPlayerGhost: false,
  autoSkipOpening: false,
  enableSkipOpening: true,
  marathonConfig: DEFAULT_MARATHON_CONFIG,
  videoSkipForwardInterval: 10,
  videoAspectRatio: 'contain',
};

const DEFAULT_EQ_SETTINGS: EqualizerSettings = {
  enabled: true,
  preset: 'Flat',
  bands: DEFAULT_EQ_FREQUENCIES.map((freq) => ({
    frequency: freq,
    gain: 0,
    label: freq >= 1000 ? `${freq / 1000}k` : `${freq}`,
  })),
  bassBoost: 2,
  trebleBoost: 2,
  preampGain: 0,
  surroundEffect: false,
};

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentView, setCurrentView] = useState<string>('library');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  // Playback state
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('all');
  const queueRef = useRef<Track[]>([]);
  queueRef.current = queue;
  const currentTrackIndexRef = useRef<number>(-1);
  currentTrackIndexRef.current = currentTrackIndex;
  const playRequestIdRef = useRef<number>(0);
  const crossfadeAnimRef = useRef<number | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const lastTrackStartTimeRef = useRef<number>(0);

  // Modals & Panels
  const [isEqualizerOpen, setIsEqualizerOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isMiniPlayer, setIsMiniPlayer] = useState<boolean>(false);
  const [isAppMinimized, setIsAppMinimized] = useState<boolean>(false);
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

  // Settings
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>(DEFAULT_PLAYER_SETTINGS);
  const [equalizerSettings, setEqualizerSettings] = useState<EqualizerSettings>(DEFAULT_EQ_SETTINGS);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    'appearance' | 'audio' | 'video' | 'general' | 'system' | 'shortcuts'
  >('appearance');

  // Application Updates State
  const [appVersion, setAppVersion] = useState<string>(APP_VERSION);
  const [appUpdateInfo, setAppUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isUpdateToastDismissed, setIsUpdateToastDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI
        .getAppVersion()
        .then((v) => {
          if (v && typeof v === 'string') {
            setAppVersion(v.trim());
          }
        })
        .catch(() => {});
    }
  }, []);


  // Video Mode: 'theater' (fullscreen/cinema), 'pip' (floating mini window), 'hidden' (audio-only)
  const [videoMode, setVideoMode] = useState<VideoDisplayMode>('theater');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentPlayingTrack = useMemo(() => {
    const base = queue[currentTrackIndex] || null;
    if (!base) return null;
    const inTracks = tracks.find((t) => t.id === base.id);
    return inTracks ? { ...base, ...inTracks, isFavorite: inTracks.isFavorite } : base;
  }, [queue, currentTrackIndex, tracks]);

  const currentPlayingTrackRef = useRef(currentPlayingTrack);
  currentPlayingTrackRef.current = currentPlayingTrack;
  const playerSettingsRef = useRef(playerSettings);
  playerSettingsRef.current = playerSettings;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  // Initialize Data from IndexedDB
  const loadDatabase = useCallback(async () => {
    try {
      let loadedTracks = await getAllTracks();

      // Clean up legacy base tracks (track-1 through track-6 or default source) from IndexedDB
      const defaultTrackIds = new Set(['track-1', 'track-2', 'track-3', 'track-4', 'track-5', 'track-6']);
      const hadDefaultTracks = loadedTracks.some((t) => t.source === 'default' || defaultTrackIds.has(t.id));
      if (hadDefaultTracks) {
        for (const t of loadedTracks) {
          if (t.source === 'default' || defaultTrackIds.has(t.id)) {
            await dbDeleteTrack(t.id).catch(() => {});
          }
        }
        loadedTracks = loadedTracks.filter((t) => t.source !== 'default' && !defaultTrackIds.has(t.id));
      }

      setTracks(loadedTracks);

      // Non-blocking background repair for existing tracks with fallback duration (180s)
      const placeholderTracks = loadedTracks.filter((t) => (!t.duration || t.duration === 180) && t.source === 'local');
      if (placeholderTracks.length > 0) {
        setTimeout(async () => {
          const repaired: Track[] = [];
          for (const track of placeholderTracks.slice(0, 30)) {
            try {
              const blob = await getAudioBlob(track.id);
              if (!blob) continue;
              const dur = await new Promise<number>((resolve) => {
                const u = URL.createObjectURL(blob);
                const a = new Audio();
                a.preload = 'metadata';
                let resolved = false;
                const done = (val: number) => {
                  if (resolved) return;
                  resolved = true;
                  clearTimeout(tId);
                  URL.revokeObjectURL(u);
                  resolve(val > 0 && !isNaN(val) && isFinite(val) ? val : 180);
                };
                const tId = setTimeout(() => done(a.duration || 180), 2500);
                a.onloadedmetadata = () => done(a.duration);
                a.ondurationchange = () => done(a.duration);
                a.onerror = () => done(180);
                a.src = u;
                a.load();
              });

              if (dur > 0 && dur !== 180) {
                const updatedTrack = { ...track, duration: Math.round(dur) };
                await saveTrack(updatedTrack);
                repaired.push(updatedTrack);
              }
            } catch {
              // ignore
            }
          }
          if (repaired.length > 0) {
            setTracks((prev) => {
              const map = new Map(prev.map((t) => [t.id, t]));
              for (const r of repaired) {
                map.set(r.id, r);
              }
              return Array.from(map.values());
            });
          }
        }, 1200);
      }

      let loadedPlaylists = await getAllPlaylists();
      if (loadedPlaylists.length === 0) {
        for (const pl of INITIAL_PLAYLISTS) {
          await savePlaylist(pl);
        }
        loadedPlaylists = INITIAL_PLAYLISTS;
      } else {
        // Purge obsolete demo playlists from database if present
        if (loadedPlaylists.some((p) => p.id === 'playlist-chill' || p.id === 'playlist-offline' || p.id === 'playlist-youtube')) {
          await dbDeletePlaylist('playlist-chill').catch(() => {});
          await dbDeletePlaylist('playlist-offline').catch(() => {});
          await dbDeletePlaylist('playlist-youtube').catch(() => {});
          loadedPlaylists = loadedPlaylists.filter((p) => p.id !== 'playlist-chill' && p.id !== 'playlist-offline' && p.id !== 'playlist-youtube');
        }

        // Clean up references to deleted default tracks from playlists
        for (let i = 0; i < loadedPlaylists.length; i++) {
          const pl = loadedPlaylists[i];
          const cleanedTrackIds = pl.trackIds.filter((id) => !defaultTrackIds.has(id));
          if (cleanedTrackIds.length !== pl.trackIds.length) {
            loadedPlaylists[i] = { ...pl, trackIds: cleanedTrackIds };
            await savePlaylist(loadedPlaylists[i]).catch(() => {});
          }
        }

        // Ensure playlist-favorites is synchronized with actual favorite tracks
        const favTrackIds = loadedTracks.filter((t) => t.isFavorite).map((t) => t.id);
        const favIndex = loadedPlaylists.findIndex((p) => p.id === 'playlist-favorites');
        if (favIndex !== -1) {
          const updatedFav = {
            ...loadedPlaylists[favIndex],
            title: 'Favoris',
            icon: 'heart',
            iconColor: 'rose',
            trackIds: favTrackIds,
          };
          loadedPlaylists[favIndex] = updatedFav;
          await savePlaylist(updatedFav).catch(() => {});
        } else {
          const newFav: Playlist = {
            id: 'playlist-favorites',
            title: 'Favoris',
            description: 'Morceaux ajoutés à vos coups de cœur',
            coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
            icon: 'heart',
            iconColor: 'rose',
            trackIds: favTrackIds,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isSmart: true,
            smartType: 'favorites',
          };
          loadedPlaylists.unshift(newFav);
          await savePlaylist(newFav).catch(() => {});
        }
      }
      setPlaylists(loadedPlaylists);

      const savedSettings = await getSetting<PlayerSettings>('player_settings', DEFAULT_PLAYER_SETTINGS);
      const mergedSettings: PlayerSettings = {
        ...DEFAULT_PLAYER_SETTINGS,
        ...savedSettings,
        acrylicIntensity: savedSettings?.acrylicIntensity ?? DEFAULT_PLAYER_SETTINGS.acrylicIntensity ?? 30,
      };
      setPlayerSettings(mergedSettings);
      audioEngine.setVolumeNormalization(mergedSettings.volumeNormalization, mergedSettings.normalizationTarget ?? 'streaming');

      const savedEq = await getSetting<EqualizerSettings>('equalizer_settings', DEFAULT_EQ_SETTINGS);
      setEqualizerSettings(savedEq);
    } catch (e) {
      console.error('Failed to load database:', e);
      setTracks([]);
      setPlaylists(INITIAL_PLAYLISTS);
    }
  }, []);

  useEffect(() => {
    loadDatabase();
  }, [loadDatabase]);

  // Synchronize document theme attribute, visual effect & native Windows backdrop
  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = playerSettings.theme || 'dark';
    const effect =
      playerSettings.backdropEffect === 'acrylic' || playerSettings.backdropEffect === 'mica'
        ? 'acrylic'
        : (playerSettings.backdropEffect || 'glass');
    root.setAttribute('data-theme', currentTheme);
    root.setAttribute('data-effect', effect);
    root.setAttribute('data-accent', playerSettings.accent || 'emerald');
    if (currentTheme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }

    if (window.electronAPI?.setBackdrop) {
      window.electronAPI.setBackdrop(effect, currentTheme);
    }
  }, [playerSettings.theme, playerSettings.backdropEffect, playerSettings.accent]);

  // Check for app updates in the background after boot
  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const res = await fetch('/api/app/check-update');
        if (res.ok) {
          const data: AppUpdateInfo = await res.json();
          const effectiveCurrentVersion = appVersion || APP_VERSION;
          const isReallyNewer = compareSemVer(data.latestVersion, effectiveCurrentVersion) > 0;
          const normalizedData: AppUpdateInfo = {
            ...data,
            currentVersion: effectiveCurrentVersion,
            hasUpdate: isReallyNewer,
          };
          setAppUpdateInfo(normalizedData);
          if (isReallyNewer) {
            showSystemNotification(
              `Mise à jour FlowLuna disponible (v${data.latestVersion})`,
              {
                body: `Une nouvelle version v${data.latestVersion} de FlowLuna est disponible. Cliquez pour voir les nouveautés et mettre à jour.`,
                icon: '/logo.jpg',
              },
              () => {
                setSettingsInitialTab('system');
                setIsSettingsOpen(true);
              }
            );
          }
        }
      } catch {
        // Non-blocking
      }
    };
    const timer = setTimeout(checkUpdate, 3500);
    const interval = setInterval(checkUpdate, 4 * 60 * 60 * 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [appVersion]);


  // Connect Web Audio API to the dedicated HTMLAudioElement (music tracks only)
  useEffect(() => {
    if (audioRef.current) {
      audioEngine.init(audioRef.current);
      audioEngine.applyEqualizer(equalizerSettings);
      audioEngine.setVolumeNormalization(
        playerSettings.volumeNormalization,
        playerSettings.normalizationTarget ?? 'streaming'
      );
    }
  }, [equalizerSettings, playerSettings.volumeNormalization, playerSettings.normalizationTarget]);

  // Launch automatic background library scanner (discovers local audio tracks without manual import)
  useEffect(() => {
    backgroundScanner.start();
    const unsubscribe = backgroundScanner.subscribe((newOrUpdatedTracks) => {
      setTracks((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        let newCount = 0;
        for (const t of newOrUpdatedTracks) {
          if (!map.has(t.id)) newCount++;
          map.set(t.id, { ...(map.get(t.id) || {}), ...t });
        }
        if (newCount > 0) {
          console.info(`[App] Automatically indexed ${newCount} local audio tracks.`);
        }
        return Array.from(map.values());
      });
    });

    return () => {
      unsubscribe();
      backgroundScanner.stop();
    };
  }, []);

  // Handle track swap and memory management
  const playTrackAt = useCallback(
    async (index: number, newQueue?: Track[], isManualSkip: boolean = true) => {
      const targetQueue = newQueue || queueRef.current;
      if (index < 0 || index >= targetQueue.length) return;

      // Cancel any running crossfade volume animation immediately
      if (crossfadeAnimRef.current !== null) {
        cancelAnimationFrame(crossfadeAnimRef.current);
        crossfadeAnimRef.current = null;
      }

      // Generate sequence request ID to eliminate async race conditions
      const requestId = ++playRequestIdRef.current;
      isTransitioningRef.current = true;

      const previousTrack = queueRef.current[currentTrackIndexRef.current] || null;
      currentTrackIndexRef.current = index;

      const track = targetQueue[index];
      if (previousTrack && previousTrack.id !== track.id) {
        revokeTrackBlobUrl(previousTrack.id);
      }

      if (newQueue) {
        setQueue(newQueue);
        queueRef.current = newQueue;
      }
      setCurrentTrackIndex(index);
      setCurrentTime(0);
      if (track.duration && track.duration > 0) {
        setDuration(track.duration);
      }

      // Optimistic UI update: immediate feedback on play buttons and player bar (0ms perceived latency)
      setIsPlaying(true);
      lastTrackStartTimeRef.current = Date.now();

      const isVideoTrack = !!track.isVideo;
      if (isVideoTrack) {
        setVideoMode('theater');
      }

      // Immediately pause and unbind the inactive media element to guarantee exclusive playback
      if (isVideoTrack) {
        if (audioRef.current) {
          try {
            audioRef.current.pause();
            audioRef.current.removeAttribute('src');
            audioRef.current.load();
          } catch {}
        }
      } else {
        if (videoRef.current) {
          try {
            videoRef.current.pause();
            videoRef.current.removeAttribute('src');
            videoRef.current.load();
          } catch {}
        }
      }

      const activeMedia = isVideoTrack ? videoRef.current : audioRef.current;
      if (!activeMedia) {
        isTransitioningRef.current = false;
        return;
      }

      // Safely pause active media element immediately
      try {
        activeMedia.pause();
      } catch {}

      // Manual skips start immediately at target volume (no 1.2s silence/blank!)
      const targetVolume = isMuted ? 0 : volume;
      if (isManualSkip) {
        activeMedia.volume = targetVolume;
      }

      if (!isVideoTrack) {
        audioEngine.resume(); // resumes audioContext without prematurely playing audioEl
        audioEngine.resetNormalization();
      }

      try {
        const playableUrl = await getTrackPlayableUrl(track);

        // Abort if superseded by another rapid skip
        if (playRequestIdRef.current !== requestId) return;

        if (!playableUrl) {
          console.warn('Playback URL not found for track:', track.title);
          if (playRequestIdRef.current === requestId) {
            setIsPlaying(false);
            isTransitioningRef.current = false;
          }
          return;
        }

        // Direct src assignment begins media load without aborting and re-creating decoder
        activeMedia.src = playableUrl;

        // Check again after src assignment
        if (playRequestIdRef.current !== requestId) return;

        // Crossfade fade-in transition ONLY for automatic track progression of music tracks
        // Strictly disabled for video files and when Gapless (Zéro Blanc) is enabled
        const crossfade = playerSettings.crossfadeDuration ?? 0;
        const shouldCrossfade = !isManualSkip && !isVideoTrack && !playerSettings.gaplessPlayback && crossfade > 0 && !isMuted;

        if (shouldCrossfade) {
          activeMedia.volume = 0;
          const startTime = performance.now();
          const fadeDuration = Math.min(1200, crossfade * 1000);
          const rampUp = (now: number) => {
            if (playRequestIdRef.current !== requestId) return;
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / fadeDuration);
            if (audioRef.current) {
              audioRef.current.volume = volume * progress;
            }
            if (progress < 1) {
              crossfadeAnimRef.current = requestAnimationFrame(rampUp);
            } else {
              crossfadeAnimRef.current = null;
            }
          };
          crossfadeAnimRef.current = requestAnimationFrame(rampUp);
        } else {
          activeMedia.volume = targetVolume;
        }

        const playPromise = activeMedia.play();
        if (playPromise !== undefined) {
          await playPromise;
        }

        if (playRequestIdRef.current !== requestId) return;

        // Update play count asynchronously (only for non-transient library tracks)
        if (!track.isTransient) {
          track.playCount = (track.playCount || 0) + 1;
          saveTrack(track).catch(() => {});
          setTracks((prev) => prev.map((t) => (t.id === track.id ? { ...t, playCount: track.playCount } : t)));
        }

        // Proactive Gapless Pre-buffering: prefetch next track audio in background for music tracks
        if (playerSettings.gaplessPlayback && !isVideoTrack && targetQueue.length > 1) {
          const nextIdx = (index + 1) % targetQueue.length;
          const nextTrack = targetQueue[nextIdx];
          if (nextTrack && !nextTrack.isVideo) {
            getTrackPlayableUrl(nextTrack).catch(() => {});
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' && playRequestIdRef.current !== requestId) {
          // Play request was superseded by a newer track: clean exit without error
          return;
        }
        console.warn('Playback request error:', err);
        if (playRequestIdRef.current === requestId) {
          setIsPlaying(false);
        }
      } finally {
        if (playRequestIdRef.current === requestId) {
          isTransitioningRef.current = false;
        }
      }
    },
    [playerSettings.crossfadeDuration, isMuted, volume, playerSettings.gaplessPlayback]
  );

  // Play next track (handles shuffle and repeat)
  const handleNext = useCallback(
    (isAutoEnded?: boolean | unknown) => {
      const isAuto = isAutoEnded === true;
      const curQueue = queueRef.current;
      if (curQueue.length === 0) return;

      if (repeatMode === 'one' && isAuto) {
        const activeMedia = currentPlayingTrackRef.current?.isVideo ? videoRef.current : audioRef.current;
        if (activeMedia) {
          try {
            activeMedia.currentTime = 0;
            setCurrentTime(0);
            lastTrackStartTimeRef.current = Date.now();
            activeMedia.play().then(() => {
              setIsPlaying(true);
            }).catch(console.warn);
            const curTrack = curQueue[currentTrackIndexRef.current];
            if (curTrack && !curTrack.isTransient) {
              curTrack.playCount = (curTrack.playCount || 0) + 1;
              saveTrack(curTrack).catch(() => {});
            }
          } catch {}
        }
        return;
      }

      let nextIndex: number;
      if (shuffle) {
        if (curQueue.length > 1) {
          let attempts = 0;
          do {
            nextIndex = Math.floor(Math.random() * curQueue.length);
            attempts++;
          } while (nextIndex === currentTrackIndexRef.current && attempts < 10);
        } else {
          nextIndex = 0;
        }
      } else if (currentTrackIndexRef.current < curQueue.length - 1) {
        nextIndex = currentTrackIndexRef.current + 1;
      } else if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }

      currentTrackIndexRef.current = nextIndex;
      playTrackAt(nextIndex, undefined, !isAuto);
    },
    [repeatMode, shuffle, playTrackAt]
  );

  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;

  // Play previous track
  const handlePrev = useCallback(() => {
    const curQueue = queueRef.current;
    if (curQueue.length === 0) return;

    const timeSinceStart = Date.now() - lastTrackStartTimeRef.current;
    const isRapidSkipping = isTransitioningRef.current || timeSinceStart < 1500;
    const activeMedia = currentPlayingTrackRef.current?.isVideo ? videoRef.current : audioRef.current;

    if (!isRapidSkipping && activeMedia) {
      try {
        if (isFinite(activeMedia.currentTime) && activeMedia.currentTime > 3) {
          activeMedia.currentTime = 0;
          setCurrentTime(0);
          return;
        }
      } catch {}
    }

    let prevIndex: number;
    if (currentTrackIndexRef.current > 0) {
      prevIndex = currentTrackIndexRef.current - 1;
    } else if (repeatMode === 'all') {
      prevIndex = curQueue.length - 1;
    } else {
      if (activeMedia) {
        activeMedia.currentTime = 0;
        setCurrentTime(0);
      }
      return;
    }

    currentTrackIndexRef.current = prevIndex;
    playTrackAt(prevIndex, undefined, true);
  }, [repeatMode, playTrackAt]);

  // Toggle play/pause
  const handleTogglePlay = useCallback(() => {
    const activeMedia = currentPlayingTrackRef.current?.isVideo ? videoRef.current : audioRef.current;
    if (!activeMedia) return;

    if (!currentPlayingTrackRef.current?.isVideo) {
      audioEngine.resume();
    }

    if (isPlaying) {
      activeMedia.pause();
      setIsPlaying(false);
    } else {
      if (!currentPlayingTrack) {
        const targetList = queue.length > 0 ? queue : tracks;
        if (targetList.length > 0) {
          playTrackAt(0, targetList, true);
        }
      } else {
        if (!activeMedia.src || activeMedia.src === '' || activeMedia.src === window.location.href) {
          playTrackAt(currentTrackIndex >= 0 ? currentTrackIndex : 0, queue.length > 0 ? queue : tracks, true);
        } else {
          setIsPlaying(true);
          activeMedia.play().catch(() => {
            playTrackAt(currentTrackIndex >= 0 ? currentTrackIndex : 0, queue.length > 0 ? queue : tracks, true);
          });
        }
      }
    }
  }, [isPlaying, currentPlayingTrack, tracks, currentTrackIndex, queue, playTrackAt]);

  // Stop playback completely: unloads active track, resets player state to empty, and frees media streams
  const handleStop = useCallback(() => {
    playRequestIdRef.current++;
    if (crossfadeAnimRef.current !== null) {
      cancelAnimationFrame(crossfadeAnimRef.current);
      crossfadeAnimRef.current = null;
    }
    if (currentPlayingTrack) {
      revokeTrackBlobUrl(currentPlayingTrack.id);
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        if (isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
          audioRef.current.currentTime = 0;
        }
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      } catch (err) {
        console.warn('Error resetting audio element on stop:', err);
      }
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        if (isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
          videoRef.current.currentTime = 0;
        }
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      } catch (err) {
        console.warn('Error resetting video element on stop:', err);
      }
    }
    currentTrackIndexRef.current = -1;
    setCurrentTrackIndex(-1);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [currentPlayingTrack]);

  // Open Detached Always-on-Top / Picture-in-Picture window
  const handleOpenDetachedPip = useCallback(async () => {
    setIsMiniPlayer((prev) => {
      const next = !prev;
      if (next) {
        window.electronAPI?.setCompactMode?.(true, 360, 240);
        setPipNotification('Mode Widget Flottant activé');
      } else {
        window.electronAPI?.setCompactMode?.(false);
      }
      setTimeout(() => setPipNotification(null), 3000);
      return next;
    });
  }, []);

  const handleCloseDetachedPip = useCallback(() => {
    if (detachedPipWindow && !detachedPipWindow.closed) {
      try {
        detachedPipWindow.close();
      } catch {}
    }
    setDetachedPipWindow(null);
  }, [detachedPipWindow]);

  // Seek
  const handleSeek = (newTime: number) => {
    const activeMedia = currentPlayingTrackRef.current?.isVideo ? videoRef.current : audioRef.current;
    if (activeMedia && isFinite(newTime) && newTime >= 0) {
      try {
        const max = isFinite(activeMedia.duration) && activeMedia.duration > 0
          ? activeMedia.duration
          : newTime;
        const target = Math.min(newTime, max);
        activeMedia.currentTime = target;
        setCurrentTime(target);
        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && duration > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: Math.max(0, duration),
              playbackRate: playerSettings.playbackSpeed ?? 1.0,
              position: target,
            });
          } catch {}
        }
      } catch (err) {
        console.warn('Seek error ignored:', err);
      }
    }
  };

  // Volume
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (crossfadeAnimRef.current !== null) {
      cancelAnimationFrame(crossfadeAnimRef.current);
      crossfadeAnimRef.current = null;
    }
    const target = isMuted ? 0 : newVol;
    if (audioRef.current) {
      audioRef.current.volume = target;
    }
    if (videoRef.current) {
      videoRef.current.volume = target;
    }
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      const target = next ? 0 : volume;
      if (audioRef.current) {
        audioRef.current.volume = target;
      }
      if (videoRef.current) {
        videoRef.current.volume = target;
      }
      return next;
    });
  };

  // Toggle Favorite
  const handleToggleFavorite = async (trackId: string) => {
    // Locate track in tracks or queue
    const inTracks = tracks.find((t) => t.id === trackId);
    const inQueue = queue.find((t) => t.id === trackId);
    const base = inTracks || inQueue;
    if (!base) return;

    const nextFav = !base.isFavorite;
    const updatedTrack: Track = { ...base, isFavorite: nextFav };

    // Update tracks state
    setTracks((prev) => {
      const exists = prev.some((t) => t.id === trackId);
      if (exists) {
        return prev.map((t) => (t.id === trackId ? { ...t, isFavorite: nextFav } : t));
      } else {
        return [updatedTrack, ...prev];
      }
    });

    // Update queue state immediately so currently playing track reflects change
    setQueue((prev) => prev.map((t) => (t.id === trackId ? { ...t, isFavorite: nextFav } : t)));

    // Persist to IndexedDB
    await saveTrack(updatedTrack).catch(console.error);

    // Update Favorite Playlist trackIds
    const favPlaylist = playlists.find((p) => p.id === 'playlist-favorites');
    if (favPlaylist) {
      const nextTrackIds = nextFav
        ? [...new Set([...favPlaylist.trackIds, trackId])]
        : favPlaylist.trackIds.filter((id) => id !== trackId);

      const updatedFavPl = { ...favPlaylist, trackIds: nextTrackIds, updatedAt: Date.now() };
      await savePlaylist(updatedFavPl).catch(console.error);
      setPlaylists((prev) => prev.map((p) => (p.id === 'playlist-favorites' ? updatedFavPl : p)));
    }
  };

  // Add track to a playlist
  const handleAddToPlaylist = async (playlistId: string, trackId: string) => {
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    if (!pl.trackIds.includes(trackId)) {
      const updated = { ...pl, trackIds: [...pl.trackIds, trackId], updatedAt: Date.now() };
      await savePlaylist(updated);
      setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updated : p)));
    }
  };

  // Remove track from a playlist
  const handleRemoveTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    const updated = { ...pl, trackIds: pl.trackIds.filter((id) => id !== trackId), updatedAt: Date.now() };
    await savePlaylist(updated);
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updated : p)));
  };

  // Create playlist from modal
  const handleSaveNewPlaylist = async (
    title: string,
    description?: string,
    coverUrl?: string,
    icon?: string,
    iconColor?: string,
    isPinned: boolean = true
  ) => {
    const newPl: Playlist = {
      id: `playlist-${Date.now()}`,
      title: title.trim(),
      description: description?.trim() || 'Playlist personnalisée pour PC',
      coverUrl: coverUrl || '',
      icon: icon || 'music',
      iconColor: iconColor || 'emerald',
      isPinned: isPinned,
      trackIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isSmart: false,
    };

    await savePlaylist(newPl);
    setPlaylists((prev) => [...prev, newPl]);
    setCurrentView(`playlist-${newPl.id}`);
    setActivePlaylistId(newPl.id);
  };

  // Toggle single playlist pin status
  const handleTogglePinPlaylist = async (playlistId: string, isPinned: boolean) => {
    const target = playlists.find((p) => p.id === playlistId);
    if (!target) return;
    const updated = { ...target, isPinned, updatedAt: Date.now() };
    await savePlaylist(updated);
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updated : p)));
  };

  // Bulk update pin statuses (e.g. from ManageSidebarPlaylistsModal)
  const handleBulkUpdatePins = async (pinnedMap: Record<string, boolean>) => {
    const updatedList: Playlist[] = [];
    for (const pl of playlists) {
      if (pl.id in pinnedMap) {
        const updated = { ...pl, isPinned: pinnedMap[pl.id], updatedAt: Date.now() };
        await savePlaylist(updated);
        updatedList.push(updated);
      } else {
        updatedList.push(pl);
      }
    }
    setPlaylists(updatedList);
  };

  // Update whole playlist metadata (icon, color, cover, title, description, isPinned)
  const handleUpdatePlaylist = async (updatedPl: Playlist) => {
    const final = { ...updatedPl, updatedAt: Date.now() };
    await savePlaylist(final);
    setPlaylists((prev) => prev.map((p) => (p.id === final.id ? final : p)));
  };

  // Delete playlist
  const handleDeletePlaylist = async (playlistId: string) => {
    await dbDeletePlaylist(playlistId);
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    setCurrentView('library');
    setActivePlaylistId(null);
  };

  // Update playlist title
  const handleUpdatePlaylistTitle = async (playlistId: string, newTitle: string) => {
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    const updated = { ...pl, title: newTitle, updatedAt: Date.now() };
    await savePlaylist(updated);
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updated : p)));
  };

  // Add track to queue
  const handleAddToQueue = (track: Track) => {
    setQueue((prev) => [...prev, track]);
  };

  // Delete multiple tracks or single track with complete cleanup
  const handleDeleteTracks = async (trackIds: string[]) => {
    if (!trackIds || trackIds.length === 0) return;
    const idSet = new Set(trackIds);

    // Stop playback if current playing track is being deleted
    if (currentPlayingTrack && idSet.has(currentPlayingTrack.id)) {
      handleStop();
    }

    // Delete each track from IndexedDB (both metadata and audio blob)
    for (const id of trackIds) {
      try {
        await dbDeleteTrack(id);
      } catch (err) {
        console.warn('Failed to delete track from storage:', id, err);
      }
    }

    // Update state for tracks and queue
    setTracks((prev) => prev.filter((t) => !idSet.has(t.id)));
    setQueue((prev) => prev.filter((t) => !idSet.has(t.id)));

    // Clean up playlists removing references to deleted tracks
    setPlaylists((prev) => {
      const updated = prev.map((pl) => ({
        ...pl,
        trackIds: pl.trackIds.filter((id) => !idSet.has(id)),
      }));
      updated.forEach((pl) => {
        savePlaylist(pl).catch(() => {});
      });
      return updated;
    });
  };

  const handleDeleteTrack = async (trackId: string) => {
    await handleDeleteTracks([trackId]);
  };

  // Track Trimmer Handlers
  const handleOpenTrimmer = (track: Track) => {
    setTrimmerTrack(track);
  };

  const handleTrackCreated = async (newTrack: Track) => {
    setTracks((prev) => [newTrack, ...prev]);
  };

  const handleTrackUpdated = async (updatedTrack: Track) => {
    setTracks((prev) => prev.map((t) => (t.id === updatedTrack.id ? updatedTrack : t)));
    setQueue((prev) => prev.map((t) => (t.id === updatedTrack.id ? updatedTrack : t)));
  };

  // Tag Editor Handler
  const handleSaveTrackTags = async (updatedTrack: Track) => {
    await saveTrack(updatedTrack);
    setTracks((prev) => prev.map((t) => (t.id === updatedTrack.id ? updatedTrack : t)));
    setQueue((prev) => prev.map((t) => (t.id === updatedTrack.id ? updatedTrack : t)));
  };

  // Track created from Audio Merger
  const handleTrackCreatedFromMerger = async (newTrack: Track) => {
    setTracks((prev) => [newTrack, ...prev]);
  };

  // Batch resolve mixed inputs (File[], FileList, Track[], or files with .path) into Track[]
  const resolveFilesToTracks = useCallback(async (files: FileList | File[] | Track[]): Promise<Track[]> => {
    const fileList = Array.isArray(files) ? files : Array.from(files);
    if (fileList.length === 0) return [];

    const resolvedTracks: Track[] = [];
    const nativeFilePaths: string[] = [];
    const nonNativeFiles: File[] = [];

    for (const item of fileList) {
      if ('url' in item && 'format' in item && 'id' in item) {
        resolvedTracks.push(item as Track);
      } else {
        const file = item as File;
        const filePath = (file as any).path || (file as any).webkitRelativePath;
        if (typeof filePath === 'string' && (filePath.includes(':\\') || filePath.startsWith('\\\\') || filePath.startsWith('/'))) {
          nativeFilePaths.push(filePath);
        } else {
          nonNativeFiles.push(file);
        }
      }
    }

    if (nativeFilePaths.length > 0) {
      try {
        const resp = await fetch('/api/library/add-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePaths: nativeFilePaths }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.success && Array.isArray(data.tracks) && data.tracks.length > 0) {
            resolvedTracks.push(...data.tracks);
          }
        }
      } catch (err) {
        console.warn('API /api/library/add-files batch error:', err);
      }
    }

    if (nonNativeFiles.length > 0) {
      for (const f of nonNativeFiles) {
        try {
          const t = await processLocalAudioFile(f);
          resolvedTracks.push(t);
        } catch (err) {
          console.warn('File processing error for non-native file:', err);
        }
      }
    }

    return resolvedTracks;
  }, []);

  // Atomically apply newly imported files or playlist batch (Screenbox model: item 0 starts, rest populated in queue)
  const applyImportedTracks = useCallback(
    (imported: Track[], autoPlay: boolean = true) => {
      if (!imported || imported.length === 0) return;

      // Ensure all imported tracks are saved/updated in library
      setTracks((prev) => {
        const existingMap = new Map(prev.map((t) => [t.id, t]));
        for (const t of imported) {
          existingMap.set(t.id, t);
        }
        return Array.from(existingMap.values());
      });

      // Construct queue: place imported tracks first, keep remaining deduplicated old tracks
      const incomingIds = new Set(imported.map((t) => t.id));
      const curQueue = queueRef.current;
      const remainingOldQueue = curQueue.filter((t) => !incomingIds.has(t.id));
      const newQueue = [...imported, ...remainingOldQueue];

      // Synchronously update both ref and React state
      setQueue(newQueue);
      queueRef.current = newQueue;

      if (autoPlay) {
        currentTrackIndexRef.current = 0;
        setCurrentTrackIndex(0);
        playTrackAt(0, newQueue, true);
        if (imported[0]?.isVideo) {
          setVideoMode('theater');
        }
      }
    },
    [playTrackAt]
  );

  // Atomically append multiple tracks to the existing queue
  const handleAddTracksToQueue = useCallback(
    (tracksToAdd: Track[]) => {
      if (!tracksToAdd || tracksToAdd.length === 0) return;

      setTracks((prev) => {
        const existingMap = new Map(prev.map((t) => [t.id, t]));
        for (const t of tracksToAdd) {
          if (!existingMap.has(t.id)) {
            existingMap.set(t.id, t);
          }
        }
        return Array.from(existingMap.values());
      });

      const curQueue = queueRef.current;
      const existingQueueIds = new Set(curQueue.map((t) => t.id));
      const newTracks = tracksToAdd.filter((t) => !existingQueueIds.has(t.id));
      const newQueue = [...curQueue, ...newTracks];

      setQueue(newQueue);
      queueRef.current = newQueue;

      if (currentTrackIndexRef.current === -1 && curQueue.length === 0 && newQueue.length > 0) {
        currentTrackIndexRef.current = 0;
        setCurrentTrackIndex(0);
        playTrackAt(0, newQueue, true);
        if (newQueue[0]?.isVideo) {
          setVideoMode('theater');
        }
      }
    },
    [playTrackAt]
  );

  // Play a batch of tracks starting from a specified index (Screenbox Selection playback)
  const handlePlayTracksBatch = useCallback(
    (batchTracks: Track[], startIndex: number = 0) => {
      if (!batchTracks || batchTracks.length === 0) return;

      setTracks((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        for (const t of batchTracks) {
          map.set(t.id, t);
        }
        return Array.from(map.values());
      });

      const batchIds = new Set(batchTracks.map((t) => t.id));
      const curQueue = queueRef.current;
      const remainingOldQueue = curQueue.filter((t) => !batchIds.has(t.id));
      const newQueue = [...batchTracks, ...remainingOldQueue];

      setQueue(newQueue);
      queueRef.current = newQueue;

      const targetIdx = Math.max(0, Math.min(startIndex, batchTracks.length - 1));
      currentTrackIndexRef.current = targetIdx;
      setCurrentTrackIndex(targetIdx);
      playTrackAt(targetIdx, newQueue, true);

      if (batchTracks[targetIdx]?.isVideo) {
        setVideoMode('theater');
      }
    },
    [playTrackAt]
  );

  // Open local files or folders (Screenbox batch mode)
  const handleImportFiles = useCallback(
    async (files: FileList | File[] | Track[]) => {
      const imported = await resolveFilesToTracks(files);
      if (imported.length > 0) {
        applyImportedTracks(imported, true);
      }
    },
    [resolveFilesToTracks, applyImportedTracks]
  );

  // Add media (videos or songs) to the queue from the QueueDrawer '+' button
  const handleAddMediaToQueue = useCallback(
    async (files: FileList | File[] | Track[]) => {
      const imported = await resolveFilesToTracks(files);
      if (imported.length > 0) {
        handleAddTracksToQueue(imported);
      }
    },
    [resolveFilesToTracks, handleAddTracksToQueue]
  );

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette (Ctrl+K or Cmd+K) works anywhere
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Ignore standard media keys when inside inputs or textareas
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // When in theater mode, let VideoPlayer handle shortcuts (arrows, space, mute, esc, etc.)
      if (videoMode === 'theater') {
        return;
      }

      if (e.code === 'Space' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const activeMedia = currentPlayingTrackRef.current?.isVideo ? videoRef.current : audioRef.current;
        if (activeMedia) {
          handleSeek(Math.max(0, activeMedia.currentTime - 5));
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const activeMedia = currentPlayingTrackRef.current?.isVideo ? videoRef.current : audioRef.current;
        if (activeMedia) {
          handleSeek(Math.min(duration, activeMedia.currentTime + 5));
        }
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        handleVolumeChange(Math.min(1, volume + 0.05));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleVolumeChange(Math.max(0, volume - 0.05));
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      } else if (e.key === 'l' || e.key === 'L') {
        if (currentPlayingTrack) {
          handleToggleFavorite(currentPlayingTrack.id);
        }
      } else if (e.key === 'n' || e.key === 'N') {
        handleNext();
      } else if (e.key === 'p' || e.key === 'P') {
        handlePrev();
      } else if (e.key === 'x' || e.key === 'X') {
        handleStop();
      } else if (e.key === 's' || e.key === 'S') {
        setShuffle((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
      } else if (e.key === 'f' || e.key === 'F') {
        if (currentPlayingTrack?.isVideo) {
          e.preventDefault();
          setVideoMode('theater');
          const container = document.getElementById('flowluna-video-container');
          if (!document.fullscreenElement) {
            container?.requestFullscreen?.().catch(() => {});
          } else {
            document.exitFullscreen?.().catch(() => {});
          }
        } else {
          setIsFullscreenOpen((prev) => !prev);
        }
      } else if (e.key === 'e' || e.key === 'E') {
        setIsEqualizerOpen((prev) => !prev);
      } else if (e.key === 'q' || e.key === 'Q') {
        setIsQueueOpen((prev) => !prev);
      } else if (e.key === 'w' || e.key === 'W') {
        setIsMiniPlayer((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleStop, handleSeek, duration, volume, handleToggleMute, currentPlayingTrack, handleNext, handlePrev, videoMode]);

  // Electron Tray Sync
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.updateTrayTrack({
        title: currentPlayingTrack?.title || 'Aucune lecture',
        artist: currentPlayingTrack?.artist || 'FlowLuna',
        isPlaying,
      });
    }
  }, [currentPlayingTrack, isPlaying]);

  // Electron Global Media Controls & Systray Events
  useEffect(() => {
    if (!window.electronAPI) return;
    const unsubscribe = window.electronAPI.onMediaControl((action) => {
      if (action === 'play-pause') {
        handleTogglePlay();
      } else if (action === 'next') {
        handleNext();
      } else if (action === 'prev') {
        handlePrev();
      } else if (action === 'stop') {
        handleStop();
      }
    });
    return () => {
      unsubscribe?.();
    };
  }, [handleTogglePlay, handleNext, handlePrev, handleStop]);

  const lastExternalOpenTimeRef = useRef<number>(0);

  // Dedicated handler for files opened on the fly from Windows Explorer
  const handleOpenExternalFiles = useCallback(
    (incomingTracks: Track[]) => {
      if (!incomingTracks || incomingTracks.length === 0) return;

      const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
      const getFileName = (p: string) => {
        if (!p) return '';
        const clean = p.replace(/\\/g, '/');
        const lastSlash = clean.lastIndexOf('/');
        return lastSlash >= 0 ? clean.substring(lastSlash + 1) : clean;
      };

      const sortTracksPreservingActive = (trackList: Track[], activeId: string): Track[] => {
        if (!Array.isArray(trackList) || trackList.length <= 1) return trackList;
        const activeTrack = trackList.find((t) => t.id === activeId);
        if (!activeTrack) return trackList;

        const sorted = [...trackList].sort((a, b) => {
          const nameA = a.title || getFileName(a.url);
          const nameB = b.title || getFileName(b.url);
          return naturalCollator.compare(nameA, nameB);
        });

        const sortedIdx = sorted.findIndex((t) => t.id === activeId);
        if (sortedIdx === -1) return trackList;

        return [activeTrack, ...sorted.slice(sortedIdx + 1), ...sorted.slice(0, sortedIdx)];
      };

      const now = Date.now();
      const isSubsequentBurst = now - lastExternalOpenTimeRef.current < 2500;
      lastExternalOpenTimeRef.current = now;

      // Mark tracks as ephemeral/transient (no persistent DB or disk cache)
      const transientTracks: Track[] = incomingTracks.map((t) => ({
        ...t,
        isTransient: true,
        source: 'ephemeral',
        isCachedOffline: false,
      }));

      const curQueue = queueRef.current;
      const curIndex = currentTrackIndexRef.current;
      const isCurrentlyPlaying = curIndex >= 0 && curIndex < curQueue.length;
      const currentlyPlayingTrack = isCurrentlyPlaying ? curQueue[curIndex] : null;

      if (isSubsequentBurst && currentlyPlayingTrack) {
        // Subsequent secondary process from the same explorer multi-select launch:
        // Merge seamlessly with existing queue, preserving current playing track at its head,
        // and arranging the rest in logical order!
        const existingIds = new Set(curQueue.map((t) => t.id));
        const newToAdd = transientTracks.filter((t) => !existingIds.has(t.id));
        if (newToAdd.length > 0) {
          const combined = [...curQueue, ...newToAdd];
          const reorderedQueue = sortTracksPreservingActive(combined, currentlyPlayingTrack.id);
          const newCurrentIndex = reorderedQueue.findIndex((t) => t.id === currentlyPlayingTrack.id);

          setQueue(reorderedQueue);
          queueRef.current = reorderedQueue;
          if (newCurrentIndex >= 0) {
            currentTrackIndexRef.current = newCurrentIndex;
            setCurrentTrackIndex(newCurrentIndex);
          }
        }
      } else {
        // Initial launch or fresh explorer multi-file opening:
        // The first track (clicked by user in Explorer) is placed at index 0 and played immediately!
        // The remaining files are arranged in logical natural sequence directly behind it.
        const firstTrack = transientTracks[0];
        const orderedTracks = sortTracksPreservingActive(transientTracks, firstTrack.id);

        const incomingIds = new Set(orderedTracks.map((t) => t.id));
        const remainingOldQueue = curQueue.filter((t) => !incomingIds.has(t.id));
        const newQueue = [...orderedTracks, ...remainingOldQueue];

        setQueue(newQueue);
        queueRef.current = newQueue;

        currentTrackIndexRef.current = 0;
        setCurrentTrackIndex(0);
        playTrackAt(0, newQueue, true);
        if (orderedTracks[0]?.isVideo) {
          setVideoMode('theater');
        }
      }
    },
    [playTrackAt]
  );


  // Listen for files opened directly from Windows (double-click or Open With)
  useEffect(() => {
    if (!window.electronAPI) return;

    let isMounted = true;
    let lastHandledKey = '';
    let lastHandledTimestamp = 0;

    const processIncomingFiles = async (filePaths: string[]) => {
      if (!Array.isArray(filePaths) || filePaths.length === 0) return;

      const validFiles = filePaths.filter((fp) => typeof fp === 'string' && fp.trim().length > 0);
      if (validFiles.length === 0) return;

      // Prevent processing duplicate bursts within 1.5s (e.g. from both push and pull)
      const currentKey = [...validFiles].sort().join('|');
      const now = Date.now();
      if (currentKey === lastHandledKey && now - lastHandledTimestamp < 1500) {
        return;
      }
      lastHandledKey = currentKey;
      lastHandledTimestamp = now;

      try {
        const resp = await fetch('/api/library/add-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePaths: validFiles, isTransient: true }),
        });
        if (resp.ok && isMounted) {
          const data = await resp.json();
          if (data.success && Array.isArray(data.tracks) && data.tracks.length > 0) {
            handleOpenExternalFiles(data.tracks);
            window.electronAPI?.ackOpenFiles?.(validFiles);
          }
        }
      } catch (err) {
        console.warn('Failed to open incoming files from Windows:', err);
      }
    };

    // 1. Subscribe to real-time events from main process (e.g. second-instance)
    const unsubscribe = window.electronAPI.onOpenFiles?.(processIncomingFiles);

    // 2. Proactively fetch any pending startup files queued before React mounted
    if (window.electronAPI.getPendingOpenFiles) {
      window.electronAPI
        .getPendingOpenFiles()
        .then((pending) => {
          if (isMounted && Array.isArray(pending) && pending.length > 0) {
            processIncomingFiles(pending);
          }
        })
        .catch((err) => console.warn('Failed to fetch pending open files:', err));
    }

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [handleOpenExternalFiles]);

  // Media element listeners for both Audio and Video players
  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;

    const createListeners = (isForVideo: boolean) => {
      const getTarget = () => (isForVideo ? videoRef.current : audioRef.current);

      const handleTimeUpdate = () => {
        const curTrack = currentPlayingTrackRef.current;
        const isCurrentVideo = !!curTrack?.isVideo;
        if (isForVideo !== isCurrentVideo) return;

        const target = getTarget();
        if (!target) return;

        setCurrentTime(target.currentTime);

        const settings = playerSettingsRef.current;
        const curMuted = isMutedRef.current;
        const curVol = volumeRef.current;

        const crossfade = settings.crossfadeDuration ?? 0;
        const isCrossfadeActive = !isCurrentVideo && !settings.gaplessPlayback && crossfade > 0;
        const d = target.duration;

        if (isCrossfadeActive && d && d > 6 && !curMuted && crossfadeAnimRef.current === null) {
          const remaining = d - target.currentTime;
          if (remaining <= crossfade && remaining > 0) {
            const fadeRatio = Math.max(0.02, remaining / crossfade);
            target.volume = Math.max(0, Math.min(1, curVol * fadeRatio));
          } else if (target.currentTime > crossfade + 0.5 && Math.abs(target.volume - curVol) > 0.05) {
            target.volume = curVol;
          }
        } else if (!isCrossfadeActive && !curMuted && crossfadeAnimRef.current === null && Math.abs(target.volume - curVol) > 0.05) {
          target.volume = curVol;
        }
      };

      const handleLoadedMetadata = () => {
        const curTrack = currentPlayingTrackRef.current;
        const isCurrentVideo = !!curTrack?.isVideo;
        if (isForVideo !== isCurrentVideo) return;

        const target = getTarget();
        if (!target) return;

        const d = target.duration;
        if (d && !isNaN(d) && isFinite(d) && d > 0) {
          const rounded = Math.round(d);
          setDuration(rounded);

          if (curTrack && curTrack.duration !== rounded) {
            const updated = { ...curTrack, duration: rounded };
            setQueue((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            setTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            if (!curTrack.isTransient) {
              saveTrack(updated).catch(() => {});
            }
          }
        }
      };

      const handleEnded = () => {
        const curTrack = currentPlayingTrackRef.current;
        const isCurrentVideo = !!curTrack?.isVideo;
        if (isForVideo !== isCurrentVideo) return;

        handleNextRef.current(true);
      };

      return { handleTimeUpdate, handleLoadedMetadata, handleEnded };
    };

    const audioHandlers = createListeners(false);
    const videoHandlers = createListeners(true);

    if (audio) {
      audio.addEventListener('timeupdate', audioHandlers.handleTimeUpdate);
      audio.addEventListener('loadedmetadata', audioHandlers.handleLoadedMetadata);
      audio.addEventListener('durationchange', audioHandlers.handleLoadedMetadata);
      audio.addEventListener('ended', audioHandlers.handleEnded);
    }

    if (video) {
      video.addEventListener('timeupdate', videoHandlers.handleTimeUpdate);
      video.addEventListener('loadedmetadata', videoHandlers.handleLoadedMetadata);
      video.addEventListener('durationchange', videoHandlers.handleLoadedMetadata);
      video.addEventListener('ended', videoHandlers.handleEnded);
    }

    return () => {
      if (audio) {
        audio.removeEventListener('timeupdate', audioHandlers.handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', audioHandlers.handleLoadedMetadata);
        audio.removeEventListener('durationchange', audioHandlers.handleLoadedMetadata);
        audio.removeEventListener('ended', audioHandlers.handleEnded);
      }
      if (video) {
        video.removeEventListener('timeupdate', videoHandlers.handleTimeUpdate);
        video.removeEventListener('loadedmetadata', videoHandlers.handleLoadedMetadata);
        video.removeEventListener('durationchange', videoHandlers.handleLoadedMetadata);
        video.removeEventListener('ended', videoHandlers.handleEnded);
      }
    };
  }, []);

  // Windows SMTC (System Media Transport Controls) API: Metadata & PlaybackState (no currentTime spam)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentPlayingTrack && (playerSettings.smtcEnabled ?? true)) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentPlayingTrack.title,
        artist: currentPlayingTrack.artist,
        album: currentPlayingTrack.album || 'FlowLuna',
        artwork: currentPlayingTrack.coverUrl
          ? [
              { src: currentPlayingTrack.coverUrl, sizes: '512x512', type: 'image/png' },
              { src: currentPlayingTrack.coverUrl, sizes: '256x256', type: 'image/jpeg' },
            ]
          : [],
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      if ('setPositionState' in navigator.mediaSession && duration > 0) {
        try {
          const activeMedia = currentPlayingTrackRef.current?.isVideo ? videoRef.current : audioRef.current;
          navigator.mediaSession.setPositionState({
            duration: Math.max(0, duration),
            playbackRate: playerSettings.playbackSpeed ?? 1.0,
            position: Math.min(Math.max(0, activeMedia?.currentTime || 0), duration),
          });
        } catch {}
      }
    } else {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
  }, [
    currentPlayingTrack?.id,
    currentPlayingTrack?.title,
    currentPlayingTrack?.artist,
    currentPlayingTrack?.album,
    currentPlayingTrack?.coverUrl,
    isPlaying,
    duration,
    playerSettings.smtcEnabled,
    playerSettings.playbackSpeed,
  ]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        if (!isPlaying) handleTogglePlay();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (isPlaying) handleTogglePlay();
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        handleStop();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handlePrev();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleNext();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          handleSeek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        const activeMedia = currentPlayingTrackRef.current?.isVideo ? videoRef.current : audioRef.current;
        if (activeMedia) {
          handleSeek(Math.max(0, activeMedia.currentTime - offset));
        }
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        const activeMedia = currentPlayingTrackRef.current?.isVideo ? videoRef.current : audioRef.current;
        if (activeMedia) {
          handleSeek(Math.min(activeMedia.duration || 0, activeMedia.currentTime + offset));
        }
      });
    } catch (err) {
      console.warn('Error setting MediaSession handlers:', err);
    }
  }, [isPlaying, handleTogglePlay, handleStop, handlePrev, handleNext, handleSeek]);

  // Discord Rich Presence (RPC) Synchronizer
  useEffect(() => {
    discordRpc.updatePresence(
      currentPlayingTrack,
      isPlaying,
      currentTime,
      playerSettings.discordRpcEnabled ?? true
    );
  }, [currentPlayingTrack, isPlaying, playerSettings.discordRpcEnabled]);

  // Navigation handler
  const handleNavigate = (view: string, playlistId?: string) => {
    if (view === 'playlist' && playlistId) {
      setCurrentView(`playlist-${playlistId}`);
      setActivePlaylistId(playlistId);
    } else {
      setCurrentView(view);
      setActivePlaylistId(null);
    }
  };

  // Play All in playlist or library
  const handlePlayAllInPlaylist = (playlistTracks: Track[], shuffleTracks: boolean) => {
    if (playlistTracks.length === 0) return;
    audioEngine.resume();
    if (shuffleTracks) {
      setShuffle(true);
    }
    const finalQueue = shuffleTracks
      ? [...playlistTracks].sort(() => Math.random() - 0.5)
      : [...playlistTracks];
    playTrackAt(0, finalQueue, true);
  };

  // Save updated settings
  const handleUpdatePlayerSettings = async (settings: PlayerSettings) => {
    setPlayerSettings(settings);
    audioEngine.setVolumeNormalization(settings.volumeNormalization, settings.normalizationTarget ?? 'streaming');
    discordRpc.updatePresence(currentPlayingTrack, isPlaying, currentTime, settings.discordRpcEnabled ?? true);
    await saveSetting('player_settings', settings);
  };

  const handleUpdateEqualizerSettings = async (settings: EqualizerSettings) => {
    setEqualizerSettings(settings);
    audioEngine.applyEqualizer(settings);
    await saveSetting('equalizer_settings', settings);
  };

  // Render current view
  const renderMainContent = () => {
    if (currentView.startsWith('playlist-')) {
      const plId = activePlaylistId || currentView.replace('playlist-', '');
      const playlist = playlists.find((p) => p.id === plId);
      if (playlist) {
        let playlistTracks: Track[] = [];
        if (playlist.smartType === 'favorites' || playlist.id === 'playlist-favorites') {
          playlistTracks = tracks.filter((t) => t.isFavorite);
        } else if (playlist.smartType === 'offline') {
          playlistTracks = tracks.filter((t) => t.isCachedOffline);
        } else if (playlist.smartType === 'youtube') {
          playlistTracks = tracks.filter((t) => t.source === 'youtube');
        } else {
          playlistTracks = playlist.trackIds
            .map((tid) => tracks.find((t) => t.id === tid))
            .filter((t): t is Track => !!t);
        }

        return (
          <PlaylistView
            playlist={playlist}
            tracks={playlistTracks}
            onPlayTrack={(track, list) => {
              const q = list || playlistTracks;
              const idx = q.findIndex((t) => t.id === track.id);
              playTrackAt(idx !== -1 ? idx : 0, q);
            }}
            onPlayAll={handlePlayAllInPlaylist}
            onToggleFavorite={handleToggleFavorite}
            onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            onUpdatePlaylistTitle={handleUpdatePlaylistTitle}
            onUpdatePlaylist={handleUpdatePlaylist}
            accent={playerSettings.accent}
            allTracks={tracks}
            currentTrackId={currentPlayingTrack?.id || null}
            isPlaying={isPlaying}
            onOpenTrimmer={handleOpenTrimmer}
            onAddToQueue={handleAddToQueue}
            onEditTrackTags={(track) => setTagEditorTrack(track)}
            playlists={playlists.filter((p) => p.id !== 'playlist-offline' && p.id !== 'playlist-youtube')}
            onAddToPlaylist={handleAddToPlaylist}
            onCreatePlaylist={handleSaveNewPlaylist}
            settings={playerSettings}
          />
        );
      }
    }

    if (currentView === 'playlists' || currentView === 'playlists-overview') {
      return (
        <AllPlaylistsView
          playlists={playlists}
          tracks={tracks}
          onNavigate={handleNavigate}
          onCreatePlaylist={() => setIsCreatePlaylistModalOpen(true)}
          onPlayPlaylist={(plId) => {
            const pl = playlists.find((p) => p.id === plId);
            if (!pl) return;
            let plTracks: Track[] = [];
            if (pl.id === 'playlist-favorites') {
              plTracks = tracks.filter((t) => t.isFavorite);
            } else if (pl.id === 'playlist-offline') {
              plTracks = tracks.filter((t) => t.isCachedOffline);
            } else {
              const set = new Set(pl.trackIds);
              plTracks = tracks.filter((t) => set.has(t.id));
            }
            if (plTracks.length > 0) {
              playTrackAt(0, plTracks);
            }
          }}
          onDeletePlaylist={handleDeletePlaylist}
          onUpdatePlaylist={handleUpdatePlaylist}
          onTogglePinPlaylist={handleTogglePinPlaylist}
          onBulkUpdatePins={handleBulkUpdatePins}
          onOpenManageSidebar={() => setIsManageSidebarOpen(true)}
          accent={playerSettings.accent}
          settings={playerSettings}
        />
      );
    }

    if (currentView === 'videos') {
      return (
        <VideosView
          tracks={tracks}
          currentTrackId={currentPlayingTrack?.id}
          isPlaying={isPlaying}
          onPlayTrack={(track, list) => {
            const q = list || tracks;
            const idx = q.findIndex((t) => t.id === track.id);
            setVideoMode('theater');
            setIsPlaying(true);
            playTrackAt(idx !== -1 ? idx : 0, q);
          }}
          onPlayTracksBatch={handlePlayTracksBatch}
          onAddTracksToQueue={handleAddTracksToQueue}
          onOpenVideoTheater={() => {
            setVideoMode('theater');
            setIsPlaying(true);
            if (videoRef.current?.paused) {
              videoRef.current.play().catch(console.warn);
            }
          }}
          onImportFiles={handleImportFiles}
          onDeleteTrack={(track) => handleDeleteTrack(track.id)}
          onDeleteTracks={handleDeleteTracks}
          onOpenTrimmer={handleOpenTrimmer}
          accent={playerSettings.accent}
          settings={playerSettings}
        />
      );
    }

    if (currentView === 'downloader') {
      return (
        <DownloaderView
          accent={playerSettings.accent}
          settings={playerSettings}
          onTrackImported={async (newTrack) => {
            await saveTrack(newTrack);
            setTracks((prev) => [newTrack, ...prev.filter((t) => t.id !== newTrack.id)]);
          }}
          onPlayTrack={(track) => {
            saveTrack(track);
            const updatedQueue = [track, ...queue.filter((t) => t.id !== track.id)];
            setTracks((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
            setQueue(updatedQueue);
            queueRef.current = updatedQueue;
            setCurrentTrackIndex(0);
            currentTrackIndexRef.current = 0;
            if (track.isVideo) {
              setVideoMode('theater');
            }
            playTrackAt(0, updatedQueue);
          }}
        />
      );
    }

    // Default: Library View (music tracks only)
    const musicTracks = tracks.filter((t) => !t.isVideo);
    return (
      <LibraryView
        tracks={musicTracks}
        playlists={playlists.filter((p) => p.id !== 'playlist-offline' && p.id !== 'playlist-youtube')}
        onPlayTrack={(track, list) => {
          const q = list || musicTracks;
          const idx = q.findIndex((t) => t.id === track.id);
          playTrackAt(idx !== -1 ? idx : 0, q);
        }}
        onPlayAll={handlePlayAllInPlaylist}
        onPlayTracksBatch={handlePlayTracksBatch}
        onToggleFavorite={handleToggleFavorite}
        onAddToPlaylist={handleAddToPlaylist}
        onRemoveFromPlaylist={handleRemoveTrackFromPlaylist}
        onCreatePlaylist={handleSaveNewPlaylist}
        onAddToQueue={handleAddToQueue}
        onAddTracksToQueue={handleAddTracksToQueue}
        onDeleteTrack={handleDeleteTrack}
        onDeleteTracks={handleDeleteTracks}
        onImportFiles={handleImportFiles}
        accent={playerSettings.accent}
        initialSearchFocus={currentView === 'search'}
        currentTrackId={currentPlayingTrack?.id || null}
        isPlaying={isPlaying}
        onOpenTrimmer={handleOpenTrimmer}
        onEditTrackTags={(track) => setTagEditorTrack(track)}
        onOpenDeduplicator={() => setIsDeduplicatorOpen(true)}
        onOpenMerger={() => setIsMergerOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        settings={playerSettings}
      />
    );
  };

  const cachedTracksCount = tracks.filter((t) => t.isCachedOffline).length;

  const isAcrylic = playerSettings.backdropEffect === 'acrylic' || playerSettings.backdropEffect === 'mica';
  const backdropEffect: BackdropEffect = isAcrylic ? 'acrylic' : (playerSettings.backdropEffect || 'glass');
  const glassIntensity = playerSettings.glassIntensity ?? 70;
  const acrylicIntensity = playerSettings.acrylicIntensity ?? 30;
  const glassFactor = glassIntensity / 100;
  const acrylicFactor = acrylicIntensity / 30; // At 30%, exactly 1.0 (maintains existing baseline)
  const blurScale = Math.sqrt(Math.max(0.1, acrylicIntensity / 30));
  const isDark = playerSettings.theme !== 'light';

  // Dynamic CSS variables for Pure Glass vs Desktop Acrylic Fluent effect
  const glassStyle = useMemo(() => {
    const activeAccent = playerSettings.accent || 'emerald';
    const lightAccentTokens: Record<AccentColor, { primary: string; hover: string }> = {
      emerald: { primary: '#059669', hover: '#047857' },
      violet: { primary: '#7c3aed', hover: '#6d28d9' },
      blue: { primary: '#2563eb', hover: '#1d4ed8' },
      amber: { primary: '#d97706', hover: '#b45309' },
      rose: { primary: '#e11d48', hover: '#be123c' },
      cyan: { primary: '#0891b2', hover: '#0e7490' },
    };
    const activeLightAccent = lightAccentTokens[activeAccent] || lightAccentTokens.emerald;

    const lightTokens = !isDark
      ? {
          '--bg-app': '#f8fafc',
          '--bg-surface': '#ffffff',
          '--bg-surface-hover': '#f1f5f9',
          '--border-subtle': '#e2e8f0',
          '--border-strong': '#cbd5e1',
          '--text-primary': '#0f172a',
          '--text-secondary': '#475569',
          '--text-muted': '#94a3b8',
          '--primary': activeLightAccent.primary,
          '--primary-hover': activeLightAccent.hover,
          '--primary-contrast': '#ffffff',
          '--shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.07)',
        }
      : {};

    if (isAcrylic) {
      const acrylicSidebarBg = isDark
        ? `rgba(16, 16, 24, ${Math.min(0.95, Math.max(0.08, 0.40 * acrylicFactor)).toFixed(3)})`
        : `rgba(255, 255, 255, ${Math.min(0.95, Math.max(0.25, 0.60 * acrylicFactor)).toFixed(3)})`;
      const acrylicMainBg = isDark
        ? `rgba(10, 10, 16, ${Math.min(0.95, Math.max(0.04, 0.20 * acrylicFactor)).toFixed(3)})`
        : `rgba(248, 250, 252, ${Math.min(0.95, Math.max(0.15, 0.35 * acrylicFactor)).toFixed(3)})`;
      const acrylicPlayerBg = isDark
        ? `rgba(18, 18, 28, ${Math.min(0.95, Math.max(0.10, 0.45 * acrylicFactor)).toFixed(3)})`
        : `rgba(255, 255, 255, ${Math.min(0.95, Math.max(0.30, 0.70 * acrylicFactor)).toFixed(3)})`;
      const acrylicCardBg = isDark
        ? `rgba(26, 26, 38, ${Math.min(0.95, Math.max(0.06, 0.30 * acrylicFactor)).toFixed(3)})`
        : `rgba(255, 255, 255, ${Math.min(0.95, Math.max(0.25, 0.65 * acrylicFactor)).toFixed(3)})`;
      const acrylicModalBg = isDark
        ? `rgba(18, 18, 28, ${Math.min(0.98, Math.max(0.15, 0.60 * acrylicFactor)).toFixed(3)})`
        : `rgba(255, 255, 255, ${Math.min(0.98, Math.max(0.40, 0.88 * acrylicFactor)).toFixed(3)})`;
      const acrylicRootBg = isDark
        ? `rgba(10, 10, 16, ${Math.min(0.95, Math.max(0.04, 0.25 * acrylicFactor)).toFixed(3)})`
        : `rgba(248, 250, 252, ${Math.min(0.95, Math.max(0.15, 0.40 * acrylicFactor)).toFixed(3)})`;
      const acrylicSubCardBg = isDark
        ? `rgba(255, 255, 255, ${Math.min(0.20, Math.max(0.02, 0.04 * acrylicFactor)).toFixed(3)})`
        : `rgba(255, 255, 255, ${Math.min(0.95, Math.max(0.35, 0.75 * acrylicFactor)).toFixed(3)})`;
      const acrylicBlur = `${Math.round(Math.min(48, Math.max(8, 28 * blurScale)))}px`;
      const acrylicBlurMain = `${Math.round(Math.min(40, Math.max(6, 24 * blurScale)))}px`;
      const acrylicBlurCard = `${Math.round(Math.min(36, Math.max(6, 20 * blurScale)))}px`;
      const acrylicBlurModal = `${Math.round(Math.min(54, Math.max(12, 36 * blurScale)))}px`;

      return {
        ...lightTokens,
        '--acrylic-intensity': `${acrylicIntensity}%`,
        '--acrylic-root-bg': acrylicRootBg,
        '--acrylic-sidebar-bg': acrylicSidebarBg,
        '--acrylic-player-bg': acrylicPlayerBg,
        '--acrylic-main-bg': acrylicMainBg,
        '--acrylic-card-bg': acrylicCardBg,
        '--acrylic-modal-bg': acrylicModalBg,
        '--acrylic-sub-card-bg': acrylicSubCardBg,
        '--acrylic-blur': acrylicBlur,
        '--acrylic-blur-main': acrylicBlurMain,
        '--acrylic-blur-card': acrylicBlurCard,
        '--acrylic-blur-modal': acrylicBlurModal,
        '--glass-intensity': `${acrylicIntensity}%`,
        '--glass-factor': `${(acrylicIntensity / 100).toFixed(2)}`,
        '--glass-blur': acrylicBlur,
        '--glass-border': isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        '--glass-sidebar-bg': acrylicSidebarBg,
        '--glass-main-bg': acrylicMainBg,
        '--glass-player-bg': acrylicPlayerBg,
        '--glass-card-bg': acrylicCardBg,
        '--glass-modal-bg': acrylicModalBg,
      } as unknown as React.CSSProperties;
    }

    return {
      ...lightTokens,
      '--glass-intensity': `${glassIntensity}%`,
      '--glass-factor': `${glassFactor}`,
      '--glass-blur': `${Math.round(14 + glassFactor * 26)}px`,
      '--glass-border': isDark
        ? `rgba(255, 255, 255, ${0.06 + glassFactor * 0.14})`
        : `rgba(203, 213, 225, ${0.50 + glassFactor * 0.30})`,
      '--glass-sidebar-bg': isDark
        ? `rgba(10, 10, 15, ${Math.max(0.18, 0.95 - glassFactor * 0.77)})`
        : `rgba(255, 255, 255, ${Math.max(0.60, 0.95 - glassFactor * 0.35)})`,
      '--glass-main-bg': isDark
        ? `rgba(6, 6, 10, ${Math.max(0.12, 0.92 - glassFactor * 0.8)})`
        : `rgba(248, 250, 252, ${Math.max(0.50, 0.92 - glassFactor * 0.42)})`,
      '--glass-player-bg': isDark
        ? `rgba(12, 12, 18, ${Math.max(0.22, 0.95 - glassFactor * 0.73)})`
        : `rgba(255, 255, 255, ${Math.max(0.70, 0.96 - glassFactor * 0.26)})`,
      '--glass-card-bg': isDark
        ? `rgba(20, 20, 28, ${Math.max(0.16, 0.9 - glassFactor * 0.74)})`
        : `rgba(255, 255, 255, ${Math.max(0.65, 0.95 - glassFactor * 0.30)})`,
      '--glass-modal-bg': isDark
        ? `rgba(14, 14, 22, ${Math.max(0.45, 0.95 - glassFactor * 0.5)})`
        : `rgba(255, 255, 255, ${Math.max(0.85, 0.98 - glassFactor * 0.13)})`,
    } as unknown as React.CSSProperties;
  }, [isAcrylic, acrylicIntensity, acrylicFactor, blurScale, glassIntensity, glassFactor, isDark, playerSettings.accent]);

  // Check if fullscreen video or UI is active to prevent any foreground toast popup
  const isFullscreenActive = useMemo(() => {
    const isDocFs = typeof document !== 'undefined' && Boolean(document.fullscreenElement);
    const isVideoTheater = videoMode === 'theater' && Boolean(currentPlayingTrack?.isVideo);
    return isFullscreenOpen || isDocFs || isVideoTheater;
  }, [isFullscreenOpen, videoMode, currentPlayingTrack?.isVideo]);

  return (
    <div
      id="app-root-container"
      data-theme={playerSettings.theme || 'dark'}
      data-effect={backdropEffect}
      data-accent={playerSettings.accent || 'emerald'}
      style={glassStyle}
      className={`w-screen h-screen flex flex-col overflow-hidden transition-colors duration-200 relative ${
        playerSettings.theme === 'light'
          ? (isAcrylic ? 'light text-slate-900' : 'light bg-slate-100/60 text-slate-900')
          : (isAcrylic ? 'dark text-neutral-100' : 'dark bg-neutral-950 text-neutral-100')
      }`}
    >
      {/* Pure Glass Ambient Glow & Refraction Layer (muted in Acrylic mode) */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-700 z-0"
        style={{
          opacity: isAcrylic ? 0 : Math.max(0.40, glassFactor),
        }}
      >
        <div
          className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full blur-[110px] transition-all duration-1000"
          style={{
            background:
              playerSettings.accent === 'emerald'
                ? (isDark
                    ? 'radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, rgba(6, 78, 59, 0.15) 70%, transparent 100%)'
                    : 'radial-gradient(circle, rgba(52, 211, 153, 0.35) 0%, rgba(167, 243, 208, 0.2) 65%, transparent 100%)')
                : playerSettings.accent === 'violet'
                ? (isDark
                    ? 'radial-gradient(circle, rgba(139, 92, 246, 0.45) 0%, rgba(76, 29, 149, 0.15) 70%, transparent 100%)'
                    : 'radial-gradient(circle, rgba(167, 139, 250, 0.35) 0%, rgba(221, 214, 254, 0.2) 65%, transparent 100%)')
                : playerSettings.accent === 'cyan'
                ? (isDark
                    ? 'radial-gradient(circle, rgba(6, 182, 212, 0.45) 0%, rgba(21, 94, 117, 0.15) 70%, transparent 100%)'
                    : 'radial-gradient(circle, rgba(34, 211, 238, 0.35) 0%, rgba(165, 243, 252, 0.2) 65%, transparent 100%)')
                : playerSettings.accent === 'rose'
                ? (isDark
                    ? 'radial-gradient(circle, rgba(244, 63, 94, 0.45) 0%, rgba(136, 19, 55, 0.15) 70%, transparent 100%)'
                    : 'radial-gradient(circle, rgba(251, 113, 133, 0.35) 0%, rgba(254, 205, 211, 0.2) 65%, transparent 100%)')
                : playerSettings.accent === 'amber'
                ? (isDark
                    ? 'radial-gradient(circle, rgba(245, 158, 11, 0.45) 0%, rgba(120, 53, 15, 0.15) 70%, transparent 100%)'
                    : 'radial-gradient(circle, rgba(251, 191, 36, 0.35) 0%, rgba(254, 243, 199, 0.2) 65%, transparent 100%)')
                : (isDark
                    ? 'radial-gradient(circle, rgba(59, 130, 246, 0.45) 0%, rgba(30, 58, 138, 0.15) 70%, transparent 100%)'
                    : 'radial-gradient(circle, rgba(96, 165, 250, 0.35) 0%, rgba(191, 219, 254, 0.2) 65%, transparent 100%)'),
          }}
        />

        <div
          className="absolute -bottom-[20%] -right-[10%] w-[50vw] h-[50vw] rounded-full blur-[120px] transition-all duration-1000"
          style={{
            background:
              playerSettings.accent === 'emerald'
                ? (isDark
                    ? 'radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(110, 231, 183, 0.25) 0%, transparent 70%)')
                : playerSettings.accent === 'violet'
                ? (isDark
                    ? 'radial-gradient(circle, rgba(244, 63, 94, 0.25) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(244, 114, 182, 0.25) 0%, transparent 70%)')
                : playerSettings.accent === 'cyan'
                ? (isDark
                    ? 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(147, 197, 253, 0.25) 0%, transparent 70%)')
                : playerSettings.accent === 'rose'
                ? (isDark
                    ? 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(196, 181, 253, 0.25) 0%, transparent 70%)')
                : playerSettings.accent === 'amber'
                ? (isDark
                    ? 'radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(252, 165, 165, 0.25) 0%, transparent 70%)')
                : (isDark
                    ? 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(167, 243, 208, 0.25) 0%, transparent 70%)'),
          }}
        />
        <div
          className="absolute top-[35%] left-[30%] w-[45vw] h-[45vw] rounded-full blur-[120px] opacity-20 transition-all duration-1000"
          style={{
            background:
              playerSettings.theme === 'light'
                ? (playerSettings.accent === 'cyan'
                    ? 'radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, transparent 70%)'
                    : playerSettings.accent === 'emerald'
                    ? 'radial-gradient(circle, rgba(52, 211, 153, 0.22) 0%, transparent 70%)'
                    : playerSettings.accent === 'violet'
                    ? 'radial-gradient(circle, rgba(192, 132, 252, 0.22) 0%, transparent 70%)'
                    : playerSettings.accent === 'blue'
                    ? 'radial-gradient(circle, rgba(96, 165, 250, 0.22) 0%, transparent 70%)'
                    : playerSettings.accent === 'amber'
                    ? 'radial-gradient(circle, rgba(251, 191, 36, 0.22) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(251, 113, 133, 0.22) 0%, transparent 70%)')
                : 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%)',
          }}
        />
      </div>
      {/* Native Windows Frameless TitleBar */}
      {!isMiniPlayer && (
        <TitleBar
          currentTrack={currentPlayingTrack}
          isPlaying={isPlaying}
          accent={playerSettings.accent}
          settings={playerSettings}
          appVersion={appVersion}
        />

      )}

      {/* Dedicated HTMLAudioElement for music playback (connected to Web Audio engine) */}
      <audio ref={audioRef} preload="auto" className="hidden" />

      {/* Unified Video & Audio Media Player Engine */}
      <VideoPlayer
        videoRef={videoRef}
        currentTrack={currentPlayingTrack}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onPlay={() => {
          if (isTransitioningRef.current) return;
          setIsPlaying(true);
        }}
        onPause={() => {
          if (isTransitioningRef.current) return;
          setIsPlaying(false);
        }}
        onError={(e) => {
          if (isTransitioningRef.current) return;
          const mediaError = videoRef.current?.error;
          if (mediaError && mediaError.code === MediaError.MEDIA_ERR_ABORTED) {
            return;
          }
          console.warn('Impossible de charger le flux média vidéo:', e);
          setIsPlaying(false);
        }}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onPrev={handlePrev}
        onNext={handleNext}
        videoMode={videoMode}
        onSetVideoMode={setVideoMode}
        accent={playerSettings.accent}
        queue={queue}
        currentTrackIndex={currentTrackIndex}
        onSelectTrack={(idx) => playTrackAt(idx)}
        onRemoveFromQueue={(idx) => {
          setQueue((prev) => {
            const next = prev.filter((_, i) => i !== idx);
            queueRef.current = next;
            return next;
          });
          if (idx < currentTrackIndex) {
            setCurrentTrackIndex((prev) => prev - 1);
            currentTrackIndexRef.current--;
          } else if (idx === currentTrackIndex) {
            const nextQueue = queueRef.current;
            if (nextQueue.length === 0) {
              handleStop();
            } else if (currentTrackIndex >= nextQueue.length) {
              playTrackAt(0, nextQueue);
            } else {
              playTrackAt(currentTrackIndex, nextQueue);
            }
          }
        }}
        onClearQueue={() => {
          setQueue(currentPlayingTrack ? [currentPlayingTrack] : []);
          queueRef.current = currentPlayingTrack ? [currentPlayingTrack] : [];
          setCurrentTrackIndex(currentPlayingTrack ? 0 : -1);
          currentTrackIndexRef.current = currentPlayingTrack ? 0 : -1;
        }}
        onAddMediaToQueue={handleAddMediaToQueue}
        onSaveQueueAsPlaylist={async () => {
          if (queue.length === 0) return;
          const newPl: Playlist = {
            id: `playlist-${Date.now()}`,
            title: `Session ${new Date().toLocaleDateString('fr-FR')}`,
            description: 'Playlist générée depuis la file d’attente',
            coverUrl: queue[0]?.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
            trackIds: queue.map((t) => t.id),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isSmart: false,
          };
          await savePlaylist(newPl);
          setPlaylists((prev) => [...prev, newPl]);
        }}
        autoSkipOpening={playerSettings.autoSkipOpening}
        onToggleAutoSkip={(enabled) => handleUpdatePlayerSettings({ ...playerSettings, autoSkipOpening: enabled })}
        enableSkipOpening={playerSettings.enableSkipOpening ?? true}
        enableSilenceSnapping={playerSettings.enableSilenceSnapping ?? true}
        marathonConfig={playerSettings.marathonConfig}
        onUpdateMarathonConfig={(newCfg) => handleUpdatePlayerSettings({ ...playerSettings, marathonConfig: newCfg })}
        videoSkipForwardInterval={playerSettings.videoSkipForwardInterval ?? 10}
        videoAspectRatio={playerSettings.videoAspectRatio ?? 'contain'}
        settings={playerSettings}
        onClose={() => {
          setVideoMode('hidden');
          handleStop();
        }}
      />

      {/* Exclusive Floating Widget Mode: when active, the player becomes ONLY the floating widget */}
      {isMiniPlayer ? (
        <div className={`w-full h-full relative select-none ${isAcrylic ? 'bg-transparent' : (playerSettings.theme === 'light' ? 'bg-slate-100' : 'bg-neutral-950')}`}>
          <MiniPlayer
            currentTrack={currentPlayingTrack}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onStop={handleStop}
            onPrev={handlePrev}
            onNext={handleNext}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            volume={volume}
            onVolumeChange={handleVolumeChange}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            isFavorite={currentPlayingTrack ? currentPlayingTrack.isFavorite : false}
            onToggleFavorite={() => {
              if (currentPlayingTrack) handleToggleFavorite(currentPlayingTrack.id);
            }}
            onRestore={() => {
              setIsMiniPlayer(false);
              window.electronAPI?.setCompactMode?.(false);
            }}
            accent={playerSettings.accent}
            playlists={playlists}
            onAddToPlaylist={handleAddToPlaylist}
            onRemoveFromPlaylist={handleRemoveTrackFromPlaylist}
            onCreatePlaylist={() => setIsCreatePlaylistModalOpen(true)}
            onCreatePlaylistDirect={async (title) => {
              await handleSaveNewPlaylist(title);
            }}
            settings={playerSettings}
            onUpdateSettings={handleUpdatePlayerSettings}
            isStandalone={true}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              currentView={currentView}
              onNavigate={handleNavigate}
              playlists={playlists}
              favoritesCount={tracks.filter((t) => t.isFavorite).length}
              videosCount={tracks.filter((t) => t.isVideo).length}
              onCreatePlaylist={() => setIsCreatePlaylistModalOpen(true)}
              onOpenSettings={() => {
                setSettingsInitialTab('appearance');
                setIsSettingsOpen(true);
              }}
              onOpenEqualizer={() => setIsEqualizerOpen(true)}
              onImportFiles={handleImportFiles}
              accent={playerSettings.accent}
              theme={playerSettings.theme}
              cachedCount={cachedTracksCount}
              isPlaying={isPlaying}
              settings={playerSettings}
              onUpdateSettings={handleUpdatePlayerSettings}
              onToggleFullscreen={() => setIsFullscreenOpen(true)}
              onTogglePinPlaylist={handleTogglePinPlaylist}
              onBulkUpdatePins={handleBulkUpdatePins}
              onOpenManageSidebar={() => setIsManageSidebarOpen(true)}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              onOpenQueue={() => setIsQueueOpen((p) => !p)}
              queueLength={queue.length}
              isQueueOpen={isQueueOpen}
            />

            {/* Scrollable Center Content View */}
            <main id="main-content-scroll" className="flex-1 overflow-y-auto glass-main relative z-10">
              {renderMainContent()}
            </main>
          </div>

          <PlayerBar
            currentTrack={currentPlayingTrack}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onStop={handleStop}
            onPrev={handlePrev}
            onNext={handleNext}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            volume={volume}
            onVolumeChange={handleVolumeChange}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            isFavorite={currentPlayingTrack ? currentPlayingTrack.isFavorite : false}
            onToggleFavorite={() => {
              if (currentPlayingTrack) handleToggleFavorite(currentPlayingTrack.id);
            }}
            shuffle={shuffle}
            onToggleShuffle={() => setShuffle((p) => !p)}
            repeatMode={repeatMode}
            onCycleRepeat={() =>
              setRepeatMode((p) => (p === 'off' ? 'all' : p === 'all' ? 'one' : 'off'))
            }
            onOpenQueue={() => setIsQueueOpen((prev) => !prev)}
            queueLength={queue.length}
            onOpenEqualizer={() => setIsEqualizerOpen((prev) => !prev)}
            onToggleFullscreen={() => setIsFullscreenOpen(true)}
            onToggleMiniPlayer={() => setIsMiniPlayer((p) => !p)}
            onOpenDetachedPip={handleOpenDetachedPip}
            isDetachedPipActive={isMiniPlayer}
            onToggleVideo={() => setVideoMode((prev) => (prev === 'theater' ? 'pip' : 'theater'))}
            isVideoModeActive={videoMode !== 'hidden'}
            accent={playerSettings.accent}
            settings={playerSettings}
            onUpdateSettings={handleUpdatePlayerSettings}
            onOpenTrimmer={handleOpenTrimmer}
          />
        </>
      )}

      {/* Equalizer Modal */}
      <EqualizerModal
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
        settings={equalizerSettings}
        onChange={handleUpdateEqualizerSettings}
        accent={playerSettings.accent}
        playerSettings={playerSettings}
        onUpdatePlayerSettings={handleUpdatePlayerSettings}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={playerSettings}
        onChange={handleUpdatePlayerSettings}
        tracksCount={tracks.length}
        playlistsCount={playlists.length}
        onDataReload={loadDatabase}
        initialTab={settingsInitialTab}
        appUpdateInfo={appUpdateInfo}
        appVersion={appVersion}
      />

      {/* Update Notification Toast (Never shown over fullscreen video) */}
      <UpdateNotificationToast
        updateInfo={appUpdateInfo}
        onOpenSettingsUpdate={() => {
          setSettingsInitialTab('system');
          setIsSettingsOpen(true);
        }}
        onDismiss={() => setIsUpdateToastDismissed(true)}
        isDismissed={isUpdateToastDismissed}
        isFullscreenActive={isFullscreenActive}
        accent={playerSettings.accent}
        theme={playerSettings.theme}
        appVersion={appVersion}
      />


      {/* Fullscreen & Synchronized Lyrics View */}
      <LyricsAndFullscreen
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        currentTrack={currentPlayingTrack}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onStop={handleStop}
        onPrev={handlePrev}
        onNext={handleNext}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isFavorite={currentPlayingTrack ? currentPlayingTrack.isFavorite : false}
        onToggleFavorite={() => {
          if (currentPlayingTrack) handleToggleFavorite(currentPlayingTrack.id);
        }}
        shuffle={shuffle}
        onToggleShuffle={() => setShuffle((p) => !p)}
        repeatMode={repeatMode}
        onCycleRepeat={() =>
          setRepeatMode((p) => (p === 'off' ? 'all' : p === 'all' ? 'one' : 'off'))
        }
        accent={playerSettings.accent}
        settings={playerSettings}
        onUpdateSettings={handleUpdatePlayerSettings}
      />

      {/* Queue Drawer */}
      <QueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queue={queue}
        currentTrackIndex={currentTrackIndex}
        onSelectTrack={(idx) => playTrackAt(idx)}
        onRemoveFromQueue={(idx) => {
          setQueue((prev) => {
            const next = prev.filter((_, i) => i !== idx);
            queueRef.current = next;
            return next;
          });
          if (idx < currentTrackIndex) {
            setCurrentTrackIndex((prev) => prev - 1);
            currentTrackIndexRef.current--;
          } else if (idx === currentTrackIndex) {
            const nextQueue = queueRef.current;
            if (nextQueue.length === 0) {
              handleStop();
            } else if (currentTrackIndex >= nextQueue.length) {
              playTrackAt(0, nextQueue);
            } else {
              playTrackAt(currentTrackIndex, nextQueue);
            }
          }
        }}
        onMoveQueueItem={(from, to) => {
          setQueue((prev) => {
            const next = [...prev];
            const [item] = next.splice(from, 1);
            next.splice(to, 0, item);
            queueRef.current = next;
            return next;
          });
          if (currentTrackIndex === from) {
            setCurrentTrackIndex(to);
            currentTrackIndexRef.current = to;
          } else if (from < currentTrackIndex && to >= currentTrackIndex) {
            setCurrentTrackIndex((prev) => prev - 1);
            currentTrackIndexRef.current--;
          } else if (from > currentTrackIndex && to <= currentTrackIndex) {
            setCurrentTrackIndex((prev) => prev + 1);
            currentTrackIndexRef.current++;
          }
        }}
        onClearQueue={() => {
          setQueue(currentPlayingTrack ? [currentPlayingTrack] : []);
          queueRef.current = currentPlayingTrack ? [currentPlayingTrack] : [];
          setCurrentTrackIndex(currentPlayingTrack ? 0 : -1);
          currentTrackIndexRef.current = currentPlayingTrack ? 0 : -1;
        }}
        onAddMediaToQueue={handleAddMediaToQueue}
        onSaveQueueAsPlaylist={async () => {
          if (queue.length === 0) return;
          const newPl: Playlist = {
            id: `playlist-${Date.now()}`,
            title: `Session ${new Date().toLocaleDateString('fr-FR')}`,
            description: 'Playlist générée depuis la file d’attente',
            coverUrl: queue[0]?.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
            trackIds: queue.map((t) => t.id),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isSmart: false,
          };
          await savePlaylist(newPl);
          setPlaylists((prev) => [...prev, newPl]);
          setIsQueueOpen(false);
          setCurrentView(`playlist-${newPl.id}`);
          setActivePlaylistId(newPl.id);
        }}
        accent={playerSettings.accent}
        settings={playerSettings}
      />

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistModalOpen}
        onClose={() => setIsCreatePlaylistModalOpen(false)}
        onCreate={handleSaveNewPlaylist}
        accent={playerSettings.accent}
      />

      {/* Manage Sidebar Playlists Modal */}
      <ManageSidebarPlaylistsModal
        isOpen={isManageSidebarOpen}
        onClose={() => setIsManageSidebarOpen(false)}
        playlists={playlists}
        onTogglePin={handleTogglePinPlaylist}
        onBulkUpdatePins={handleBulkUpdatePins}
        onCreatePlaylist={() => setIsCreatePlaylistModalOpen(true)}
        onNavigate={handleNavigate}
        accent={playerSettings.accent}
      />


      {/* Detached Always-on-Top Window Portal */}
      {detachedPipWindow && !detachedPipWindow.closed && (
        <DetachedMiniPlayerPortal
          targetWindow={detachedPipWindow}
          currentTrack={currentPlayingTrack}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onStop={handleStop}
          onPrev={handlePrev}
          onNext={handleNext}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isFavorite={currentPlayingTrack ? currentPlayingTrack.isFavorite : false}
          onToggleFavorite={() => {
            if (currentPlayingTrack) handleToggleFavorite(currentPlayingTrack.id);
          }}
          accent={playerSettings.accent}
          settings={playerSettings}
          onClose={handleCloseDetachedPip}
        />
      )}

      {/* Floating Always-on-Top status notification */}
      {pipNotification && (
        <div className="fixed top-5 right-5 z-[100] px-4 py-2.5 rounded-xl bg-neutral-900/95 border border-emerald-500/50 text-emerald-300 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in slide-in-from-top-3 select-none pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{pipNotification}</span>
        </div>
      )}

      {/* Audio Trimmer & Cutter Studio Modal */}
      <AudioTrimmerModal
        isOpen={!!trimmerTrack}
        onClose={() => setTrimmerTrack(null)}
        track={trimmerTrack}
        accent={playerSettings.accent}
        onTrackCreated={handleTrackCreated}
        onTrackUpdated={handleTrackUpdated}
      />

      {/* Track ID3 Tag & Cover Art Editor Modal */}
      <TrackTagEditorModal
        isOpen={!!tagEditorTrack}
        onClose={() => setTagEditorTrack(null)}
        track={tagEditorTrack}
        onSave={handleSaveTrackTags}
        accent={playerSettings.accent}
      />

      {/* Duplicate Finder & Cleanup Modal */}
      <DuplicateFinderModal
        isOpen={isDeduplicatorOpen}
        onClose={() => setIsDeduplicatorOpen(false)}
        tracks={tracks}
        onDeleteTrack={(track) => handleDeleteTrack(track.id)}
        onPlayTrack={(track) => {
          const idx = tracks.findIndex((t) => t.id === track.id);
          playTrackAt(idx !== -1 ? idx : 0, tracks);
        }}
        currentTrackId={currentPlayingTrack?.id || null}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        accent={playerSettings.accent}
      />

      {/* Audio Merger & Track Concatenator Modal */}
      <AudioMergerModal
        isOpen={isMergerOpen}
        onClose={() => setIsMergerOpen(false)}
        tracks={tracks}
        onTrackCreated={handleTrackCreatedFromMerger}
        accent={playerSettings.accent}
      />

      {/* Listening Statistics Modal */}
      <ListeningStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        tracks={tracks}
        onPlayTrack={(track) => playTrackAt(0, [track, ...queue.filter((t) => t.id !== track.id)])}
        accent={playerSettings.accent}
        settings={playerSettings}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tracks={tracks}
        playlists={playlists}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onNext={handleNext}
        onPrev={handlePrev}
        onToggleShuffle={() => setShuffle((p) => !p)}
        onPlayTrack={(track) => playTrackAt(0, [track, ...queue.filter((t) => t.id !== track.id)])}
        onOpenPlaylist={(playlistId) => handleNavigate('playlist', playlistId)}
        onOpenEqualizer={() => setIsEqualizerOpen(true)}
        onOpenMiniPlayer={() => setIsMiniPlayer(true)}
        onOpenFullscreen={() => setIsFullscreenOpen(true)}
        onOpenImport={() => {}}
        onOpenVideos={() => handleNavigate('videos')}
        onOpenDownloader={() => handleNavigate('downloader')}
        onOpenDeduplicator={() => setIsDeduplicatorOpen(true)}
        onOpenMerger={() => setIsMergerOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        accent={playerSettings.accent}
      />
    </div>
  );
}

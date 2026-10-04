import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Shuffle,
  Repeat,
  Repeat1,
  Music,
  Search,
  Sparkles,
  Loader2,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import { Track, AccentColor, PlayerSettings } from '../types';
import { AudioVisualizer } from './AudioVisualizer';
import { fetchLyricsForTrack, parseLrc, LyricLine } from '../services/lyricsService';
import { saveTrack } from '../services/audioDb';

interface LyricsAndFullscreenProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStop?: () => void;
  onPrev: () => void;
  onNext: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  shuffle: boolean;
  onToggleShuffle: () => void;
  repeatMode: 'off' | 'all' | 'one';
  onCycleRepeat: () => void;
  accent: AccentColor;
  settings: PlayerSettings;
  onUpdateSettings?: (settings: PlayerSettings) => void;
}

const VISUALIZER_NAMES: Record<string, string> = {
  bars: 'Barres',
  wave: 'Onde',
  pillars: 'Piliers',
  circle: 'Radar',
  minimal: 'LEDs Micro',
};

const ACCENT_TEXT: Record<AccentColor, string> = {
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  cyan: 'text-cyan-400',
};

const ACCENT_ACTIVE_TEXT: Record<AccentColor, string> = {
  emerald: 'text-emerald-300 drop-shadow-[0_2px_16px_rgba(16,185,129,0.6)]',
  violet: 'text-violet-300 drop-shadow-[0_2px_16px_rgba(139,92,246,0.6)]',
  blue: 'text-blue-300 drop-shadow-[0_2px_16px_rgba(59,130,246,0.6)]',
  amber: 'text-amber-300 drop-shadow-[0_2px_16px_rgba(245,158,11,0.6)]',
  rose: 'text-rose-300 drop-shadow-[0_2px_16px_rgba(244,63,94,0.6)]',
  cyan: 'text-cyan-300 drop-shadow-[0_2px_16px_rgba(6,182,212,0.6)]',
};

const ACCENT_BG: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white',
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950',
  rose: 'bg-rose-500 hover:bg-rose-400 text-white',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950',
};

const ACCENT_RANGE: Record<AccentColor, string> = {
  emerald: 'accent-emerald-500',
  violet: 'accent-violet-500',
  blue: 'accent-blue-500',
  amber: 'accent-amber-500',
  rose: 'accent-rose-500',
  cyan: 'accent-cyan-500',
};

const ACCENT_GLOW: Record<AccentColor, string> = {
  emerald: 'shadow-[0_0_35px_rgba(16,185,129,0.35)]',
  violet: 'shadow-[0_0_35px_rgba(139,92,246,0.35)]',
  blue: 'shadow-[0_0_35px_rgba(59,130,246,0.35)]',
  amber: 'shadow-[0_0_35px_rgba(245,158,11,0.35)]',
  rose: 'shadow-[0_0_35px_rgba(244,63,94,0.35)]',
  cyan: 'shadow-[0_0_35px_rgba(6,182,212,0.35)]',
};

const FONT_SIZES = {
  sm: { active: 'text-xl md:text-2xl', inactive: 'text-base md:text-lg' },
  md: { active: 'text-2xl md:text-3.5xl lg:text-4xl', inactive: 'text-lg md:text-2xl' },
  lg: { active: 'text-3xl md:text-4.5xl lg:text-5xl', inactive: 'text-xl md:text-3xl' },
};

export const LyricsAndFullscreen: React.FC<LyricsAndFullscreenProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  onTogglePlay,
  onStop,
  onPrev,
  onNext,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  isFavorite,
  onToggleFavorite,
  shuffle,
  onToggleShuffle,
  repeatMode,
  onCycleRepeat,
  accent,
  settings,
  onUpdateSettings,
}) => {
  const [lyricsLines, setLyricsLines] = useState<LyricLine[]>([]);
  const [isSynced, setIsSynced] = useState(false);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lyricsSource, setLyricsSource] = useState<string>('');
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [customSearchTerm, setCustomSearchTerm] = useState('');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [syncOffset, setSyncOffset] = useState<number>(currentTrack?.lyricsOffset ?? 0);

  useEffect(() => {
    setSyncOffset(currentTrack?.lyricsOffset ?? 0);
  }, [currentTrack?.id, currentTrack?.lyricsOffset]);

  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const scrollTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-fetch or parse lyrics whenever the current track changes or view opens
  useEffect(() => {
    if (!isOpen || !currentTrack) return;

    let isCancelled = false;

    // Check if the track already has saved lyrics in its object
    if (currentTrack.lyrics && currentTrack.lyrics.length > 0) {
      const combined = currentTrack.lyrics.join('\n');
      const parsed = parseLrc(combined);
      if (parsed.length > 0) {
        setLyricsLines(parsed);
        setIsSynced(true);
        setIsInstrumental(false);
        setLyricsSource('local');
        return;
      } else {
        // Plain text lyrics
        setLyricsLines(
          currentTrack.lyrics.map((t, idx) => ({ time: idx * 5, text: t }))
        );
        setIsSynced(false);
        setIsInstrumental(false);
        setLyricsSource('local');
        return;
      }
    }

    // Otherwise fetch online from LRCLIB / local server
    setIsLoading(true);
    setLyricsLines([]);
    setIsSynced(false);
    setIsInstrumental(false);
    setLyricsSource('');

    fetchLyricsForTrack(
      currentTrack.title,
      currentTrack.artist,
      currentTrack.duration || duration,
      (currentTrack as any).filePath
    )
      .then((res) => {
        if (isCancelled) return;
        if (res && res.lines.length > 0) {
          setLyricsLines(res.lines);
          setIsSynced(res.isSynced);
          setIsInstrumental(res.isInstrumental);
          setLyricsSource(res.source);

          // Persist back to track in IndexedDB for instant offline access next time
          if (res.rawLrc) {
            const updated = {
              ...currentTrack,
              lyrics: res.rawLrc.split(/\r?\n/).filter(Boolean),
            };
            saveTrack(updated).catch(() => {});
          }
        } else {
          setLyricsLines([]);
          setIsSynced(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setLyricsLines([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, currentTrack?.id]);

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in custom search input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          setIsSearchOpen(false);
        }
        return;
      }

      if (e.key === 'Escape') {
        onClose();
      } else if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onSeek(Math.max(0, currentTime - 5));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onSeek(Math.min(duration, currentTime + 5));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onVolumeChange(Math.min(1, volume + 0.05));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onVolumeChange(Math.max(0, volume - 0.05));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onTogglePlay, onSeek, currentTime, duration, onVolumeChange, volume]);

  const cycleVisualizerStyle = () => {
    const styles: Array<'bars' | 'wave' | 'pillars' | 'circle' | 'minimal'> = [
      'bars',
      'wave',
      'pillars',
      'circle',
      'minimal',
    ];
    const currentIndex = styles.indexOf(settings.visualizerStyle || 'bars');
    const nextStyle = styles[(currentIndex + 1) % styles.length];
    if (onUpdateSettings) {
      onUpdateSettings({ ...settings, visualizerStyle: nextStyle });
    }
  };

  const handleAdjustSync = (delta: number) => {
    if (!currentTrack) return;
    const newOffset = Math.round((syncOffset + delta) * 10) / 10;
    setSyncOffset(newOffset);
    const updated = { ...currentTrack, lyricsOffset: newOffset };
    saveTrack(updated).catch(() => {});
  };

  // Synchronized time taking manual offset into account
  const effectiveCurrentTime = Math.max(0, currentTime + syncOffset);

  // First audible lyric line timestamp (excluding metadata or blank intro lines)
  const firstLyricTime = useMemo(() => {
    if (!lyricsLines || lyricsLines.length === 0) return 0;
    const firstWithText = lyricsLines.find((l) => l.text.trim().length > 0);
    return firstWithText ? firstWithText.time : 0;
  }, [lyricsLines]);

  // Are we currently playing an instrumental introduction before singing begins?
  const isIntro = isSynced && firstLyricTime > 2.0 && effectiveCurrentTime < firstLyricTime;

  // Compute active lyric index based on audio effectiveCurrentTime
  const activeLyricIndex = useMemo(() => {
    if (!lyricsLines || lyricsLines.length === 0) return -1;
    if (!isSynced) {
      const ratio = duration > 0 ? effectiveCurrentTime / duration : 0;
      return Math.min(lyricsLines.length - 1, Math.floor(ratio * lyricsLines.length));
    }

    // If still in the instrumental introduction, do NOT activate any lyric line!
    if (effectiveCurrentTime < firstLyricTime - 0.2) {
      return -1;
    }

    // For synced LRC, find the latest timestamp <= effectiveCurrentTime + 0.15s
    let active = -1;
    for (let i = 0; i < lyricsLines.length; i++) {
      if (lyricsLines[i].time <= effectiveCurrentTime + 0.15) {
        active = i;
      } else {
        break;
      }
    }

    // Check if current line has finished and song is in an instrumental break
    if (active >= 0) {
      const currentLine = lyricsLines[active];
      const nextLine = lyricsLines[active + 1];
      if (nextLine) {
        const gap = nextLine.time - currentLine.time;
        // If current line has no text, it's explicitly an instrumental pause
        if (currentLine.text.trim().length === 0) {
          return -1;
        }
        // If the gap to next line is large (> 6s) and current line has been singing for > 4.5s:
        if (gap > 6.0 && effectiveCurrentTime > currentLine.time + 4.5) {
          return -1; // singing has finished, currently in instrumental bridge
        }
      }
    }

    return active;
  }, [lyricsLines, effectiveCurrentTime, isSynced, duration, firstLyricTime]);

  // Auto-scroll lyrics smoothly to keep active line in view
  useEffect(() => {
    if (isUserScrolling) return;

    const container = lyricsContainerRef.current;
    if (!container) return;

    if (activeLyricIndex < 0) {
      // If in intro, smoothly keep scroll at the very top
      if (isIntro) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    const activeEl = lineRefs.current[activeLyricIndex];
    if (activeEl) {
      const containerHeight = container.clientHeight;
      const activeTop = activeEl.offsetTop;
      const activeHeight = activeEl.clientHeight;
      // Position active line slightly above center (38% from top) for ideal reading flow
      const targetScroll = activeTop - containerHeight * 0.38 + activeHeight / 2;

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  }, [activeLyricIndex, isUserScrolling, isIntro]);

  // User manual scroll detection: pause auto-scroll temporarily
  const handleScroll = () => {
    setIsUserScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 4500);
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSearchTerm.trim() || !currentTrack) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `https://lrclib.net/api/search?q=${encodeURIComponent(customSearchTerm.trim())}`
      );
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          const match = items.find((i) => i.syncedLyrics) || items[0];
          if (match.instrumental) {
            setLyricsLines([{ time: 0, text: '♪ Morceau instrumental ♪' }]);
            setIsSynced(false);
            setIsInstrumental(true);
          } else if (match.syncedLyrics) {
            const parsed = parseLrc(match.syncedLyrics);
            setLyricsLines(parsed);
            setIsSynced(true);
            setIsInstrumental(false);
            // Save to track
            const updated = {
              ...currentTrack,
              lyrics: match.syncedLyrics.split(/\r?\n/).filter(Boolean),
            };
            saveTrack(updated).catch(() => {});
          } else if (match.plainLyrics) {
            const plainLines = match.plainLyrics
              .split(/\r?\n/)
              .map((t: string) => t.trim())
              .filter(Boolean)
              .map((text: string, idx: number) => ({ time: idx * 5, text }));
            setLyricsLines(plainLines);
            setIsSynced(false);
            setIsInstrumental(false);
          }
          setIsSearchOpen(false);
        }
      }
    } catch {}
    setIsLoading(false);
  };

  // Import custom local .lrc file
  const handleImportLrcFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTrack) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      if (text) {
        const parsed = parseLrc(text);
        if (parsed.length > 0) {
          setLyricsLines(parsed);
          setIsSynced(true);
          setIsInstrumental(false);
          setLyricsSource('local_file');
          const updated = {
            ...currentTrack,
            lyrics: text.split(/\r?\n/).filter(Boolean),
          };
          saveTrack(updated).catch(() => {});
        }
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen || !currentTrack) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const coverImage =
    currentTrack.coverUrl ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';

  return (
    <div
      id="fullscreen-lyrics-modal"
      className="fixed inset-0 z-50 flex flex-col text-neutral-100 select-none overflow-hidden bg-neutral-950 animate-in fade-in duration-300"
    >
      {/* 1. Dynamic Ambient Aura Background (Apple Music & Spotify Fullscreen style) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        <img
          src={coverImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-150 blur-[110px] opacity-40 brightness-75 transition-all duration-1000 transform-gpu"
        />
        {/* Layered vignette gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/85" />
        <div className="absolute inset-0 bg-neutral-950/50 backdrop-blur-2xl" />
      </div>

      {/* 2. Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-10 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Plein Écran & Paroles</span>
          </div>

          <span className="hidden sm:inline-flex text-xs font-mono text-neutral-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
            {currentTrack.format?.toUpperCase() || 'AUDIO'} • {currentTrack.bitrate || 320} kbps
          </span>

          {isSynced && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <Check className="w-3.5 h-3.5" />
              Synchronisées
            </span>
          )}
          {isInstrumental && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2.5 py-1 rounded-full">
              <Music className="w-3.5 h-3.5" />
              Instrumental
            </span>
          )}

          {/* Sync calibration widget when isSynced */}
          {isSynced && (
            <div className="hidden lg:flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-xs text-neutral-300">
              <span className="text-[11px] text-neutral-400 mr-1">Calage :</span>
              <button
                type="button"
                onClick={() => handleAdjustSync(-0.5)}
                className="px-1.5 py-0.5 rounded hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="Avancer les paroles (-0.5s)"
              >
                -0.5s
              </button>
              <span className="font-mono text-[11px] px-1 font-semibold text-emerald-400">
                {syncOffset > 0 ? `+${syncOffset}s` : syncOffset < 0 ? `${syncOffset}s` : '0.0s'}
              </span>
              <button
                type="button"
                onClick={() => handleAdjustSync(0.5)}
                className="px-1.5 py-0.5 rounded hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="Retarder les paroles (+0.5s)"
              >
                +0.5s
              </button>
              {syncOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => handleAdjustSync(-syncOffset)}
                  className="text-[10px] text-neutral-400 hover:text-white ml-1 underline transition-colors cursor-pointer"
                  title="Réinitialiser le calage"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* Header Actions: Font Sizing, Search Lyrics, Close */}
        <div className="flex items-center gap-2">
          {/* Font Size Toggle */}
          <div className="hidden sm:flex items-center bg-white/5 rounded-lg border border-white/10 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFontSize('sm')}
              className={`px-2 py-1 rounded-md transition-colors ${
                fontSize === 'sm' ? 'bg-white/20 text-white' : 'text-neutral-400 hover:text-white'
              }`}
              title="Petite police"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize('md')}
              className={`px-2 py-1 rounded-md transition-colors ${
                fontSize === 'md' ? 'bg-white/20 text-white' : 'text-neutral-400 hover:text-white'
              }`}
              title="Police normale"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSize('lg')}
              className={`px-2 py-1 rounded-md transition-colors ${
                fontSize === 'lg' ? 'bg-white/20 text-white' : 'text-neutral-400 hover:text-white'
              }`}
              title="Grande police"
            >
              A+
            </button>
          </div>

          {/* Search Lyrics Button */}
          <button
            type="button"
            onClick={() => {
              setCustomSearchTerm(`${currentTrack.artist || ''} ${currentTrack.title || ''}`.trim());
              setIsSearchOpen((prev) => !prev);
            }}
            className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors border border-white/10 cursor-pointer"
            title="Rechercher d'autres paroles"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Import local .LRC */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".lrc,.txt"
            className="hidden"
            onChange={handleImportLrcFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="hidden md:flex p-2 rounded-full bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors border border-white/10 cursor-pointer"
            title="Importer un fichier .lrc local"
          >
            <Upload className="w-4 h-4" />
          </button>

          {/* Close button */}
          <button
            type="button"
            id="fullscreen-close-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors border border-white/10 cursor-pointer ml-1"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Manual Search Dropdown Bar */}
      {isSearchOpen && (
        <form
          onSubmit={handleManualSearch}
          className="relative z-20 mx-6 md:mx-10 mt-3 p-3 rounded-2xl bg-neutral-900/90 backdrop-blur-2xl border border-white/15 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-200"
        >
          <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Titre du morceau ou artiste pour trouver les paroles synchronisées..."
            value={customSearchTerm}
            onChange={(e) => setCustomSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !customSearchTerm.trim()}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${ACCENT_BG[accent]}`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rechercher'}
          </button>
          <button
            type="button"
            onClick={() => setIsSearchOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* 3. Main Stage: Left Track Info + Visualizer | Right Flowing Lyrics */}
      <main className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 px-6 md:px-12 py-4 items-center overflow-hidden">
        {/* Left Section: Artwork, Track Info & Visualizer aligned in matching width container */}
        <section className="md:col-span-5 flex flex-col items-center md:items-start justify-center gap-4 max-w-[340px] lg:max-w-[380px] mx-auto md:mx-0 w-full">
          {/* Album Cover Art */}
          <div className="relative group w-full aspect-square max-w-[280px] sm:max-w-[320px] md:max-w-[340px] lg:max-w-[380px] rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border border-white/10 transition-transform duration-500 group-hover:scale-[1.02]">
            <img
              src={coverImage}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {isPlaying && (
              <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-3xl pointer-events-none" />
            )}
          </div>

          {/* Track Titles & Metadata */}
          <div className="w-full flex flex-col gap-1 text-center md:text-left">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md">
              {currentTrack.title}
            </h1>
            <p className="text-sm sm:text-base font-semibold text-neutral-300 line-clamp-1">
              {currentTrack.artist}
            </p>
            {currentTrack.album && currentTrack.album !== 'Bibliothèque Locale' && (
              <p className="text-xs text-neutral-400 line-clamp-1">
                {currentTrack.album}
                {currentTrack.year ? ` • ${currentTrack.year}` : ''}
              </p>
            )}
          </div>

          {/* Real-time Integrated Visualizer with Interactive Style Selector */}
          <div className="w-full rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-2.5 overflow-hidden shadow-inner flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Visualiseur
              </span>
              <button
                type="button"
                onClick={cycleVisualizerStyle}
                className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-colors border border-white/10 flex items-center gap-1.5 cursor-pointer"
                title="Cliquer pour changer le style du visualiseur"
              >
                <span>{VISUALIZER_NAMES[settings.visualizerStyle || 'bars'] || 'Barres'}</span>
                <span className="text-[10px] text-neutral-400">⇄</span>
              </button>
            </div>
            <div className="w-full h-12 overflow-hidden rounded-xl">
              <AudioVisualizer
                isPlaying={isPlaying}
                style={settings.visualizerStyle}
                accent={accent}
                interactive={true}
                onStyleChange={(newStyle) => {
                  if (onUpdateSettings) {
                    onUpdateSettings({ ...settings, visualizerStyle: newStyle });
                  }
                }}
                className="w-full h-full"
              />
            </div>
          </div>
        </section>

        {/* Right Section: Apple Music Style Immersive Lyrics Stream */}
        <section className="md:col-span-7 h-full flex flex-col justify-center relative overflow-hidden">
          {/* Masked scroll container */}
          <div
            ref={lyricsContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 md:px-8 py-14 flex flex-col gap-5 md:gap-7 scroll-smooth select-text"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
            }}
          >
            {/* Loading state */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center my-auto gap-4 text-neutral-400 py-16">
                <Loader2 className={`w-8 h-8 animate-spin ${ACCENT_TEXT[accent]}`} />
                <p className="text-sm font-medium">Recherche des paroles officielles en cours...</p>
              </div>
            )}

            {/* Empty state when no lyrics found */}
            {!isLoading && lyricsLines.length === 0 && (
              <div className="flex flex-col items-center justify-center my-auto gap-4 text-center py-16 px-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md max-w-md mx-auto">
                <div className="p-4 rounded-2xl bg-white/10 text-neutral-300">
                  <Music className="w-8 h-8 opacity-60" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Paroles indisponibles</h3>
                  <p className="text-xs text-neutral-400 mb-4">
                    Aucune parole trouvée automatiquement pour ce morceau.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomSearchTerm(`${currentTrack.artist || ''} ${currentTrack.title || ''}`.trim());
                      setIsSearchOpen(true);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer ${ACCENT_BG[accent]}`}
                  >
                    Recherche manuelle
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-neutral-200 transition-colors border border-white/10 cursor-pointer"
                  >
                    Importer .LRC
                  </button>
                </div>
              </div>
            )}

            {/* Instrumental Intro indicator */}
            {!isLoading && isIntro && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 animate-pulse text-sm font-semibold max-w-fit mb-2 shadow-sm">
                <Music className={`w-4 h-4 ${ACCENT_TEXT[accent]}`} />
                <span>
                  Introduction instrumentale ({Math.max(0, Math.ceil(firstLyricTime - effectiveCurrentTime))}s)
                </span>
              </div>
            )}

            {/* Rendered Lyrics Lines */}
            {!isLoading &&
              lyricsLines.map((line, idx) => {
                const isActive = idx === activeLyricIndex;
                const distance = Math.abs(idx - activeLyricIndex);

                // If line is empty or purely whitespace, render subtle break indicator
                if (!line.text || line.text.trim().length === 0) {
                  return (
                    <div
                      key={idx}
                      ref={(el) => {
                        lineRefs.current[idx] = el as any;
                      }}
                      className="py-1 flex items-center gap-2 opacity-30"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    </div>
                  );
                }

                // Compute opacity fading based on distance from current playing line
                let opacityClass = 'opacity-30 hover:opacity-80';
                if (isActive) opacityClass = 'opacity-100';
                else if (distance === 1) opacityClass = 'opacity-60 hover:opacity-90';
                else if (distance === 2) opacityClass = 'opacity-40 hover:opacity-80';

                return (
                  <p
                    key={idx}
                    ref={(el) => {
                      lineRefs.current[idx] = el;
                    }}
                    onClick={() => {
                      if (isSynced) {
                        onSeek(line.time);
                        setIsUserScrolling(false);
                      } else {
                        const targetSec = (idx / lyricsLines.length) * duration;
                        onSeek(targetSec);
                      }
                    }}
                    className={`cursor-pointer transition-all duration-300 font-extrabold tracking-tight leading-relaxed select-none ${
                      isActive
                        ? `${FONT_SIZES[fontSize].active} ${ACCENT_ACTIVE_TEXT[accent]} scale-[1.03] origin-left drop-shadow-md`
                        : `${FONT_SIZES[fontSize].inactive} text-white/50 hover:text-white ${opacityClass}`
                    }`}
                  >
                    {line.text}
                  </p>
                );
              })}
          </div>

          {/* Floating Re-center Pill Button (appears when user manually scrolls away) */}
          {isUserScrolling && isSynced && activeLyricIndex >= 0 && (
            <button
              type="button"
              onClick={() => {
                setIsUserScrolling(false);
              }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-white text-xs font-bold backdrop-blur-xl border border-white/20 shadow-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 animate-in fade-in duration-200 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              Re-centrer sur la musique
            </button>
          )}
        </section>
      </main>

      {/* 4. Bottom Floating Glass Player Bar (Compact & Sleek) */}
      <footer className="relative z-10 pb-3 pt-1 px-4 md:px-8 flex justify-center">
        <div className="w-full max-w-3xl flex flex-col gap-1.5 bg-neutral-950/80 backdrop-blur-2xl py-2 px-4 sm:px-6 rounded-2xl border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
          {/* Progress Seek Bar */}
          <div className="flex items-center gap-2.5 w-full text-[11px] font-mono text-neutral-400">
            <span className="w-9 text-right">{formatTime(currentTime)}</span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.2}
                value={currentTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className={`w-full h-1 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer ${ACCENT_RANGE[accent]}`}
              />
            </div>
            <span className="w-9">{formatTime(duration)}</span>
          </div>

          {/* Player Action Buttons */}
          <div className="flex items-center justify-between">
            {/* Left Controls: Favorite & Shuffle */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={onToggleFavorite}
                className={`p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer ${
                  isFavorite ? 'text-rose-500 fill-current' : 'text-neutral-400 hover:text-white'
                }`}
                title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onToggleShuffle}
                className={`p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer ${
                  shuffle ? ACCENT_TEXT[accent] : 'text-neutral-400 hover:text-white'
                }`}
                title={shuffle ? 'Aléatoire activé' : 'Aléatoire désactivé'}
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>

            {/* Center Controls: Prev, Play/Pause, Stop, Next */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onPrev}
                className="p-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-95 cursor-pointer"
                title="Piste précédente"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={onTogglePlay}
                className={`p-2.5 sm:p-3 rounded-full transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg ${ACCENT_BG[accent]} ${ACCENT_GLOW[accent]}`}
                title={isPlaying ? 'Pause (Espace)' : 'Lecture (Espace)'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              {onStop && (
                <button
                  type="button"
                  onClick={onStop}
                  className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors active:scale-95 cursor-pointer"
                  title="Arrêter la lecture"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              )}

              <button
                type="button"
                onClick={onNext}
                className="p-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-95 cursor-pointer"
                title="Piste suivante"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Right Controls: Repeat & Volume */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={onCycleRepeat}
                className={`p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer ${
                  repeatMode !== 'off' ? ACCENT_TEXT[accent] : 'text-neutral-400 hover:text-white'
                }`}
                title={`Répétition : ${repeatMode}`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>

              <div className="hidden sm:flex items-center gap-1.5 ml-1">
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title={isMuted ? 'Activer le son' : 'Couper le son'}
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className={`w-16 sm:w-20 h-1 bg-white/10 rounded-lg cursor-pointer ${ACCENT_RANGE[accent]}`}
                />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

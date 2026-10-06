import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Shuffle,
  Search,
  SlidersHorizontal,
  Music,
  Heart,
  CheckCircle2,
  FolderUp,
  Clock,
  Disc,
  User,
  Layers,
  Plus,
  Trash2,
  ListPlus,
  Share2,
  FolderDown,
  CheckSquare,
  Square,
  AlertTriangle,
  Check,
  X,
  Volume2,
  Scissors,
  MoreVertical,
  ChevronDown,
  Download,
  Tag,
  Copy,
  BarChart3,
  List,
  LayoutGrid,
  Radio,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';
import { Track, Playlist, AccentColor, AudioFormat, PlayerSettings } from '../types';
import { saveAudioToPC } from '../utils/fileSaver';
import { getAudioBlob } from '../services/audioDb';
import { ExportTracksModal } from './ExportTracksModal';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { PlaylistIcon } from './PlaylistIcon';
import { OpenFileDropdown } from './OpenFileDropdown';
import { backgroundScanner } from '../services/backgroundScanner';
import { getT } from '../i18n';

interface LibraryViewProps {
  tracks: Track[];
  playlists: Playlist[];
  onPlayTrack: (track: Track, queueList?: Track[]) => void;
  onPlayAll?: (tracks: Track[], shuffle: boolean) => void;
  onToggleFavorite: (trackId: string) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveFromPlaylist?: (playlistId: string, trackId: string) => void;
  onCreatePlaylist?: (title: string) => Promise<string | void> | void;
  onAddToQueue: (track: Track) => void;
  onDeleteTrack?: (trackId: string) => void;
  onDeleteTracks?: (trackIds: string[]) => void;
  onImportFiles: (files: FileList | File[]) => void;
  accent: AccentColor;
  initialSearchFocus?: boolean;
  currentTrackId?: string | null;
  isPlaying?: boolean;
  onOpenTrimmer?: (track: Track) => void;
  onEditTrackTags?: (track: Track) => void;
  onOpenDeduplicator?: () => void;
  onOpenMerger?: () => void;
  onOpenStats?: () => void;
  settings?: PlayerSettings;
}

const ACCENT_BTN: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white font-bold',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white font-bold',
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold',
  rose: 'bg-rose-500 hover:bg-rose-400 text-white font-bold',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold',
};

const ACCENT_TEXT: Record<AccentColor, string> = {
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  cyan: 'text-cyan-400',
};

const ACCENT_BORDER_L: Record<AccentColor, string> = {
  emerald: 'border-l-4 border-l-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/25',
  violet: 'border-l-4 border-l-violet-500 bg-violet-500/10 dark:bg-violet-950/25',
  blue: 'border-l-4 border-l-blue-500 bg-blue-500/10 dark:bg-blue-950/25',
  amber: 'border-l-4 border-l-amber-500 bg-amber-500/10 dark:bg-amber-950/25',
  rose: 'border-l-4 border-l-rose-500 bg-rose-500/10 dark:bg-rose-950/25',
  cyan: 'border-l-4 border-l-cyan-500 bg-cyan-500/10 dark:bg-cyan-950/25',
};

export const LibraryView: React.FC<LibraryViewProps> = ({
  tracks,
  playlists,
  onPlayTrack,
  onPlayAll,
  onToggleFavorite,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onCreatePlaylist,
  onAddToQueue,
  onDeleteTrack,
  onDeleteTracks,
  onImportFiles,
  accent,
  initialSearchFocus,
  currentTrackId,
  isPlaying,
  onOpenTrimmer,
  onEditTrackTags,
  onOpenDeduplicator,
  onOpenMerger,
  onOpenStats,
  settings,
}: LibraryViewProps) => {
  const t = getT(settings?.language);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'added' | 'duration' | 'plays'>('title');
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{
    track: Track;
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Close menus when clicking anywhere outside, scrolling or resizing
  React.useEffect(() => {
    const handleCloseMenus = () => {
      setMenuAnchor(null);
      setIsHeaderMenuOpen(false);
    };
    window.addEventListener('click', handleCloseMenus);
    window.addEventListener('scroll', handleCloseMenus, true);
    window.addEventListener('resize', handleCloseMenus);
    return () => {
      window.removeEventListener('click', handleCloseMenus);
      window.removeEventListener('scroll', handleCloseMenus, true);
      window.removeEventListener('resize', handleCloseMenus);
    };
  }, []);

  const handleToggleTrackMenu = (e: React.MouseEvent<HTMLButtonElement>, track: Track) => {
    e.stopPropagation();
    if (menuAnchor?.track.id === track.id) {
      setMenuAnchor(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const right = Math.max(12, window.innerWidth - rect.right);

    // If space below is less than 350px (player bar + menu height), open UPWARDS
    if (spaceBelow < 350) {
      setMenuAnchor({
        track,
        bottom: window.innerHeight - rect.top + 6,
        right,
      });
    } else {
      setMenuAnchor({
        track,
        top: rect.bottom + 6,
        right,
      });
    }
  };

  // Track deletion & multi-select states
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Only music tracks should be visible in LibraryView (Bibliothèque de titres)
  const musicTracks = useMemo(() => tracks.filter((t) => !t.isVideo), [tracks]);

  // Export modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [tracksToExport, setTracksToExport] = useState<Track[]>([]);
  const [exportZipName, setExportZipName] = useState<string>('Bibliotheque_FlowLuna');

  const handleOpenExportSingle = (track: Track) => {
    setTracksToExport([track]);
    setExportZipName(`${track.artist} - ${track.title}`);
    setIsExportModalOpen(true);
  };

  const handleOpenExportBulk = () => {
    const selected = musicTracks.filter((t) => selectedTrackIds.has(t.id));
    if (selected.length === 0) return;
    setTracksToExport(selected);
    setExportZipName(`Selection_Musique_${selected.length}_pistes`);
    setIsExportModalOpen(true);
  };

  const handleOpenExportAll = () => {
    const list = filtered.length > 0 ? filtered : musicTracks;
    if (list.length === 0) return;
    setTracksToExport(list);
    setExportZipName(`Bibliotheque_Musique_${list.length}_pistes`);
    setIsExportModalOpen(true);
  };

  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (initialSearchFocus && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [initialSearchFocus]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  // Filter tracks
  let filtered = musicTracks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.album.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFormat =
      selectedFormat === 'all' || t.format.toLowerCase() === selectedFormat.toLowerCase();

    return matchesSearch && matchesFormat;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
    if (sortBy === 'added') return b.addedAt - a.addedAt;
    if (sortBy === 'duration') return b.duration - a.duration;
    if (sortBy === 'plays') return (b.playCount || 0) - (a.playCount || 0);
    return a.title.localeCompare(b.title);
  });

  const formatDuration = (secs: number) => {
    if (!secs || isNaN(secs) || secs <= 0) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSaveTrackToPC = async (track: Track) => {
    try {
      const blob = await getAudioBlob(track.id);
      if (blob) {
        await saveAudioToPC(blob, `${track.artist} - ${track.title}`, track.format, true);
      } else {
        const resp = await fetch(track.url);
        const fetchedBlob = await resp.blob();
        await saveAudioToPC(fetchedBlob, `${track.artist} - ${track.title}`, track.format, true);
      }
    } catch (err) {
      console.error('Failed to save to PC:', err);
    }
  };

  // Multi-selection helpers
  const handleToggleSelectTrack = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedTrackIds.size === filtered.length && filtered.length > 0) {
      setSelectedTrackIds(new Set());
    } else {
      setSelectedTrackIds(new Set(filtered.map((t) => t.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedTrackIds(new Set());
    setIsSelectionMode(false);
  };

  const renderRowIndex = (track: Track, idx: number, isSelected: boolean, isCurrentTrack: boolean) => {
    if (isSelectionMode) {
      return (
        <button
          type="button"
          onClick={(e) => handleToggleSelectTrack(track.id, e)}
          className="p-0.5 hover:text-white transition-colors"
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-emerald-400" />
          ) : (
            <Square className="w-4 h-4 text-neutral-500" />
          )}
        </button>
      );
    }

    if (isCurrentTrack) {
      return (
        <div className="flex items-center justify-center">
          {isPlaying ? (
            <span className="flex items-end justify-center gap-0.5 h-3.5 w-3.5 mx-auto" title="En cours de lecture">
              <span className="w-1 rounded-full animate-pulse h-2 bg-current" />
              <span className="w-1 rounded-full animate-bounce h-3.5 bg-current" />
              <span className="w-1 rounded-full animate-pulse h-2.5 bg-current" />
            </span>
          ) : (
            <span title="En pause" className="inline-flex">
              <Play className="w-3.5 h-3.5 fill-current mx-auto opacity-90" />
            </span>
          )}
        </div>
      );
    }

    return (
      <>
        <span className="group-hover:hidden">{idx + 1}</span>
        <Play className="w-3.5 h-3.5 fill-current hidden group-hover:inline mx-auto" />
      </>
    );
  };

  // Play All & Shuffle handlers for library
  const handlePlayAllTracks = (shuffle: boolean) => {
    const listToPlay = filtered.length > 0 ? filtered : musicTracks;
    if (listToPlay.length === 0) return;
    if (onPlayAll) {
      onPlayAll(listToPlay, shuffle);
    } else {
      const q = shuffle ? [...listToPlay].sort(() => Math.random() - 0.5) : [...listToPlay];
      onPlayTrack(q[0], q);
    }
  };

  // Delete handlers
  const handleConfirmDeleteSingle = () => {
    if (!trackToDelete) return;
    const title = trackToDelete.title;
    const id = trackToDelete.id;

    if (onDeleteTrack) {
      onDeleteTrack(id);
    } else if (onDeleteTracks) {
      onDeleteTracks([id]);
    }

    // Clean from selected if present
    setSelectedTrackIds((prev) => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      return prev;
    });

    setTrackToDelete(null);
    setNotification({
      message: `"${title}" a été supprimé de votre bibliothèque`,
      type: 'success',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleConfirmDeleteBulk = () => {
    const ids: string[] = Array.from(selectedTrackIds.values());
    if (ids.length === 0) return;

    if (onDeleteTracks) {
      onDeleteTracks(ids);
    } else if (onDeleteTrack) {
      ids.forEach((id: string) => onDeleteTrack(id));
    }

    const count = ids.length;
    setSelectedTrackIds(new Set());
    setIsSelectionMode(false);
    setIsBulkDeleteModalOpen(false);

    setNotification({
      message: `${count} morceau${count > 1 ? 'x' : ''} supprimé${count > 1 ? 's' : ''} de votre bibliothèque`,
      type: 'success',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const [isScanningPc, setIsScanningPc] = useState(false);

  const handleScanPc = async () => {
    if (isScanningPc) return;
    setIsScanningPc(true);
    try {
      const newlyDiscovered = await backgroundScanner.runScan(false);
      if (newlyDiscovered && newlyDiscovered.length > 0) {
        setNotification({
          message: `${newlyDiscovered.length} nouveau${newlyDiscovered.length > 1 ? 'x' : ''} morceau${newlyDiscovered.length > 1 ? 'x' : ''} indexé${newlyDiscovered.length > 1 ? 's' : ''} sur le PC !`,
          type: 'success',
        });
      } else {
        setNotification({
          message: 'Bibliothèque locale synchronisée (dossiers PC analysés)',
          type: 'success',
        });
      }
    } catch {
      setNotification({
        message: 'Erreur lors de l’indexation des fichiers musicaux',
        type: 'error',
      });
    } finally {
      setIsScanningPc(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleAddCustomFolder = async () => {
    if (window.electronAPI?.selectMusicFolder) {
      try {
        const folder = await window.electronAPI.selectMusicFolder();
        if (folder) {
          setIsScanningPc(true);
          const resp = await fetch('/api/library/add-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath: folder }),
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.success && Array.isArray(data.tracks)) {
              if (onImportFiles) {
                onImportFiles(data.tracks);
              }
              setNotification({
                message: `${data.tracks.length} morceau${data.tracks.length > 1 ? 'x' : ''} indexé${data.tracks.length > 1 ? 's' : ''} depuis ${folder}`,
                type: 'success',
              });
            }
          }
        }
      } catch (err) {
        console.error('Add folder error:', err);
      } finally {
        setIsScanningPc(false);
        setTimeout(() => setNotification(null), 4000);
      }
    }
  };

  const isAllFilteredSelected = filtered.length > 0 && selectedTrackIds.size === filtered.length;

  return (
    <div
      id="library-view"
      className="p-6 md:p-8 flex flex-col gap-6 select-none w-full relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-3">
          <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold">{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="ml-2 text-neutral-400 hover:text-white p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Drag & drop overlay indicator */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-emerald-950/80 border-4 border-dashed border-emerald-400 flex flex-col items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
          <FolderUp className="w-16 h-16 text-emerald-300 animate-bounce mb-4" />
          <h3 className="text-2xl font-extrabold text-white">Déposez vos fichiers musicaux ici</h3>
          <p className="text-emerald-200 text-sm mt-1">
            Compatible MP3, FLAC, WAV, OGG, AAC, M4A, Opus. Importation instantanée dans le cache hors-ligne PC.
          </p>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 shadow-sm flex-shrink-0">
            <Music className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5 flex-wrap">
              <span>{t.libraryTitle}</span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                {musicTracks.length} {musicTracks.length > 1 ? (settings?.language === 'fr' ? 'morceaux' : 'tracks') : (settings?.language === 'fr' ? 'morceau' : 'track')}
              </span>
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              {t.librarySubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Bouton rapide: Scanner le PC */}
          <button
            type="button"
            id="library-scan-pc-btn"
            onClick={handleScanPc}
            disabled={isScanningPc}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-500/30 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-100 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Analyser le PC à la recherche de fichiers audio (Musique, OneDrive, Téléchargements)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanningPc ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
            <span>{isScanningPc ? t.scanningPc : t.scanPcBtn}</span>
          </button>

          {/* Menu déroulant Actions de la Bibliothèque */}
          <div className="relative">
            <button
              type="button"
              id="library-actions-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsHeaderMenuOpen(!isHeaderMenuOpen);
              }}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border border-neutral-700/80 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 hover:text-white transition-all shadow-xs cursor-pointer"
              title={t.actionsMenu}
            >
              <span>{t.actionsMenu}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isHeaderMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isHeaderMenuOpen && (
              <div
                className="absolute right-0 top-12 z-40 w-64 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 text-left animate-in fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    handleAddCustomFolder();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 text-cyan-300 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4 text-cyan-400" />
                  <span>Ajouter un dossier musical...</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    handleScanPc();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 text-emerald-300 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  <span>Resynchroniser tout le PC</span>
                </button>

                <div className="h-px bg-neutral-800 my-0.5" />
                {musicTracks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      handleOpenExportAll();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 text-emerald-400 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FolderDown className="w-4 h-4 text-emerald-400" />
                    <span>Exporter sur PC ({musicTracks.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    setIsSelectionMode(!isSelectionMode);
                    if (isSelectionMode) setSelectedTrackIds(new Set());
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 text-neutral-200 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4 text-neutral-400" />
                  <span>{isSelectionMode ? 'Quitter la sélection' : 'Mode sélection multiple'}</span>
                </button>

                {musicTracks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      handlePlayAllTracks(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 text-neutral-200 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Shuffle className="w-4 h-4 text-amber-400" />
                    <span>Tout lire en aléatoire</span>
                  </button>
                )}

                <div className="h-px bg-neutral-800 my-0.5" />

                {onOpenDeduplicator && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      onOpenDeduplicator();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 text-amber-300 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-amber-400" />
                    <span>Détecteur de doublons...</span>
                  </button>
                )}

                {onOpenMerger && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      onOpenMerger();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 text-indigo-300 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Assembler & Fusionner pistes...</span>
                  </button>
                )}

                {onOpenStats && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      onOpenStats();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 text-teal-300 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <BarChart3 className="w-4 h-4 text-teal-400" />
                    <span>Statistiques d'écoute...</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Selection Action Banner */}
      {(selectedTrackIds.size > 0 || isSelectionMode) && (
        <div className="flex items-center justify-between gap-4 p-3 px-4 bg-neutral-900 border border-neutral-800 rounded-xl text-xs shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="flex items-center gap-1.5 font-medium text-neutral-300 hover:text-white transition-colors"
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="w-4 h-4 text-emerald-400" />
              ) : (
                <Square className="w-4 h-4 text-neutral-500" />
              )}
              <span>{isAllFilteredSelected ? 'Tout désélectionner' : `Tout sélectionner (${filtered.length})`}</span>
            </button>
            <span className="text-neutral-600">|</span>
            <span className="font-semibold text-white">
              {selectedTrackIds.size} morceau{selectedTrackIds.size > 1 ? 'x' : ''} sélectionné{selectedTrackIds.size > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedTrackIds.size > 0 && (
              <>
                <button
                  type="button"
                  id="lib-bulk-export-btn"
                  onClick={handleOpenExportBulk}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Exporter les morceaux sélectionnés sur votre PC avec choix du format"
                >
                  <FolderDown className="w-3.5 h-3.5" />
                  <span>Exporter ({selectedTrackIds.size})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const selectedTracks = musicTracks.filter((t) => selectedTrackIds.has(t.id));
                    selectedTracks.forEach((t) => onAddToQueue(t));
                    setNotification({
                      message: `${selectedTracks.length} morceau(x) ajouté(s) à la file d'attente`,
                      type: 'info',
                    });
                    setTimeout(() => setNotification(null), 3000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium flex items-center gap-1.5 transition-colors"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>Ajouter à la file ({selectedTrackIds.size})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Supprimer les morceaux sélectionnés"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer ({selectedTrackIds.size})</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search, View Mode Switcher & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, artiste, album..."
            className="w-full pl-10 pr-4 py-2 bg-neutral-900/80 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {/* Choix du mode de vue : Liste ou Grille (inséré à l'emplacement exact) */}
          <div className="flex items-center gap-1 bg-neutral-900/60 p-1 rounded-xl border border-neutral-800/80 flex-shrink-0">
            <button
              type="button"
              id="library-view-list-btn"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Vue Liste"
            >
              <List className="w-3.5 h-3.5" />
              <span>Liste</span>
            </button>
            <button
              type="button"
              id="library-view-grid-btn"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Vue Grille"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grille</span>
            </button>
          </div>

          {/* Format Chips */}
          <div className="flex items-center gap-1 bg-neutral-900/60 p-1 rounded-xl border border-neutral-800/80 flex-shrink-0">
            {['all', 'flac', 'wav', 'mp3', 'ogg', 'm4a'].map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setSelectedFormat(fmt)}
                className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg uppercase transition-colors cursor-pointer ${
                  selectedFormat === fmt
                    ? 'bg-neutral-800 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {fmt === 'all' ? 'Tous' : fmt}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-neutral-900/80 border border-neutral-800 text-neutral-300 text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer flex-shrink-0"
          >
            <option value="title">Trier : Titre (A-Z)</option>
            <option value="artist">Trier : Artiste</option>
            <option value="added">Trier : Ajout récent</option>
            <option value="plays">Trier : Les plus écoutés</option>
            <option value="duration">Trier : Durée</option>
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-neutral-800 rounded-2xl">
          <Music className="w-12 h-12 text-neutral-600 mb-3" />
          <h3 className="text-base font-semibold text-neutral-300 mb-1">Aucun morceau trouvé</h3>
          <p className="text-xs text-neutral-500 max-w-sm">
            Glissez-déposez des fichiers audio depuis votre ordinateur ou téléchargez des musiques depuis YouTube.
          </p>
        </div>
      )}

      {/* Tracks Table (Vue Liste) */}
      {filtered.length > 0 && viewMode === 'list' && (
        <div className="w-full overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-950/20">
          <table className="w-full table-fixed text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-2 sm:px-3 w-10 text-center">
                  {isSelectionMode ? (
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="p-1 hover:text-white"
                      title={isAllFilteredSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                    >
                      {isAllFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-500" />
                      )}
                    </button>
                  ) : (
                    t.colIndex
                  )}
                </th>
                <th className="py-3 px-2 sm:px-3">{t.colTitleArtist}</th>
                <th className="py-3 px-2 sm:px-3 hidden md:table-cell w-36 lg:w-48">{t.colAlbum}</th>
                <th className="py-3 px-2 sm:px-3 hidden sm:table-cell w-16 sm:w-20">{t.colFormat}</th>
                <th className="py-3 px-2 w-14 text-center">{t.colFavorite}</th>
                <th className="py-3 px-2 w-20 text-center">
                  <Clock className="w-3.5 h-3.5 inline" />
                </th>
                <th className="py-3 px-3 w-24 text-center pr-4">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/40">
              {filtered.map((track, idx) => {
                const isMenuOpen = menuAnchor?.track.id === track.id;
                const isSelected = selectedTrackIds.has(track.id);
                const isCurrentTrack = currentTrackId === track.id;

                return (
                  <tr
                    key={track.id}
                    className={`group transition-all cursor-pointer relative track-row-optimized ${
                      isSelected
                        ? 'bg-neutral-800/60'
                        : isCurrentTrack
                        ? `${ACCENT_BORDER_L[accent]} shadow-sm`
                        : 'hover:bg-neutral-900/60 border-l-4 border-l-transparent'
                    }`}
                    onClick={() => {
                      if (isSelectionMode) {
                        handleToggleSelectTrack(track.id, { stopPropagation: () => {} } as any);
                      } else {
                        onPlayTrack(track, filtered);
                      }
                    }}
                  >
                    <td
                      className={`py-2.5 px-2 sm:px-3 text-center font-mono ${
                        isCurrentTrack ? ACCENT_TEXT[accent] : 'text-neutral-500 group-hover:text-white'
                      }`}
                      onClick={(e) => {
                        if (isSelectionMode) {
                          handleToggleSelectTrack(track.id, e);
                        }
                      }}
                    >
                      {renderRowIndex(track, idx, isSelected, isCurrentTrack)}
                    </td>

                    <td className="py-2.5 px-2 sm:px-3 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800">
                          <img
                            src={
                              track.coverUrl ||
                              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
                            }
                            alt={track.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                          {isCurrentTrack && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                              <Volume2 className={`w-4 h-4 ${ACCENT_TEXT[accent]}`} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`font-semibold truncate transition-colors ${
                            isCurrentTrack ? `${ACCENT_TEXT[accent]} font-bold` : 'text-neutral-200 group-hover:text-white'
                          }`}>
                            {track.title}
                          </div>
                          <div className={`truncate text-[11px] ${isCurrentTrack ? 'text-neutral-300 font-medium' : 'text-neutral-400'}`}>
                            {track.artist}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-2 sm:px-3 text-neutral-400 hidden md:table-cell truncate">
                      {track.album || '—'}
                    </td>

                    <td className="py-2.5 px-2 sm:px-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded font-semibold ${
                          track.isVideo
                            ? 'bg-sky-950 text-sky-300 border border-sky-500/30'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}>
                          {track.isVideo ? `🎥 ${track.format}` : track.format}
                        </span>
                        {track.isCachedOffline && (
                          <span
                            className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-medium"
                            title="Stocké dans le cache hors-ligne"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>

                    <td
                      className="py-2.5 px-2 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(track.id);
                      }}
                    >
                      <button
                        type="button"
                        className={`p-1.5 rounded-full hover:scale-110 transition-transform ${
                          track.isFavorite ? 'text-rose-500 fill-current' : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                        title={track.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <Heart className={`w-4 h-4 ${track.isFavorite ? 'fill-rose-500' : ''}`} />
                      </button>
                    </td>

                    <td className="py-2.5 px-2 text-center font-mono text-neutral-400">
                      {formatDuration(track.duration)}
                    </td>

                    <td className="py-2.5 px-3 text-center pr-4">
                      {/* Bouton d'action unique avec menu déroulant dynamique */}
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => handleToggleTrackMenu(e, track)}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            isMenuOpen
                              ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700'
                              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
                          }`}
                          title={t.colActions}
                          aria-label={t.colActions}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tracks Grid (Vue Grille) */}
      {filtered.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((track) => {
            const isMenuOpen = menuAnchor?.track.id === track.id;
            const isSelected = selectedTrackIds.has(track.id);
            const isCurrentTrack = currentTrackId === track.id;

            return (
              <div
                key={track.id}
                className={`group relative bg-neutral-900/70 hover:bg-neutral-900 border rounded-2xl p-3 flex flex-col gap-2.5 transition-all cursor-pointer shadow-sm track-card-optimized ${
                  isSelected
                    ? 'border-emerald-500 bg-neutral-800/80 shadow-md ring-1 ring-emerald-500/30'
                    : isCurrentTrack
                    ? 'border-emerald-500/80 bg-neutral-800/70 shadow-md ring-1 ring-emerald-500/20'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
                onClick={() => {
                  if (isSelectionMode) {
                    handleToggleSelectTrack(track.id, { stopPropagation: () => {} } as any);
                  } else {
                    onPlayTrack(track, filtered);
                  }
                }}
              >
                {/* Cover & Overlay Controls */}
                <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-800 flex items-center justify-center">
                  <img
                    src={
                      track.coverUrl ||
                      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
                    }
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />

                  {/* Play button / Audio waveform pulse overlay */}
                  {isCurrentTrack ? (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                      {isPlaying ? (
                        <div className={`p-3 rounded-full ${ACCENT_BTN[accent]} shadow-lg flex items-center justify-center`}>
                          <span className="flex items-end justify-center gap-0.5 h-4 w-4">
                            <span className="w-1 rounded-full animate-pulse h-2 bg-current" />
                            <span className="w-1 rounded-full animate-bounce h-4 bg-current" />
                            <span className="w-1 rounded-full animate-pulse h-3 bg-current" />
                          </span>
                        </div>
                      ) : (
                        <div className={`p-3 rounded-full ${ACCENT_BTN[accent]} shadow-lg flex items-center justify-center`}>
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(track, filtered);
                      }}
                      className={`absolute right-2.5 bottom-2.5 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 cursor-pointer ${ACCENT_BTN[accent]}`}
                      title="Lire ce morceau"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  )}

                  {/* Multi-Selection Checkbox */}
                  {isSelectionMode && (
                    <div
                      className="absolute top-2 left-2 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelectTrack(track.id, e);
                      }}
                    >
                      <button
                        type="button"
                        className="p-1 rounded-lg bg-black/70 backdrop-blur-sm hover:bg-black/90 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-300" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Favorite Button on Card */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(track.id);
                    }}
                    className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-sm transition-transform hover:scale-110 cursor-pointer ${
                      track.isFavorite ? 'text-rose-500 fill-current opacity-100' : 'text-white opacity-0 group-hover:opacity-100'
                    }`}
                    title={track.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${track.isFavorite ? 'fill-rose-500' : ''}`} />
                  </button>

                  {/* Format badge on bottom left */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 pointer-events-none">
                    <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded backdrop-blur-xs font-semibold ${
                      track.isVideo ? 'bg-sky-950/80 text-sky-300 border border-sky-500/30' : 'bg-black/70 text-neutral-200'
                    }`}>
                      {track.isVideo ? `🎥 ${track.format}` : track.format}
                    </span>
                    {track.isCachedOffline && (
                      <span className="p-0.5 rounded-full bg-black/70 text-emerald-400" title="Stocké dans le cache hors-ligne">
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata & Actions */}
                <div className="flex items-start justify-between gap-1.5 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div
                      className={`font-semibold text-xs truncate transition-colors ${
                        isCurrentTrack ? `${ACCENT_TEXT[accent]} font-bold` : 'text-neutral-100 group-hover:text-white'
                      }`}
                      title={track.title}
                    >
                      {track.title}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5" title={track.artist}>
                      {track.artist}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono mt-1">
                      <span className="truncate max-w-[90px]">{track.album || 'Single'}</span>
                      <span>{formatDuration(track.duration)}</span>
                    </div>
                  </div>

                  {/* Context Menu Button */}
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleToggleTrackMenu(e, track)}
                      className={`p-1 rounded-lg transition-all cursor-pointer ${
                        isMenuOpen
                          ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                      title="Actions"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Track Action Context Menu with Dynamic Up/Down Positioning */}
      {menuAnchor && (
        <div
          className="fixed z-[100] w-60 bg-neutral-900/95 backdrop-blur-xl border border-neutral-800/80 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 text-left animate-in fade-in max-h-[min(380px,calc(100vh-120px))] overflow-y-auto"
          style={{
            top: menuAnchor.top !== undefined ? `${menuAnchor.top}px` : undefined,
            bottom: menuAnchor.bottom !== undefined ? `${menuAnchor.bottom}px` : undefined,
            right: `${menuAnchor.right}px`,
            boxShadow: '0 20px 40px -6px rgba(0, 0, 0, 0.8), 0 8px 16px -4px rgba(0, 0, 0, 0.6)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Écoute */}
          <button
            type="button"
            onClick={() => {
              onAddToQueue(menuAnchor.track);
              setMenuAnchor(null);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 text-neutral-200 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <ListPlus className="w-4 h-4 text-neutral-400" />
            <span>Ajouter à la file d'attente</span>
          </button>

          {/* Ajouter à une playlist */}
          <button
            type="button"
            onClick={() => {
              const t = menuAnchor.track;
              setMenuAnchor(null);
              setAddToPlaylistTrack(t);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 text-neutral-200 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-purple-400" />
            <span>Ajouter à une playlist</span>
          </button>

          {/* Studio & Découpe */}
          {onOpenTrimmer && (
            <button
              type="button"
              onClick={() => {
                const t = menuAnchor.track;
                setMenuAnchor(null);
                onOpenTrimmer(t);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-sky-950/40 text-sky-400 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Scissors className="w-4 h-4 text-sky-400" />
              <span>Découper / Éditer l'audio...</span>
            </button>
          )}

          {/* Tags & Pochette */}
          {onEditTrackTags && (
            <button
              type="button"
              onClick={() => {
                const t = menuAnchor.track;
                setMenuAnchor(null);
                onEditTrackTags(t);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 text-cyan-300 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Tag className="w-4 h-4 text-cyan-400" />
              <span>Modifier tags & pochette...</span>
            </button>
          )}

          <div className="h-px bg-neutral-800 my-0.5" />

          {/* Exportation */}
          <button
            type="button"
            onClick={() => {
              const t = menuAnchor.track;
              setMenuAnchor(null);
              handleOpenExportSingle(t);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-emerald-950/40 text-emerald-400 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <FolderDown className="w-4 h-4 text-emerald-400" />
            <span>Exporter sur PC (Choix format)...</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const t = menuAnchor.track;
              setMenuAnchor(null);
              handleSaveTrackToPC(t);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 text-neutral-300 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-neutral-400" />
            <span>Téléchargement direct (.wav)</span>
          </button>

          {/* Suppression */}
          <div className="h-px bg-neutral-800 my-0.5" />
          <button
            type="button"
            onClick={() => {
              const t = menuAnchor.track;
              setMenuAnchor(null);
              setTrackToDelete(t);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-red-950/60 text-red-400 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Supprimer de la bibliothèque</span>
          </button>
        </div>
      )}

      {/* Confirmation Modal - Single Track Deletion */}
      {trackToDelete && (
        <div
          id="delete-track-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setTrackToDelete(null)}
        >
          <div
            id="delete-track-modal-card"
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Supprimer le morceau</h3>
                <p className="text-xs text-neutral-400">Confirmation de suppression</p>
              </div>
            </div>

            {/* Track Info Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <img
                src={
                  trackToDelete.coverUrl ||
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
                }
                alt={trackToDelete.title}
                className="w-12 h-12 rounded-lg object-cover bg-neutral-800 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm text-white truncate">{trackToDelete.title}</h4>
                <p className="text-xs text-neutral-400 truncate">{trackToDelete.artist}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                    {trackToDelete.format}
                  </span>
                  <span className="text-xs text-neutral-500">{formatDuration(trackToDelete.duration)}</span>
                </div>
              </div>
            </div>

            {/* Warning description */}
            <div className="flex items-start gap-2.5 text-xs text-neutral-400 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/60">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                Ce morceau sera retiré de votre bibliothèque et de vos playlists. Les données audio associées dans votre cache local seront également libérées.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setTrackToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 flex items-center gap-1.5 transition-colors shadow-sm shadow-red-950"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer définitivement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Bulk Deletion */}
      {isBulkDeleteModalOpen && (
        <div
          id="bulk-delete-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsBulkDeleteModalOpen(false)}
        >
          <div
            id="bulk-delete-modal-card"
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  Supprimer {selectedTrackIds.size} morceau{selectedTrackIds.size > 1 ? 'x' : ''}
                </h3>
                <p className="text-xs text-neutral-400">Suppression groupée de la bibliothèque</p>
              </div>
            </div>

            {/* Selected tracks summary */}
            <div className="max-h-40 overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 divide-y divide-neutral-900">
              {musicTracks
                .filter((t) => selectedTrackIds.has(t.id))
                .map((t) => (
                  <div key={t.id} className="py-1.5 px-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-white truncate max-w-[240px]">{t.title}</span>
                    <span className="text-neutral-500 text-[11px] truncate max-w-[120px]">{t.artist}</span>
                  </div>
                ))}
            </div>

            {/* Warning description */}
            <div className="flex items-start gap-2.5 text-xs text-neutral-400 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/60">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                Ces {selectedTrackIds.size} morceaux seront définitivement retirés de votre bibliothèque et le stockage audio local correspondant sera libéré.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBulk}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 flex items-center gap-1.5 transition-colors shadow-sm shadow-red-950"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer ({selectedTrackIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export to PC Modal with format selection */}
      <ExportTracksModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        tracks={tracksToExport}
        accent={accent}
        defaultZipName={exportZipName}
      />

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        isOpen={!!addToPlaylistTrack}
        onClose={() => setAddToPlaylistTrack(null)}
        track={addToPlaylistTrack}
        playlists={playlists}
        onAddToPlaylist={onAddToPlaylist}
        onRemoveFromPlaylist={onRemoveFromPlaylist}
        onCreatePlaylist={onCreatePlaylist}
        accent={accent}
      />
    </div>
  );
};


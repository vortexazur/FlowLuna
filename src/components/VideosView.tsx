import React, { useState, useRef, useCallback } from 'react';
import {
  Film,
  Play,
  Upload,
  Maximize2,
  Trash2,
  Scissors,
  CheckSquare,
  Square,
  ListPlus,
  X,
  Check,
} from 'lucide-react';
import { Track, AccentColor } from '../types';

interface VideosViewProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track, trackList?: Track[]) => void;
  onOpenVideoTheater: () => void;
  onImportFiles: (files: FileList | File[] | Track[]) => void;
  onDeleteTrack?: (track: Track) => void;
  onDeleteTracks?: (trackIds: string[]) => void;
  onAddTracksToQueue?: (tracks: Track[]) => void;
  onPlayTracksBatch?: (tracks: Track[], startIndex?: number) => void;
  onOpenTrimmer?: (track: Track) => void;
  accent: AccentColor;
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

export const VideosView: React.FC<VideosViewProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onOpenVideoTheater,
  onImportFiles,
  onDeleteTrack,
  onDeleteTracks,
  onAddTracksToQueue,
  onPlayTracksBatch,
  onOpenTrimmer,
  accent,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [feedbackNotification, setFeedbackNotification] = useState<string | null>(null);
  const lastSelectedIndexRef = useRef<number | null>(null);

  const videoTracks = tracks.filter((t) => t.isVideo);
  const currentVideo = videoTracks.find((t) => t.id === currentTrackId);
  const isAllSelected = videoTracks.length > 0 && selectedTrackIds.size === videoTracks.length;

  const showNotification = (msg: string) => {
    setFeedbackNotification(msg);
    setTimeout(() => setFeedbackNotification(null), 3000);
  };

  const formatDuration = (secs: number) => {
    const total = Math.max(0, Math.floor(secs));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(e.target.files);
    }
    e.target.value = '';
  };

  // Open videos with native Windows file dialog if available, else HTML input
  const handleImportVideosClick = async () => {
    if (window.electronAPI?.selectMusicFiles) {
      try {
        const filePaths = await window.electronAPI.selectMusicFiles();
        if (filePaths && filePaths.length > 0) {
          const resp = await fetch('/api/library/add-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePaths }),
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.success && Array.isArray(data.tracks) && data.tracks.length > 0) {
              onImportFiles(data.tracks);
              return;
            }
          }
        }
        return;
      } catch (err) {
        console.warn('Native video file picker fallback:', err);
      }
    }
    fileInputRef.current?.click();
  };

  // Toggle selection for a specific track, supporting Shift-Click range selection (Screenbox pattern)
  const toggleTrackSelection = useCallback(
    (trackId: string, index: number, isShift: boolean = false) => {
      setSelectedTrackIds((prev) => {
        const next = new Set(prev);
        if (isShift && lastSelectedIndexRef.current !== null && lastSelectedIndexRef.current !== index) {
          const start = Math.min(lastSelectedIndexRef.current, index);
          const end = Math.max(lastSelectedIndexRef.current, index);
          for (let i = start; i <= end; i++) {
            if (videoTracks[i]) {
              next.add(videoTracks[i].id);
            }
          }
        } else {
          if (next.has(trackId)) {
            next.delete(trackId);
          } else {
            next.add(trackId);
          }
        }
        return next;
      });
      lastSelectedIndexRef.current = index;
    },
    [videoTracks]
  );

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTrackIds(new Set());
    } else {
      setSelectedTrackIds(new Set(videoTracks.map((t) => t.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedTrackIds(new Set());
    setIsSelectionMode(false);
    lastSelectedIndexRef.current = null;
  };

  // Batch actions (Screenbox Selection Bar pattern)
  const handlePlaySelection = () => {
    const selectedVideos = videoTracks.filter((t) => selectedTrackIds.has(t.id));
    if (selectedVideos.length === 0) return;

    if (onPlayTracksBatch) {
      onPlayTracksBatch(selectedVideos, 0);
    } else {
      onPlayTrack(selectedVideos[0], selectedVideos);
    }
    showNotification(`${selectedVideos.length} vidéo(s) lancée(s) en lecture`);
  };

  const handleAddSelectionToQueue = () => {
    const selectedVideos = videoTracks.filter((t) => selectedTrackIds.has(t.id));
    if (selectedVideos.length === 0) return;

    if (onAddTracksToQueue) {
      onAddTracksToQueue(selectedVideos);
    }
    showNotification(`${selectedVideos.length} vidéo(s) ajoutée(s) à la file d'attente`);
    handleClearSelection();
  };

  const handleDeleteSelection = () => {
    const ids = Array.from(selectedTrackIds);
    if (ids.length === 0) return;

    if (onDeleteTracks) {
      onDeleteTracks(ids);
    } else if (onDeleteTrack) {
      const selectedVideos = videoTracks.filter((t) => selectedTrackIds.has(t.id));
      selectedVideos.forEach((v) => onDeleteTrack(v));
    }
    showNotification(`${ids.length} vidéo(s) supprimée(s)`);
    handleClearSelection();
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      id="videos-view"
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 h-full overflow-y-auto p-6 md:p-8 flex flex-col gap-6 select-none"
    >
      {/* Drag & Drop Visual Dropzone Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-neutral-950/80 backdrop-blur-md border-4 border-dashed border-sky-400 m-4 rounded-3xl flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
          <div className="p-4 rounded-3xl bg-sky-500/20 text-sky-400 mb-4 animate-bounce">
            <Upload className="w-12 h-12" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Déposez vos fichiers vidéo ici</h2>
          <p className="text-xs text-neutral-300">
            Toutes les vidéos sélectionnées seront importées et ajoutées à la file de lecture en un seul lot.
          </p>
        </div>
      )}

      {/* Hidden file input for videos */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,.mp4,.mkv,.webm,.mov,.avi,.m4v"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Toast Notification */}
      {feedbackNotification && (
        <div className="fixed top-14 right-6 z-50 px-4 py-2.5 rounded-xl bg-neutral-900 border border-sky-500/40 text-sky-300 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in slide-in-from-top-2 pointer-events-none">
          <Check className="w-4 h-4 text-sky-400" />
          <span>{feedbackNotification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-white/10 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 dark:border-sky-500/30 text-sky-600 dark:text-sky-400 shadow-sm backdrop-blur-md">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>Lecteur Vidéo</span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 dark:border-sky-500/30 text-sky-700 dark:text-sky-400">
                {videoTracks.length} {videoTracks.length > 1 ? 'vidéos' : 'vidéo'}
              </span>
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 font-medium">
              Lecture fluide MP4, WebM, MKV, MOV avec son Hi-Fi et gestion de sélection par lot
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {videoTracks.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsSelectionMode((prev) => !prev);
                if (isSelectionMode) {
                  setSelectedTrackIds(new Set());
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isSelectionMode || selectedTrackIds.size > 0
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-sm'
                  : 'bg-neutral-900/60 hover:bg-neutral-800 border-neutral-700 text-neutral-200'
              }`}
              title="Activer la sélection multiple pour lire, ajouter à la file ou supprimer par lot"
            >
              <CheckSquare className="w-4 h-4" />
              <span>{isSelectionMode ? 'Quitter la sélection' : 'Mode sélection'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleImportVideosClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-lg hover:shadow-sky-500/20 active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Importer des vidéos...</span>
          </button>
        </div>
      </div>

      {/* Multi-Selection Action Banner (Screenbox SelectionBarControl) */}
      {(isSelectionMode || selectedTrackIds.size > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 px-4 bg-neutral-900/95 border border-sky-500/30 rounded-2xl text-xs shadow-xl animate-in fade-in backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-2 font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-sky-400" />
              ) : (
                <Square className="w-4 h-4 text-neutral-500" />
              )}
              <span>{isAllSelected ? 'Tout désélectionner' : `Tout sélectionner (${videoTracks.length})`}</span>
            </button>
            <span className="text-neutral-600">|</span>
            <span className="font-semibold text-white">
              {selectedTrackIds.size} vidéo{selectedTrackIds.size > 1 ? 's' : ''} sélectionnée{selectedTrackIds.size > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedTrackIds.size > 0 && (
              <>
                <button
                  type="button"
                  onClick={handlePlaySelection}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Lire immédiatement toutes les vidéos sélectionnées dans la file d'attente"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Lire la sélection ({selectedTrackIds.size})</span>
                </button>

                {onAddTracksToQueue && (
                  <button
                    type="button"
                    onClick={handleAddSelectionToQueue}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Ajouter l'ensemble des vidéos sélectionnées à la fin de la file d'attente"
                  >
                    <ListPlus className="w-3.5 h-3.5 text-sky-400" />
                    <span>Ajouter à la file ({selectedTrackIds.size})</span>
                  </button>
                )}

                {(onDeleteTracks || onDeleteTrack) && (
                  <button
                    type="button"
                    onClick={handleDeleteSelection}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    title="Supprimer les vidéos sélectionnées"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer ({selectedTrackIds.size})</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Fermer la sélection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Currently Playing Banner (if a video is active) */}
      {currentVideo && (
        <div
          onClick={onOpenVideoTheater}
          className="relative rounded-2xl glass-card border border-sky-500/30 bg-sky-500/10 p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl overflow-hidden group backdrop-blur-xl cursor-pointer"
        >
          <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
            <div className="relative w-24 h-16 md:w-32 md:h-20 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
              <img
                src={currentVideo.coverUrl}
                alt={currentVideo.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-lg animate-pulse">
                  <Play className="w-4 h-4 fill-white translate-x-0.5" />
                </div>
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                En cours de lecture
              </span>
              <h3 className="text-neutral-900 dark:text-white font-bold text-sm md:text-base truncate mt-0.5">
                {currentVideo.title}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-300 truncate">
                {currentVideo.artist} • {formatDuration(currentVideo.duration)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenVideoTheater}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Ouvrir en mode Cinéma</span>
          </button>
        </div>
      )}

      {/* Videos List / Grid */}
      {videoTracks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-white/15 rounded-3xl glass-card my-auto">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-sky-400 mb-4 shadow-inner backdrop-blur-md">
            <Film className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-1.5">Aucune vidéo importée</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mb-6 leading-relaxed">
            Glissez-déposez vos fichiers vidéo (MP4, WebM, MKV, MOV, AVI) ou cliquez sur le bouton ci-dessous pour lancer la lecture par lot avec accélération et son Hi-Fi.
          </p>
          <button
            type="button"
            onClick={handleImportVideosClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Choisir un fichier vidéo sur votre PC</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {videoTracks.map((track, index) => {
            const isCurrent = currentTrackId === track.id;
            const isSelected = selectedTrackIds.has(track.id);

            return (
              <div
                key={track.id}
                onClick={(e) => {
                  if (isSelectionMode || selectedTrackIds.size > 0) {
                    toggleTrackSelection(track.id, index, e.shiftKey);
                  } else {
                    onPlayTrack(track, videoTracks);
                  }
                }}
                className={`group relative rounded-2xl glass-card border transition-all duration-200 p-3 flex flex-col gap-3 cursor-pointer shadow-sm hover:shadow-xl ${
                  isSelected
                    ? 'border-sky-400 ring-2 ring-sky-500/50 bg-sky-500/20'
                    : isCurrent
                    ? 'border-sky-500/60 ring-2 ring-sky-500/40 bg-sky-500/15'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Video Thumbnail */}
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Multi-Selection Checkbox Toggle (Top-Left) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isSelectionMode && selectedTrackIds.size === 0) {
                        setIsSelectionMode(true);
                      }
                      toggleTrackSelection(track.id, index, e.shiftKey);
                    }}
                    className={`absolute top-2 left-2 z-20 p-1 rounded-lg backdrop-blur-md transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500 text-white ring-2 ring-white/50 opacity-100'
                        : isSelectionMode
                        ? 'bg-black/70 text-white/80 opacity-100 hover:bg-black/90'
                        : 'bg-black/60 text-white/70 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-black/80'
                    }`}
                    title={isSelected ? 'Désélectionner' : 'Sélectionner'}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  {/* Play Overlay (hidden in selection mode) */}
                  {!isSelectionMode && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                        <Play className="w-5 h-5 fill-current translate-x-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Top Badge: Format & Resolution (shifted if checkbox visible) */}
                  <div className={`absolute top-2 ${isSelectionMode || isSelected ? 'left-9' : 'left-9 group-hover:left-9 left-2'} transition-all flex items-center gap-1.5`}>
                    <span className="font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/75 text-sky-300 backdrop-blur-md border border-white/10">
                      {track.format}
                      {track.videoHeight ? ` ${track.videoHeight}p` : ''}
                    </span>
                  </div>

                  {/* Bottom Right: Duration */}
                  <div className="absolute bottom-2 right-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/80 text-white backdrop-blur-md border border-white/10">
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                </div>

                {/* Info & Options */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 group-hover:text-black dark:group-hover:text-white truncate">
                      {track.title}
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {track.artist}
                    </p>
                  </div>

                  {/* Individual actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {onAddTracksToQueue && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddTracksToQueue([track]);
                          showNotification('Vidéo ajoutée à la file');
                        }}
                        className="p-1 rounded-lg text-neutral-500 hover:text-sky-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Ajouter à la file d'attente"
                      >
                        <ListPlus className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onOpenTrimmer && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTrimmer(track);
                        }}
                        className="p-1 rounded-lg text-neutral-500 hover:text-emerald-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Découper la vidéo"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onDeleteTrack && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTrack(track);
                        }}
                        className="p-1 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Supprimer la vidéo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

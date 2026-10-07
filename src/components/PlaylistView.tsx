import React, { useState } from 'react';
import {
  Play,
  Shuffle,
  Download,
  Trash2,
  Clock,
  Music,
  Heart,
  CheckCircle2,
  MoreVertical,
  Plus,
  Edit2,
  FolderSync,
  Volume2,
  FolderDown,
  Palette,
  Pin,
  PinOff,
  Scissors,
  ChevronDown,
  ListPlus,
  Tag,
  FolderPlus,
} from 'lucide-react';
import { Playlist, Track, AccentColor } from '../types';
import { exportPlaylistToM3U } from '../services/backupService';
import { ExportTracksModal } from './ExportTracksModal';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { PlaylistIcon } from './PlaylistIcon';
import { EditPlaylistModal } from './EditPlaylistModal';

interface PlaylistViewProps {
  playlist: Playlist;
  tracks: Track[];
  onPlayTrack: (track: Track, queueList?: Track[]) => void;
  onPlayAll: (tracks: Track[], shuffle: boolean) => void;
  onToggleFavorite: (trackId: string) => void;
  onRemoveTrackFromPlaylist?: (playlistId: string, trackId: string) => void;
  onDeletePlaylist?: (playlistId: string) => void;
  onUpdatePlaylistTitle?: (playlistId: string, newTitle: string) => void;
  onUpdatePlaylist?: (playlist: Playlist) => void;
  accent: AccentColor;
  allTracks: Track[];
  currentTrackId?: string | null;
  isPlaying?: boolean;
  onOpenTrimmer?: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  onEditTrackTags?: (track: Track) => void;
  playlists?: Playlist[];
  onAddToPlaylist?: (playlistId: string, trackId: string) => void;
  onCreatePlaylist?: (title: string) => Promise<string | void> | void;
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

const ACCENT_SUBTLE_HOVER_BG: Record<AccentColor, string> = {
  emerald: 'hover:bg-emerald-950/40 text-emerald-400',
  violet: 'hover:bg-violet-950/40 text-violet-400',
  blue: 'hover:bg-blue-950/40 text-blue-400',
  amber: 'hover:bg-amber-950/40 text-amber-400',
  rose: 'hover:bg-rose-950/40 text-rose-400',
  cyan: 'hover:bg-cyan-950/40 text-cyan-400',
};

export const PlaylistView: React.FC<PlaylistViewProps> = ({
  playlist,
  tracks,
  onPlayTrack,
  onPlayAll,
  onToggleFavorite,
  onRemoveTrackFromPlaylist,
  onDeletePlaylist,
  onUpdatePlaylistTitle,
  onUpdatePlaylist,
  accent,
  allTracks,
  currentTrackId,
  isPlaying,
  onOpenTrimmer,
  onAddToQueue,
  onEditTrackTags,
  playlists = [],
  onAddToPlaylist,
  onCreatePlaylist,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(playlist.title);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{
    track: Track;
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // Close menus when clicking outside, scrolling or resizing
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

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [tracksToExport, setTracksToExport] = useState<Track[]>([]);
  const [exportZipName, setExportZipName] = useState<string>(playlist.title || 'Playlist');

  const handleOpenExportPlaylist = () => {
    if (tracks.length === 0) return;
    setTracksToExport(tracks);
    setExportZipName(`Playlist_${playlist.title.replace(/\s+/g, '_')}`);
    setIsExportModalOpen(true);
  };

  const handleOpenExportSingle = (track: Track) => {
    setTracksToExport([track]);
    setExportZipName(`${track.artist} - ${track.title}`);
    setIsExportModalOpen(true);
  };

  const totalDurationSeconds = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const totalMinutes = Math.floor(totalDurationSeconds / 60);

  const handleSaveTitle = (e: React.FormEvent) => {
    e.preventDefault();
    if (titleInput.trim() && onUpdatePlaylistTitle) {
      onUpdatePlaylistTitle(playlist.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

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

  return (
    <div id="playlist-detail-view" className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      {/* Header Banner */}
      <div id="playlist-header-banner" className="flex flex-col md:flex-row items-start md:items-end gap-6 bg-gradient-to-b from-neutral-900/80 to-transparent p-6 rounded-2xl border border-neutral-800/80 shadow-lg">
        {/* Cover with Icon and Customize Trigger */}
        <div
          onClick={() => {
            if (!playlist.isSmart && onUpdatePlaylist) {
              setIsEditModalOpen(true);
            }
          }}
          className={`relative group w-44 h-44 md:w-52 md:h-52 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 bg-neutral-800 border border-neutral-700/60 ${
            !playlist.isSmart && onUpdatePlaylist ? 'cursor-pointer' : ''
          }`}
          title={!playlist.isSmart && onUpdatePlaylist ? 'Cliquez pour changer l\'icône, la couleur ou l\'image' : ''}
        >
          {playlist.coverUrl ? (
            <img
              src={playlist.coverUrl}
              alt={playlist.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-900">
              <PlaylistIcon playlist={playlist} size="2xl" />
            </div>
          )}

          {/* Icon Badge Overlay in Bottom-Left */}
          <div className="absolute bottom-3 left-3 shadow-xl">
            <PlaylistIcon playlist={playlist} size="md" />
          </div>

          {/* Hover Edit Overlay */}
          {!playlist.isSmart && onUpdatePlaylist && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white">
              <Palette className={`w-6 h-6 ${ACCENT_TEXT[accent] || 'text-emerald-400'}`} />
              <span className="text-xs font-bold text-center px-2">Personnaliser l'icône & style</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <PlaylistIcon playlist={playlist} size="xs" />
            <span className="text-xs uppercase tracking-wider font-bold text-neutral-400">
              {playlist.id === 'playlist-favorites'
                ? 'Playlist'
                : playlist.isSmart
                ? 'Playlist Intelligente'
                : 'Playlist Personnalisée'}
            </span>
          </div>

          {isEditingTitle ? (
            <form onSubmit={handleSaveTitle} className="flex items-center gap-2">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                autoFocus
                className="text-2xl md:text-3xl font-extrabold bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1 text-white focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 text-white hover:bg-neutral-700"
              >
                Enregistrer
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight truncate">
                {playlist.title}
              </h1>
              {!playlist.isSmart && onUpdatePlaylistTitle && (
                <button
                  type="button"
                  onClick={() => {
                    setTitleInput(playlist.title);
                    setIsEditingTitle(true);
                  }}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  title="Renommer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <p className="text-sm text-neutral-300 line-clamp-2 max-w-xl">
            {playlist.description || 'Collection musicale haute fidélité pour une écoute sans distraction.'}
          </p>

          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-2 font-medium">
            <span>{tracks.length} morceaux</span>
            <span>•</span>
            <span>~{totalMinutes} minutes d'écoute</span>
            <span>•</span>
            <span className={`${ACCENT_TEXT[accent] || 'text-emerald-400'} flex items-center gap-1 font-semibold`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Prêt pour hors-ligne
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="playlist-play-all-btn"
            disabled={tracks.length === 0}
            onClick={() => onPlayAll(tracks, false)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md transition-transform hover:scale-102 active:scale-98 cursor-pointer ${
              tracks.length === 0 ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : ACCENT_BTN[accent]
            }`}
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            Tout Lire
          </button>

          <button
            type="button"
            id="playlist-shuffle-btn"
            disabled={tracks.length === 0}
            onClick={() => onPlayAll(tracks, true)}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Shuffle className="w-4 h-4" />
            Aléatoire
          </button>
        </div>

        {/* Menu déroulant unique pour les actions de la playlist */}
        <div className="relative">
          <button
            type="button"
            id="playlist-actions-menu-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsHeaderMenuOpen(!isHeaderMenuOpen);
            }}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border border-neutral-700/80 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 hover:text-white transition-all shadow-xs cursor-pointer"
            title="Options et actions de la playlist"
          >
            <span>Actions</span>
            <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isHeaderMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isHeaderMenuOpen && (
            <div
              className="absolute right-0 top-12 z-40 w-64 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 text-left animate-in fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              {!playlist.isSmart && onUpdatePlaylist && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      setIsEditModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 text-neutral-200 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Palette className={`w-4 h-4 ${ACCENT_TEXT[accent] || 'text-emerald-400'}`} />
                    <span>Personnaliser l'icône & style</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      onUpdatePlaylist({
                        ...playlist,
                        isPinned: playlist.isPinned === false ? true : false,
                      });
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 text-neutral-200 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    {playlist.isPinned !== false ? (
                      <>
                        <Pin className={`w-4 h-4 fill-current ${ACCENT_TEXT[accent] || 'text-emerald-400'}`} />
                        <span>Visible dans le menu de gauche</span>
                      </>
                    ) : (
                      <>
                        <PinOff className="w-4 h-4 text-neutral-400" />
                        <span>Masquée du menu de gauche</span>
                      </>
                    )}
                  </button>

                  <div className="h-px bg-neutral-800 my-0.5" />
                </>
              )}

              {tracks.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    handleOpenExportPlaylist();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${ACCENT_TEXT[accent] || 'text-emerald-400'}`}
                >
                  <FolderDown className={`w-4 h-4 ${ACCENT_TEXT[accent] || 'text-emerald-400'}`} />
                  <span>Exporter sur PC ({tracks.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsHeaderMenuOpen(false);
                  exportPlaylistToM3U(playlist, allTracks);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-800 text-neutral-300 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-neutral-400" />
                <span>Exporter en playlist (.m3u)</span>
              </button>

              {!playlist.isSmart && onDeletePlaylist && (
                <>
                  <div className="h-px bg-neutral-800 my-0.5" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      setIsDeleteModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-red-950/60 text-red-400 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Supprimer cette playlist</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tracks List */}
      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-neutral-800 rounded-2xl">
          <Music className="w-12 h-12 text-neutral-600 mb-3" />
          <h3 className="text-base font-semibold text-neutral-300 mb-1">Cette playlist est encore vide</h3>
          <p className="text-xs text-neutral-500 max-w-sm">
            Ajoutez des titres depuis la bibliothèque ou téléchargez des morceaux depuis YouTube pour les écouter ici.
          </p>
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-950/20">
          <table className="w-full table-fixed text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3">Titre & Artiste</th>
                <th className="py-3 px-3 hidden sm:table-cell w-36 lg:w-48">Album</th>
                <th className="py-3 px-3 hidden md:table-cell w-16 sm:w-20">Format</th>
                <th className="py-3 px-2 w-14 text-center">Favori</th>
                <th className="py-3 px-2 w-20 text-center">
                  <Clock className="w-3.5 h-3.5 inline" />
                </th>
                <th className="py-3 px-3 w-24 text-center pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/40">
              {tracks.map((track, idx) => {
                const isCurrentTrack = currentTrackId === track.id;
                return (
                  <tr
                    key={track.id}
                    className={`group transition-all cursor-pointer ${
                      isCurrentTrack
                        ? `${ACCENT_BORDER_L[accent]} shadow-sm`
                        : 'hover:bg-neutral-900/60 border-l-4 border-l-transparent'
                    }`}
                    onClick={() => onPlayTrack(track, tracks)}
                  >
                    <td
                      className={`py-3 px-3 text-center font-mono ${
                        isCurrentTrack ? ACCENT_TEXT[accent] : 'text-neutral-500 group-hover:text-white'
                      }`}
                    >
                      {isCurrentTrack ? (
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
                      ) : (
                        <>
                          <span className="group-hover:hidden">{idx + 1}</span>
                          <Play className="w-3.5 h-3.5 fill-current hidden group-hover:inline mx-auto" />
                        </>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800">
                          <img
                            src={
                              track.coverUrl ||
                              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
                            }
                            alt={track.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {isCurrentTrack && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                              <Volume2 className={`w-4 h-4 ${ACCENT_TEXT[accent]}`} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
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

                  <td className="py-3 px-3 text-neutral-400 hidden sm:table-cell truncate max-w-[160px]">
                    {track.album}
                  </td>

                  <td className="py-3 px-3 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-semibold">
                        {track.format}
                      </span>
                      {track.isCachedOffline && (
                        <span
                          className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-medium"
                          title="Prêt pour écoute hors ligne"
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
                          menuAnchor?.track.id === track.id
                            ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700'
                            : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
                        }`}
                        title="Actions sur le morceau"
                        aria-label="Actions sur le morceau"
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
          {onAddToQueue && (
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
          )}

          {/* Ajouter à une playlist */}
          {onAddToPlaylist && (
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
          )}

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

          <button
            type="button"
            onClick={() => {
              const t = menuAnchor.track;
              setMenuAnchor(null);
              handleOpenExportSingle(t);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
              ACCENT_SUBTLE_HOVER_BG[accent] || 'hover:bg-emerald-950/40 text-emerald-400'
            }`}
          >
            <FolderDown className={`w-4 h-4 ${ACCENT_TEXT[accent] || 'text-emerald-400'}`} />
            <span>Exporter ce morceau sur PC...</span>
          </button>

          {!playlist.isSmart && onRemoveTrackFromPlaylist && (
            <>
              <div className="h-px bg-neutral-800 my-0.5" />
              <button
                type="button"
                onClick={() => {
                  const t = menuAnchor.track;
                  setMenuAnchor(null);
                  onRemoveTrackFromPlaylist(playlist.id, t.id);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-red-950/60 text-red-400 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Retirer de la playlist</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* In-App Delete Playlist Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          id="delete-playlist-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div
            id="delete-playlist-modal-card"
            className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Supprimer la playlist</h3>
                <p className="text-xs text-neutral-400">Cette action est irréversible</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300">
              Voulez-vous vraiment supprimer la playlist <strong className="text-white">"{playlist.title}"</strong> ? Les morceaux resteront disponibles dans votre bibliothèque musicale.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                id="confirm-delete-playlist-btn"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  if (onDeletePlaylist) {
                    onDeletePlaylist(playlist.id);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 flex items-center gap-1.5 transition-colors shadow-sm shadow-red-950"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Playlist to PC Modal */}
      <ExportTracksModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        tracks={tracksToExport}
        accent={accent}
        defaultZipName={exportZipName}
      />

      {/* Edit/Customize Playlist Modal */}
      {isEditModalOpen && onUpdatePlaylist && (
        <EditPlaylistModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          playlist={playlist}
          onSave={(updated) => {
            onUpdatePlaylist(updated);
            setIsEditModalOpen(false);
          }}
          accent={accent}
        />
      )}

      {/* Add To Playlist Modal */}
      {onAddToPlaylist && (
        <AddToPlaylistModal
          isOpen={!!addToPlaylistTrack}
          onClose={() => setAddToPlaylistTrack(null)}
          track={addToPlaylistTrack}
          playlists={playlists}
          onAddToPlaylist={onAddToPlaylist}
          onRemoveFromPlaylist={onRemoveTrackFromPlaylist}
          onCreatePlaylist={onCreatePlaylist}
          accent={accent}
        />
      )}
    </div>
  );
};

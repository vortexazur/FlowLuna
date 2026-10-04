import React, { useState } from 'react';
import {
  ListMusic,
  Plus,
  Play,
  Heart,
  HardDrive,
  Trash2,
  Search,
  Sparkles,
  FolderPlus,
  Palette,
  Edit3,
  Youtube,
  Pin,
  PinOff,
  SlidersHorizontal,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Playlist, Track, AccentColor } from '../types';
import { PlaylistIcon } from './PlaylistIcon';
import { EditPlaylistModal } from './EditPlaylistModal';
import { ManageSidebarPlaylistsModal } from './ManageSidebarPlaylistsModal';
import { PLAYLIST_COLOR_PRESETS } from '../utils/playlistIcons';

interface AllPlaylistsViewProps {
  playlists: Playlist[];
  tracks: Track[];
  onNavigate: (view: string, playlistId?: string) => void;
  onCreatePlaylist: () => void;
  onPlayPlaylist: (playlistId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onUpdatePlaylist?: (playlist: Playlist) => void;
  onTogglePinPlaylist?: (playlistId: string, isPinned: boolean) => void;
  onBulkUpdatePins?: (pinnedMap: Record<string, boolean>) => void;
  onOpenManageSidebar?: () => void;
  accent: AccentColor;
}

const ACCENT_BG: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-black',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white',
  amber: 'bg-amber-500 hover:bg-amber-400 text-black',
  rose: 'bg-rose-500 hover:bg-rose-400 text-white',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-black',
};

const ACCENT_BORDER: Record<AccentColor, string> = {
  emerald: 'border-emerald-500/40 hover:border-emerald-500/80',
  violet: 'border-violet-500/40 hover:border-violet-500/80',
  blue: 'border-blue-500/40 hover:border-blue-500/80',
  amber: 'border-amber-500/40 hover:border-amber-500/80',
  rose: 'border-rose-500/40 hover:border-rose-500/80',
  cyan: 'border-cyan-500/40 hover:border-cyan-500/80',
};

const formatDuration = (totalSeconds: number) => {
  const mins = Math.floor(totalSeconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs} h ${remMins} min`;
};

export const AllPlaylistsView: React.FC<AllPlaylistsViewProps> = ({
  playlists,
  tracks,
  onNavigate,
  onCreatePlaylist,
  onPlayPlaylist,
  onDeletePlaylist,
  onUpdatePlaylist,
  onTogglePinPlaylist,
  onBulkUpdatePins,
  onOpenManageSidebar,
  accent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);
  const [isManageSidebarOpen, setIsManageSidebarOpen] = useState(false);

  const handleOpenManageSidebar = () => {
    if (onOpenManageSidebar) {
      onOpenManageSidebar();
    } else {
      setIsManageSidebarOpen(true);
    }
  };

  // Move Favoris into main playlists and exclude obsolete offline playlist
  const customPlaylists = playlists.filter(
    (p) => (!p.isSmart || p.id === 'playlist-favorites') && p.id !== 'playlist-offline'
  );
  const smartPlaylists = playlists.filter(
    (p) => p.isSmart && p.id !== 'playlist-favorites' && p.id !== 'playlist-offline'
  );

  const filterFn = (p: Playlist) => {
    if (!searchQuery.trim()) return true;
    return (
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const filteredCustom = customPlaylists.filter(filterFn);
  const filteredSmart = smartPlaylists.filter(filterFn);

  const getPlaylistTracks = (pl: Playlist): Track[] => {
    if (pl.id === 'playlist-favorites') {
      return tracks.filter((t) => t.isFavorite);
    }
    if (pl.id === 'playlist-offline') {
      return tracks.filter((t) => t.isCachedOffline);
    }
    const set = new Set(pl.trackIds);
    return tracks.filter((t) => set.has(t.id));
  };

  const renderCover = (pl: Playlist) => {
    const plTracks = getPlaylistTracks(pl);
    const colorPreset = PLAYLIST_COLOR_PRESETS.find(
      (c) => c.id === pl.iconColor || c.hex === pl.iconColor
    ) || PLAYLIST_COLOR_PRESETS[0];

    // Priority 1: If custom icon is explicitly set without a dedicated custom photo cover
    if (pl.icon && !pl.coverUrl) {
      return (
        <div className={`w-full h-full flex flex-col items-center justify-center ${colorPreset.bgClass} border ${colorPreset.borderClass}`}>
          <PlaylistIcon playlist={pl} size="2xl" />
        </div>
      );
    }

    // Priority 2: Custom Cover Image
    if (pl.coverUrl) {
      return (
        <div className="relative w-full h-full">
          <img src={pl.coverUrl} alt={pl.title} className="w-full h-full object-cover" />
          {pl.icon && (
            <div className="absolute bottom-2 left-2 shadow-lg">
              <PlaylistIcon playlist={pl} size="sm" />
            </div>
          )}
        </div>
      );
    }

    // Priority 3: Fallback from track covers
    const covers = plTracks
      .map((t) => t.coverUrl)
      .filter((url): url is string => Boolean(url && url.length > 0));

    if (covers.length >= 4) {
      return (
        <div className="relative w-full h-full">
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
            {covers.slice(0, 4).map((cUrl, idx) => (
              <img key={idx} src={cUrl} alt="" className="w-full h-full object-cover" />
            ))}
          </div>
          {pl.icon && (
            <div className="absolute bottom-2 left-2 shadow-lg">
              <PlaylistIcon playlist={pl} size="sm" />
            </div>
          )}
        </div>
      );
    }

    if (covers.length > 0) {
      return (
        <div className="relative w-full h-full">
          <img src={covers[0]} alt={pl.title} className="w-full h-full object-cover" />
          {pl.icon && (
            <div className="absolute bottom-2 left-2 shadow-lg">
              <PlaylistIcon playlist={pl} size="sm" />
            </div>
          )}
        </div>
      );
    }

    // Priority 4: Smart Playlist Defaults
    if (pl.id === 'playlist-favorites') {
      return (
        <div className="w-full h-full bg-gradient-to-br from-rose-900/60 to-pink-950/80 flex items-center justify-center">
          <Heart className="w-10 h-10 text-rose-500 fill-rose-500/40" />
        </div>
      );
    }

    if (pl.id === 'playlist-offline') {
      return (
        <div className="w-full h-full bg-gradient-to-br from-emerald-900/60 to-teal-950/80 flex items-center justify-center">
          <HardDrive className="w-10 h-10 text-emerald-400" />
        </div>
      );
    }

    if (pl.id === 'playlist-youtube') {
      return (
        <div className="w-full h-full bg-gradient-to-br from-red-900/60 to-neutral-950 flex items-center justify-center">
          <Youtube className="w-10 h-10 text-red-500" />
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
        <PlaylistIcon playlist={pl} size="xl" />
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-amber-950/80 border border-amber-500/30 text-amber-400 shadow-sm flex-shrink-0">
            <ListMusic className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Toutes les Playlists</span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/30 text-amber-400">
                {playlists.length} {playlists.length > 1 ? 'playlists' : 'playlist'}
              </span>
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Explorez vos collections, personnalisez les icônes et organisez vos morceaux
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar for filtering playlists */}
          <div className="relative min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Filtrer une playlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
            />
          </div>

          <button
            type="button"
            id="manage-sidebar-btn"
            onClick={handleOpenManageSidebar}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors"
            title="Gérer les playlists visibles dans la barre latérale"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
            <span>Menu latéral</span>
          </button>

          <button
            type="button"
            id="create-new-playlist-page-btn"
            onClick={onCreatePlaylist}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-transform active:scale-95 shadow-lg ${ACCENT_BG[accent]}`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Créer une Playlist</span>
          </button>
        </div>
      </div>

      {/* Section 1: Playlists Créées (Custom Playlists) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">
              Playlists Créées ({filteredCustom.length})
            </h2>
          </div>
        </div>

        {filteredCustom.length === 0 ? (
          <div className="p-8 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 text-center flex flex-col items-center justify-center gap-3">
            <ListMusic className="w-12 h-12 text-neutral-600" />
            <div>
              <h3 className="text-sm font-bold text-neutral-300">Aucune playlist personnalisée</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Créez vos playlists pour organiser vos morceaux selon vos envies.
              </p>
            </div>
            <button
              type="button"
              onClick={onCreatePlaylist}
              className={`mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${ACCENT_BG[accent]}`}
            >
              <Plus className="w-4 h-4" />
              Créer une playlist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredCustom.map((pl) => {
              const plTracks = getPlaylistTracks(pl);
              const totalSecs = plTracks.reduce((acc, t) => acc + t.duration, 0);
              const isPinned = pl.isPinned !== false;

              return (
                <div
                  key={pl.id}
                  onClick={() => onNavigate('playlist', pl.id)}
                  className={`group relative flex flex-col bg-neutral-900/80 border rounded-2xl p-3 transition-all hover:scale-[1.02] cursor-pointer shadow-lg ${ACCENT_BORDER[accent]}`}
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-950 mb-3 shadow-md">
                    {renderCover(pl)}

                    {/* Pin Status Badge on top left */}
                    <div className="absolute top-2 left-2 pointer-events-none">
                      {isPinned ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/85 backdrop-blur-sm border border-emerald-500/30 text-[9px] font-bold text-emerald-400 flex items-center gap-1 shadow-sm">
                          <Pin className="w-2.5 h-2.5 fill-current" />
                          <span>Menu</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-neutral-950/85 backdrop-blur-sm border border-neutral-800 text-[9px] font-medium text-neutral-400 flex items-center gap-1 shadow-sm">
                          <EyeOff className="w-2.5 h-2.5" />
                          <span>Masquée</span>
                        </span>
                      )}
                    </div>

                    {/* Hover Play overlay */}
                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayPlaylist(pl.id);
                        }}
                        className={`pointer-events-auto p-3.5 rounded-full shadow-2xl transition-transform hover:scale-110 ${ACCENT_BG[accent]}`}
                        title="Écouter la playlist"
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </button>
                    </div>

                    {/* Top corner action buttons */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Pin/Unpin Toggle Button (Favoris is always pinned) */}
                      {pl.id !== 'playlist-favorites' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextState = !isPinned;
                            if (onTogglePinPlaylist) {
                              onTogglePinPlaylist(pl.id, nextState);
                            } else if (onUpdatePlaylist) {
                              onUpdatePlaylist({ ...pl, isPinned: nextState });
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-all shadow-md ${
                            isPinned
                              ? 'bg-emerald-950/90 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900'
                              : 'bg-neutral-900/95 border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800'
                          }`}
                          title={
                            isPinned
                              ? 'Épinglée au menu de gauche (cliquer pour masquer)'
                              : 'Masquée du menu de gauche (cliquer pour épingler)'
                          }
                        >
                          {isPinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      {onUpdatePlaylist && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlaylistToEdit(pl);
                          }}
                          className="p-1.5 rounded-lg bg-neutral-900/95 text-neutral-300 hover:text-emerald-400 hover:bg-neutral-800 transition-all shadow-md border border-neutral-800"
                          title="Personnaliser l'icône, couleur & couverture"
                        >
                          <Palette className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {pl.id !== 'playlist-favorites' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlaylistToDelete(pl);
                          }}
                          className="p-1.5 rounded-lg bg-neutral-900/95 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-all shadow-md border border-neutral-800"
                          title="Supprimer la playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <PlaylistIcon playlist={pl} size="xs" />
                      <h3 className="font-bold text-sm text-white truncate group-hover:text-emerald-400 transition-colors">
                        {pl.title}
                      </h3>
                    </div>
                    <p className="text-xs text-neutral-400 truncate mt-1">
                      {pl.description || `${plTracks.length} morceau${plTracks.length > 1 ? 'x' : ''}`}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 mt-2">
                      <span>{plTracks.length} pistes • {formatDuration(totalSecs)}</span>
                      {pl.id === 'playlist-favorites' ? (
                        <span className="text-rose-400 font-sans font-medium">Favoris</span>
                      ) : isPinned ? (
                        <span className="text-emerald-500 font-sans font-medium">Menu</span>
                      ) : (
                        <span className="text-neutral-500 font-sans">Masquée</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Playlists Intelligentes (Smart Playlists) */}
      {filteredSmart.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-neutral-800/80">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Playlists Intelligentes & Automatiques</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredSmart.map((pl) => {
              const plTracks = getPlaylistTracks(pl);
              const totalSecs = plTracks.reduce((acc, t) => acc + t.duration, 0);

              return (
                <div
                  key={pl.id}
                  onClick={() => onNavigate('playlist', pl.id)}
                  className="group relative flex items-center gap-4 bg-neutral-900/80 border border-neutral-800/90 hover:border-neutral-700 rounded-2xl p-3.5 transition-all hover:scale-[1.01] cursor-pointer shadow-md"
                >
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-950">
                    {renderCover(pl)}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayPlaylist(pl.id);
                        }}
                        className={`p-2.5 rounded-full shadow-lg ${ACCENT_BG[accent]}`}
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <PlaylistIcon playlist={pl} size="xs" />
                      <h3 className="font-bold text-sm text-white truncate">{pl.title}</h3>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-neutral-800 text-amber-400 border border-amber-500/20">
                        Auto
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                      {pl.description || 'Générée automatiquement par FlowLuna'}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500 mt-2">
                      <span>{plTracks.length} titres</span>
                      <span>•</span>
                      <span>{formatDuration(totalSecs)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Playlist Confirmation Modal */}
      {playlistToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Supprimer la playlist ?</h3>
            <p className="text-xs text-neutral-400">
              Êtes-vous sûr de vouloir supprimer la playlist <strong className="text-white">{playlistToDelete.title}</strong> ? Vos fichiers musicaux ne seront pas supprimés.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPlaylistToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePlaylist(playlistToDelete.id);
                  setPlaylistToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Customize Playlist Modal */}
      {playlistToEdit && onUpdatePlaylist && (
        <EditPlaylistModal
          isOpen={Boolean(playlistToEdit)}
          onClose={() => setPlaylistToEdit(null)}
          playlist={playlistToEdit}
          onSave={(updated) => {
            onUpdatePlaylist(updated);
            setPlaylistToEdit(null);
          }}
          accent={accent}
        />
      )}

      {/* Manage Sidebar Pinned Playlists Modal */}
      {isManageSidebarOpen && (
        <ManageSidebarPlaylistsModal
          isOpen={isManageSidebarOpen}
          onClose={() => setIsManageSidebarOpen(false)}
          playlists={playlists}
          onTogglePin={(id, isPinned) => {
            if (onTogglePinPlaylist) {
              onTogglePinPlaylist(id, isPinned);
            }
          }}
          onBulkUpdatePins={(map) => {
            if (onBulkUpdatePins) {
              onBulkUpdatePins(map);
            }
          }}
          onCreatePlaylist={onCreatePlaylist}
          onNavigate={(tab, id) => onNavigate(tab, id)}
          accent={accent}
        />
      )}
    </div>
  );
};

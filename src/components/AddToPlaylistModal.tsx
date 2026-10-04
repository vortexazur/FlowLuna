import React, { useState, useMemo } from 'react';
import { X, Plus, Check, FolderPlus, Search, Music } from 'lucide-react';
import { Track, Playlist, AccentColor } from '../types';
import { PlaylistIcon } from './PlaylistIcon';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  playlists: Playlist[];
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveFromPlaylist?: (playlistId: string, trackId: string) => void;
  onCreatePlaylist?: (title: string) => Promise<string | void> | void;
  accent?: AccentColor;
}

const ACCENT_BTN: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white',
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950',
  rose: 'bg-rose-500 hover:bg-rose-400 text-white',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950',
};

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  onClose,
  track,
  playlists,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onCreatePlaylist,
  accent = 'emerald',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [addedPlaylists, setAddedPlaylists] = useState<Set<string>>(new Set());
  const [removedPlaylists, setRemovedPlaylists] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  // Reset local override tracking on track change or modal open
  React.useEffect(() => {
    setAddedPlaylists(new Set());
    setRemovedPlaylists(new Set());
    setFeedback(null);
  }, [track?.id, isOpen]);

  // Filter available playlists
  const availablePlaylists = useMemo(() => {
    // Show non-smart playlists or all custom playlists
    const list = playlists.filter((p) => p.id !== 'playlist-offline' && p.id !== 'playlist-youtube');
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((p) => p.title.toLowerCase().includes(q));
  }, [playlists, searchQuery]);

  if (!isOpen || !track) return null;

  const handleAdd = (playlistId: string, playlistTitle: string) => {
    onAddToPlaylist(playlistId, track.id);
    setAddedPlaylists((prev) => new Set([...prev, playlistId]));
    setRemovedPlaylists((prev) => {
      const next = new Set(prev);
      next.delete(playlistId);
      return next;
    });
    setFeedback(`Ajouté à "${playlistTitle}"`);
    setTimeout(() => setFeedback(null), 2200);
  };

  const handleRemove = (playlistId: string, playlistTitle: string) => {
    if (onRemoveFromPlaylist) {
      onRemoveFromPlaylist(playlistId, track.id);
    }
    setRemovedPlaylists((prev) => new Set([...prev, playlistId]));
    setAddedPlaylists((prev) => {
      const next = new Set(prev);
      next.delete(playlistId);
      return next;
    });
    setFeedback(`Retiré de "${playlistTitle}"`);
    setTimeout(() => setFeedback(null), 2200);
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPlaylistName.trim();
    if (!trimmed || !onCreatePlaylist) return;

    setIsCreating(true);
    try {
      const res = await onCreatePlaylist(trimmed);
      if (typeof res === 'string') {
        handleAdd(res, trimmed);
      }
      setNewPlaylistName('');
    } catch (err) {
      console.error('Failed to create playlist:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-neutral-900/95 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/80 bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Ajouter à une playlist</h3>
              <p className="text-[11px] text-neutral-400 truncate max-w-[260px]">
                {track.title} • {track.artist}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Track Preview Card */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
            <div className="w-11 h-11 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 flex-shrink-0">
              {track.coverUrl ? (
                <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-600">
                  <Music className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-neutral-100 truncate">{track.title}</h4>
              <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
            </div>
          </div>
        </div>

        {/* Quick Create New Playlist Input */}
        {onCreatePlaylist && (
          <div className="px-5 py-2">
            <form onSubmit={handleCreateAndAdd} className="flex gap-2">
              <input
                type="text"
                placeholder="Créer une nouvelle playlist..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="flex-1 bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
              />
              <button
                type="submit"
                disabled={!newPlaylistName.trim() || isCreating}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${ACCENT_BTN[accent]}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer</span>
              </button>
            </form>
          </div>
        )}

        {/* Search filter if more than 3 playlists */}
        {playlists.length > 3 && (
          <div className="px-5 py-1.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher une playlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950/50 border border-neutral-800/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-300 placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
              />
            </div>
          </div>
        )}

        {/* Playlists List */}
        <div className="flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-1 min-h-[160px] max-h-[300px]">
          {availablePlaylists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-neutral-500 text-xs text-center gap-2">
              <FolderPlus className="w-8 h-8 opacity-40" />
              <p>Aucune playlist trouvée.</p>
              <p className="text-[11px] text-neutral-600">Créez-en une directement avec le champ ci-dessus !</p>
            </div>
          ) : (
            availablePlaylists.map((pl) => {
              const isInitialPresent = (pl.trackIds || []).includes(track.id);
              const isPresent = (isInitialPresent || addedPlaylists.has(pl.id)) && !removedPlaylists.has(pl.id);
              const currentCount = Math.max(
                0,
                (pl.trackIds?.length ?? 0) +
                  (addedPlaylists.has(pl.id) && !isInitialPresent ? 1 : 0) -
                  (removedPlaylists.has(pl.id) && isInitialPresent ? 1 : 0)
              );

              return (
                <div
                  key={pl.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all group ${
                    isPresent
                      ? 'bg-emerald-950/20 border border-emerald-500/15 hover:bg-emerald-950/30'
                      : 'hover:bg-neutral-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                    <PlaylistIcon playlist={pl} size="sm" showCoverIfAvailable />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${isPresent ? 'text-emerald-300' : 'text-neutral-200'}`}>
                        {pl.title}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {currentCount} titre{currentCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {isPresent ? (
                    <button
                      type="button"
                      onClick={() => handleRemove(pl.id, pl.title)}
                      className="group/btn flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:text-rose-400 bg-emerald-950/40 hover:bg-rose-950/50 border border-emerald-500/25 hover:border-rose-500/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
                      title={`Cliquer pour retirer de "${pl.title}"`}
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400 group-hover/btn:hidden flex-shrink-0" />
                      <span className="group-hover/btn:hidden">Ajouté</span>
                      <X className="w-3.5 h-3.5 text-rose-400 hidden group-hover/btn:inline flex-shrink-0" />
                      <span className="hidden group-hover/btn:inline">Retirer</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAdd(pl.id, pl.title)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/60 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
                      title={`Cliquer pour ajouter à "${pl.title}"`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800/60 bg-neutral-900/40 flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-2">
            {feedback && (
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-full animate-in fade-in duration-150 inline-block truncate max-w-full">
                {feedback}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Pin,
  PinOff,
  Check,
  Search,
  SlidersHorizontal,
  FolderPlus,
  ListMusic,
  CheckSquare,
  Square,
  Sparkles,
  Info,
} from 'lucide-react';
import { Playlist, AccentColor } from '../types';
import { PlaylistIcon } from './PlaylistIcon';

interface ManageSidebarPlaylistsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  onTogglePin: (playlistId: string, isPinned: boolean) => void;
  onBulkUpdatePins: (pinnedMap: Record<string, boolean>) => void;
  accent: AccentColor;
}

const ACCENT_BG: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white font-bold',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white font-bold',
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold',
  rose: 'bg-rose-500 hover:bg-rose-400 text-white font-bold',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold',
};

const ACCENT_CHECK: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 border-emerald-500 text-black',
  violet: 'bg-violet-500 border-violet-500 text-white',
  blue: 'bg-blue-500 border-blue-500 text-white',
  amber: 'bg-amber-500 border-amber-500 text-black',
  rose: 'bg-rose-500 border-rose-500 text-white',
  cyan: 'bg-cyan-500 border-cyan-500 text-black',
};

export const ManageSidebarPlaylistsModal: React.FC<ManageSidebarPlaylistsModalProps> = ({
  isOpen,
  onClose,
  playlists,
  onTogglePin,
  onBulkUpdatePins,
  accent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local pin state map for quick edits
  const [pinState, setPinState] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    playlists.forEach((p) => {
      map[p.id] = p.isPinned !== false;
    });
    return map;
  });

  // Sync state when opened
  React.useEffect(() => {
    if (isOpen) {
      const map: Record<string, boolean> = {};
      playlists.forEach((p) => {
        map[p.id] = p.isPinned !== false;
      });
      setPinState(map);
      setSearchQuery('');
    }
  }, [isOpen, playlists]);

  if (!isOpen) return null;

  const customPlaylists = playlists.filter(
    (p) => !p.isSmart && p.id !== 'playlist-favorites' && p.id !== 'playlist-offline'
  );

  const filteredPlaylists = customPlaylists.filter((p) => {
    if (!searchQuery.trim()) return true;
    return (
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const visibleCount = Object.values(pinState).filter(Boolean).length;

  const handleToggle = (id: string) => {
    const newVal = !pinState[id];
    setPinState((prev) => ({ ...prev, [id]: newVal }));
    onTogglePin(id, newVal);
  };

  const handleSelectAll = () => {
    const newMap: Record<string, boolean> = {};
    customPlaylists.forEach((p) => {
      newMap[p.id] = true;
    });
    setPinState(newMap);
    onBulkUpdatePins(newMap);
  };

  const handleDeselectAll = () => {
    const newMap: Record<string, boolean> = {};
    customPlaylists.forEach((p) => {
      newMap[p.id] = false;
    });
    setPinState(newMap);
    onBulkUpdatePins(newMap);
  };

  return (
    <div
      id="manage-sidebar-playlists-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="manage-sidebar-playlists-card"
        className="w-full max-w-lg max-h-[85vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-neutral-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neutral-800 text-sky-400 border border-neutral-700/60">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Playlists du Menu Latéral</h3>
              <p className="text-xs text-neutral-400">
                Sélectionnez les playlists à afficher sous la section « PLAYLISTS »
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Quick Action Toolbar */}
        <div className="p-4 border-b border-neutral-800/80 bg-neutral-900/60 flex flex-col gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Rechercher une playlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-1.5 font-medium">
              <Pin className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                <strong className="text-white">{visibleCount}</strong> sur {customPlaylists.length} visibles dans la barre latérale
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-200 font-medium transition-colors"
              >
                Tout cocher
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-300 font-medium transition-colors"
              >
                Tout décocher
              </button>
            </div>
          </div>
        </div>

        {/* Playlist List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[50vh]">
          {filteredPlaylists.length === 0 ? (
            <div className="py-8 text-center text-neutral-500 flex flex-col items-center gap-2">
              <ListMusic className="w-8 h-8 text-neutral-600" />
              <p className="text-xs">Aucune playlist trouvée</p>
            </div>
          ) : (
            filteredPlaylists.map((pl) => {
              const isPinned = pinState[pl.id] !== false;

              return (
                <div
                  key={pl.id}
                  onClick={() => handleToggle(pl.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    isPinned
                      ? 'bg-neutral-800/60 border-neutral-700/80 hover:bg-neutral-800'
                      : 'bg-neutral-950/40 border-neutral-800/60 opacity-60 hover:opacity-90 hover:bg-neutral-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <PlaylistIcon playlist={pl} size="sm" showCoverIfAvailable={true} />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white truncate">
                          {pl.title}
                        </span>
                        {isPinned && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                            <Pin className="w-2.5 h-2.5" />
                            Épinglée
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 truncate">
                        {pl.trackIds.length} morceau{pl.trackIds.length > 1 ? 'x' : ''}
                        {pl.description ? ` • ${pl.description}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Checkbox / Pin Icon */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(pl.id);
                      }}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                        isPinned ? ACCENT_CHECK[accent] : 'border-neutral-700 bg-neutral-900 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Info banner & Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex flex-col gap-3">
          <div className="flex items-start gap-2 text-[11px] text-neutral-400 bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
            <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Les playlists masquées restent accessibles à tout moment depuis la vue{' '}
              <strong className="text-white font-medium">« Toutes les Playlists »</strong> du menu principal.
            </p>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2 rounded-xl text-xs ${ACCENT_BG[accent]} transition-all active:scale-95`}
            >
              Terminé
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

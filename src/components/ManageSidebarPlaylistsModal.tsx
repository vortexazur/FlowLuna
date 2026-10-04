import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Pin,
  PinOff,
  Check,
  Search,
  SlidersHorizontal,
  FolderPlus,
  ListMusic,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { Playlist, AccentColor } from '../types';
import { PlaylistIcon } from './PlaylistIcon';

const MAX_SIDEBAR_PINNED = 3;

interface ManageSidebarPlaylistsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  onTogglePin: (playlistId: string, isPinned: boolean) => void;
  onBulkUpdatePins: (pinnedMap: Record<string, boolean>) => void;
  onCreatePlaylist?: () => void;
  onNavigate?: (view: string, playlistId?: string) => void;
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
  emerald: 'bg-emerald-500 border-emerald-500 text-neutral-950',
  violet: 'bg-violet-500 border-violet-500 text-white',
  blue: 'bg-blue-500 border-blue-500 text-white',
  amber: 'bg-amber-500 border-amber-500 text-neutral-950',
  rose: 'bg-rose-500 border-rose-500 text-white',
  cyan: 'bg-cyan-500 border-cyan-500 text-neutral-950',
};

export const ManageSidebarPlaylistsModal: React.FC<ManageSidebarPlaylistsModalProps> = ({
  isOpen,
  onClose,
  playlists,
  onTogglePin,
  onBulkUpdatePins,
  onCreatePlaylist,
  onNavigate,
  accent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Reset search and warnings when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setWarningMessage(null);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Custom playlists to manage
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

  // Calculate visible count only from custom playlists
  const visibleCount = customPlaylists.filter((p) => p.isPinned !== false).length;

  const handleToggle = (pl: Playlist) => {
    const isCurrentlyPinned = pl.isPinned !== false;
    if (!isCurrentlyPinned && visibleCount >= MAX_SIDEBAR_PINNED) {
      setWarningMessage(`Limite atteinte : vous pouvez épingler au maximum ${MAX_SIDEBAR_PINNED} playlists en plus des Favoris. Décocher une playlist existante pour en ajouter une autre.`);
      return;
    }
    setWarningMessage(null);
    onTogglePin(pl.id, !isCurrentlyPinned);
  };

  const handleSelectFirst3 = () => {
    const newMap: Record<string, boolean> = {};
    customPlaylists.forEach((p, idx) => {
      newMap[p.id] = idx < MAX_SIDEBAR_PINNED;
    });
    setWarningMessage(null);
    onBulkUpdatePins(newMap);
  };

  const handleDeselectAll = () => {
    const newMap: Record<string, boolean> = {};
    customPlaylists.forEach((p) => {
      newMap[p.id] = false;
    });
    setWarningMessage(null);
    onBulkUpdatePins(newMap);
  };

  const modalContent = (
    <div
      id="manage-sidebar-playlists-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        id="manage-sidebar-playlists-card"
        className="w-full max-w-lg max-h-[85vh] bg-[#14141f] border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-neutral-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-[#0d0d16]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neutral-800 text-sky-400 border border-neutral-700/60 shadow-xs">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Playlists du Menu Latéral</h3>
              <p className="text-xs text-neutral-400">
                Choisissez jusqu'à 3 playlists à afficher en plus des Favoris
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Quick Action Toolbar */}
        <div className="p-4 border-b border-neutral-800 bg-[#10101a] flex flex-col gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Rechercher une playlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-1.5 font-medium">
              <Pin className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                <strong className={visibleCount >= MAX_SIDEBAR_PINNED ? 'text-amber-400' : 'text-white'}>
                  {visibleCount} / {MAX_SIDEBAR_PINNED}
                </strong> épinglée{visibleCount > 1 ? 's' : ''} (max {MAX_SIDEBAR_PINNED} + Favoris)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectFirst3}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-200 font-medium transition-colors border border-neutral-700/50 cursor-pointer"
                title="Épingler les 3 premières playlists"
              >
                3 premières
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-300 font-medium transition-colors border border-neutral-700/50 cursor-pointer"
              >
                Tout masquer
              </button>
            </div>
          </div>
        </div>

        {/* Warning banner when limit reached */}
        {warningMessage && (
          <div className="px-4 py-2.5 bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{warningMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setWarningMessage(null)}
              className="text-amber-400 hover:text-white text-xs px-1 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Playlist List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[50vh] bg-[#14141f]">
          {customPlaylists.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-neutral-400">
                <ListMusic className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-semibold text-white">Aucune playlist créée</p>
                <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                  Vous n'avez pas encore de playlist personnalisée. Créez-en une pour pouvoir l'épingler dans votre menu latéral.
                </p>
              </div>
              {onCreatePlaylist && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreatePlaylist();
                  }}
                  className={`mt-2 px-4 py-2 rounded-xl text-xs flex items-center gap-2 ${ACCENT_BG[accent]} transition-all active:scale-95 cursor-pointer`}
                >
                  <FolderPlus className="w-4 h-4" />
                  Créer une playlist
                </button>
              )}
            </div>
          ) : filteredPlaylists.length === 0 ? (
            <div className="py-10 text-center text-neutral-500 flex flex-col items-center gap-2">
              <Search className="w-8 h-8 text-neutral-600" />
              <p className="text-xs">Aucune playlist ne correspond à « {searchQuery} »</p>
            </div>
          ) : (
            filteredPlaylists.map((pl) => {
              const isPinned = pl.isPinned !== false;

              return (
                <div
                  key={pl.id}
                  onClick={() => handleToggle(pl)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isPinned
                      ? 'bg-neutral-800/90 border-neutral-700 hover:bg-neutral-800'
                      : 'bg-neutral-900/60 border-neutral-800 opacity-60 hover:opacity-90 hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <PlaylistIcon playlist={pl} size="sm" showCoverIfAvailable={true} />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white truncate">
                          {pl.title}
                        </span>
                        {isPinned ? (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                            <Pin className="w-2.5 h-2.5" />
                            Épinglée
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-500 px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700">
                            <PinOff className="w-2.5 h-2.5" />
                            Masquée
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 truncate">
                        {pl.trackIds.length} morceau{pl.trackIds.length > 1 ? 'x' : ''}
                        {pl.description ? ` • ${pl.description}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Checkbox */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(pl);
                      }}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
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
        <div className="p-4 border-t border-neutral-800 bg-[#0d0d16] flex flex-col gap-3">
          <div className="flex items-start gap-2 text-[11px] text-neutral-400 bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
            <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Vous pouvez épingler au maximum <strong className="text-white font-medium">3 playlists</strong> dans le menu latéral (en plus des Favoris). Toutes vos playlists restent accessibles depuis{' '}
              <strong className="text-white font-medium">« Toutes les Playlists »</strong>.
            </p>
          </div>

          <div className="flex items-center justify-between">
            {onNavigate ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate('playlists');
                }}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors group cursor-pointer"
              >
                <ListMusic className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                <span className="group-hover:underline">Voir toutes les playlists</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {onCreatePlaylist && customPlaylists.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreatePlaylist();
                  }}
                  className="px-3 py-2 rounded-xl text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors flex items-center gap-1.5 border border-neutral-700/50 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  Nouvelle playlist
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`px-5 py-2 rounded-xl text-xs ${ACCENT_BG[accent]} transition-all active:scale-95 cursor-pointer`}
              >
                Terminé
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

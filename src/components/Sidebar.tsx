import React from 'react';
import {
  Music,
  Waves,
  Search,
  Heart,
  Settings,
  Sliders,
  Plus,
  ListMusic,
  SlidersHorizontal,
  Film,
  Download,
} from 'lucide-react';
import { Playlist, AccentColor, ThemeMode, PlayerSettings } from '../types';
import { PlaylistIcon } from './PlaylistIcon';
import { ManageSidebarPlaylistsModal } from './ManageSidebarPlaylistsModal';
import { OpenFileDropdown } from './OpenFileDropdown';
import { getT } from '../i18n';
import flowLunaLogo from '../assets/logo.jpg';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string, playlistId?: string) => void;
  playlists: Playlist[];
  favoritesCount?: number;
  videosCount?: number;
  onCreatePlaylist: () => void;
  onOpenSettings: () => void;
  onOpenEqualizer: () => void;
  onImportFiles: (files: FileList | File[]) => void;
  accent: AccentColor;
  theme: ThemeMode;
  cachedCount: number;
  isPlaying?: boolean;
  settings?: PlayerSettings;
  onUpdateSettings?: (newSettings: PlayerSettings) => void;
  onToggleFullscreen?: () => void;
  onTogglePinPlaylist?: (playlistId: string, isPinned: boolean) => void;
  onBulkUpdatePins?: (pinnedMap: Record<string, boolean>) => void;
  onOpenManageSidebar?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenQueue?: () => void;
  queueLength?: number;
  isQueueOpen?: boolean;
}

const ACCENT_ACTIVE: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border-r-2 border-emerald-500',
  violet: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 font-bold border-r-2 border-violet-500',
  blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 font-bold border-r-2 border-blue-500',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold border-r-2 border-amber-500',
  rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-bold border-r-2 border-rose-500',
  cyan: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 font-bold border-r-2 border-cyan-500',
};

const ACCENT_TEXT: Record<AccentColor, string> = {
  emerald: 'text-emerald-700 dark:text-emerald-400',
  violet: 'text-violet-700 dark:text-violet-400',
  blue: 'text-blue-700 dark:text-blue-400',
  amber: 'text-amber-700 dark:text-amber-400',
  rose: 'text-rose-700 dark:text-rose-400',
  cyan: 'text-cyan-700 dark:text-cyan-400',
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  playlists,
  favoritesCount,
  videosCount,
  onCreatePlaylist,
  onOpenSettings,
  onOpenEqualizer,
  onImportFiles,
  accent,
  theme,
  cachedCount,
  isPlaying = false,
  settings,
  onUpdateSettings,
  onToggleFullscreen,
  onTogglePinPlaylist,
  onBulkUpdatePins,
  onOpenManageSidebar,
  onOpenCommandPalette,
  onOpenQueue,
  queueLength,
  isQueueOpen,
}) => {
  const [isManageSidebarOpen, setIsManageSidebarOpen] = React.useState(false);
  const t = getT(settings?.language);

  const handleOpenManageSidebar = () => {
    if (onOpenManageSidebar) {
      onOpenManageSidebar();
    } else {
      setIsManageSidebarOpen(true);
    }
  };

  // System Favorites playlist
  const favPlaylist = playlists.find((p) => p.id === 'playlist-favorites');
  const favCount =
    favoritesCount !== undefined
      ? favoritesCount
      : favPlaylist
      ? favPlaylist.trackIds.length
      : 0;
  // Custom playlists (exclude smart & favorites so favorites isn't duplicated)
  const customPlaylists = playlists.filter(
    (p) => !p.isSmart && p.id !== 'playlist-favorites' && p.id !== 'playlist-offline'
  );
  // Visible / Pinned playlists only: strictly limited to max 3 custom playlists + Favoris
  const visiblePlaylists = customPlaylists
    .filter((p) => p.isPinned !== false)
    .slice(0, 3);

  const navItemClass = (viewId: string) => {
    const isActive = currentView === viewId;
    return `w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left ${
      isActive
        ? ACCENT_ACTIVE[accent]
        : 'text-neutral-800 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 hover:bg-black/5 dark:hover:bg-white/5'
    }`;
  };

  return (
    <aside
      id="app-sidebar"
      className="w-64 h-full glass-sidebar border-r border-neutral-200/80 dark:border-white/10 flex flex-col justify-between select-none flex-shrink-0 z-10"
    >
      <div className="flex flex-col gap-2.5 p-2.5 overflow-y-auto scrollbar-none">
        {/* App Title & Status */}
        <div className="flex flex-col gap-1 px-1.5 pt-0.5">
          <div className="flex items-center gap-2.5 group cursor-default">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-lg border border-teal-500/40 group-hover:scale-105 transition-transform duration-300 flex-shrink-0 bg-neutral-900 ring-1 ring-cyan-400/20">
              <img
                src={flowLunaLogo}
                alt="FlowLuna Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-black text-base tracking-tight text-neutral-900 dark:text-white select-none">
              FlowLuna
            </span>
          </div>
        </div>

        {/* Command Palette Trigger */}
        {onOpenCommandPalette && (
          <button
            type="button"
            id="sidebar-command-palette-btn"
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs bg-neutral-900/90 hover:bg-neutral-800/90 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-neutral-400" />
              <span>{t.quickPalette}</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-400 font-mono text-[10px]">
              Ctrl K
            </kbd>
          </button>
        )}

        {/* Primary Navigation */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 px-3 mb-1 tracking-wider">
            {t.mainMenu}
          </span>

          <button
            type="button"
            id="nav-library-btn"
            onClick={() => onNavigate('library')}
            className={navItemClass('library')}
          >
            <Music className="w-4 h-4" />
            {t.library}
          </button>

          <button
            type="button"
            id="nav-playlists-btn"
            onClick={() => onNavigate('playlists')}
            className={navItemClass('playlists')}
          >
            <ListMusic className="w-4 h-4 text-amber-400" />
            <span>{t.allPlaylists}</span>
          </button>

          <button
            type="button"
            id="nav-videos-btn"
            onClick={() => onNavigate('videos')}
            className={navItemClass('videos')}
          >
            <Film className="w-4 h-4 text-sky-400" />
            <div className="flex items-center justify-between flex-1">
              <span>{t.videoPlayer}</span>
              {videosCount !== undefined && videosCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-300 border border-sky-500/20 font-bold">
                  {videosCount}
                </span>
              )}
            </div>
          </button>

          <button
            type="button"
            id="nav-downloader-btn"
            onClick={() => onNavigate('downloader')}
            className={navItemClass('downloader')}
          >
            <Download className="w-4 h-4 text-red-500" />
            <div className="flex items-center justify-between flex-1">
              <span>{t.downloader}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-950/80 text-red-300 border border-red-500/20 font-bold">
                yt-dlp
              </span>
            </div>
          </button>

          {/* Séparateur comme sur la capture */}
          <div className="my-1.5 border-t border-neutral-200/80 dark:border-neutral-800/90 mx-1" />

          {/* Bouton File d'attente */}
          {onOpenQueue && (
            <button
              type="button"
              id="nav-queue-btn"
              onClick={onOpenQueue}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                isQueueOpen
                  ? ACCENT_ACTIVE[accent]
                  : 'text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ListMusic className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>{t.queue}</span>
              </div>
              {queueLength !== undefined && queueLength > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 font-bold">
                  {queueLength}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Playlists */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between px-3 mb-1">
            <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">{t.playlists}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                id="manage-sidebar-playlists-btn"
                onClick={handleOpenManageSidebar}
                className="p-1 rounded text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-neutral-800 transition-colors"
                title="Gérer les playlists affichées dans le menu latéral"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id="new-playlist-btn"
                onClick={onCreatePlaylist}
                className="p-1 rounded text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-neutral-800 transition-colors"
                title="Créer une nouvelle playlist"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            {/* Playlist Favoris */}
            <button
              type="button"
              id="nav-pl-favorites"
              onClick={() => onNavigate('playlist', 'playlist-favorites')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left group ${
                currentView === 'playlist-playlist-favorites'
                  ? ACCENT_ACTIVE[accent]
                  : 'text-neutral-800 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-100 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-1">
                <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-rose-500/15 text-rose-500 border border-rose-500/20 shadow-xs">
                  <Heart className="w-3.5 h-3.5 fill-rose-500/50 text-rose-500" />
                </div>
                <span className="truncate font-semibold group-hover:text-neutral-950 dark:group-hover:text-white transition-colors">
                  Favoris
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-600 dark:text-neutral-400 font-semibold flex-shrink-0">
                {favCount}
              </span>
            </button>

            {visiblePlaylists.length === 0 && customPlaylists.length > 0 ? (
              <div className="px-3 py-2 text-center text-neutral-700 dark:text-neutral-400 text-[11px] bg-white/40 dark:bg-neutral-900/40 rounded-lg border border-neutral-300/60 dark:border-neutral-800/40 flex flex-col items-center gap-1.5 my-1">
                <span>Aucune playlist personnalisée épinglée</span>
                <button
                  type="button"
                  onClick={handleOpenManageSidebar}
                  className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline font-medium"
                >
                  Choisir les playlists visibles
                </button>
              </div>
            ) : (
              visiblePlaylists.map((pl) => {
                const viewKey = `playlist-${pl.id}`;
                const isActive = currentView === viewKey;
                return (
                  <button
                    key={pl.id}
                    type="button"
                    id={`nav-pl-${pl.id}`}
                    onClick={() => onNavigate('playlist', pl.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left group ${
                      isActive
                        ? ACCENT_ACTIVE[accent]
                        : 'text-neutral-800 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-1">
                      <PlaylistIcon playlist={pl} size="sm" showCoverIfAvailable={true} />
                      <span className="truncate font-semibold group-hover:text-neutral-950 dark:group-hover:text-white transition-colors">
                        {pl.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-600 dark:text-neutral-400 font-semibold flex-shrink-0">
                      {pl.trackIds.length}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Actions & Hardware Tools */}
      <div className="p-3 border-t border-neutral-200/80 dark:border-white/10 flex flex-col gap-2 bg-transparent">
        {/* Screenbox Fluent "Ouvrir un fichier" / "Ouvrir un dossier" */}
        <OpenFileDropdown
          onOpenFiles={onImportFiles}
          onOpenFolder={onImportFiles}
          placement="up"
          accent={accent}
          className="w-full [&>div]:w-full [&>div>button:first-child]:flex-1 [&>div>button:first-child]:justify-center"
        />

        {/* Quick Tools Row: Equalizer & Settings */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            id="sidebar-equalizer-btn"
            onClick={onOpenEqualizer}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-semibold bg-white/80 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 text-neutral-900 dark:text-neutral-200 hover:text-black dark:hover:text-white border border-neutral-300/80 dark:border-white/10 transition-all shadow-xs backdrop-blur-md whitespace-nowrap cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
            <span className="truncate">{t.equalizer}</span>
          </button>

          <button
            type="button"
            id="sidebar-settings-btn"
            onClick={onOpenSettings}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-semibold bg-white/80 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 text-neutral-900 dark:text-neutral-200 hover:text-black dark:hover:text-white border border-neutral-300/80 dark:border-white/10 transition-all shadow-xs backdrop-blur-md whitespace-nowrap cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
            <span className="truncate">{t.openSettings}</span>
          </button>
        </div>
      </div>

      {/* Modal to choose visible/pinned playlists */}
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
          onNavigate={onNavigate}
          accent={accent}
        />
      )}
    </aside>
  );
};

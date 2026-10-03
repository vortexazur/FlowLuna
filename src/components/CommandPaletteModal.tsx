import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Play,
  Pause,
  Shuffle,
  SkipForward,
  SkipBack,
  Sliders,
  Maximize2,
  Tv,
  FolderUp,
  Scissors,
  Layers,
  Copy,
  BarChart3,
  ListMusic,
  Keyboard,
  Sparkles,
  X,
  Film,
  Download,
} from 'lucide-react';
import { Track, Playlist, AccentColor } from '../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  playlists: Playlist[];
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleShuffle: () => void;
  onPlayTrack: (track: Track) => void;
  onOpenPlaylist: (playlistId: string) => void;
  onOpenEqualizer: () => void;
  onOpenMiniPlayer: () => void;
  onOpenFullscreen: () => void;
  onOpenImport: () => void;
  onOpenVideos?: () => void;
  onOpenDownloader?: () => void;
  onOpenDeduplicator: () => void;
  onOpenMerger: () => void;
  onOpenStats: () => void;
  accent: AccentColor;
}

interface ActionItem {
  id: string;
  category: 'action' | 'track' | 'playlist';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

const ACCENT_ACTIVE: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
};

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  tracks,
  playlists,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  onToggleShuffle,
  onPlayTrack,
  onOpenPlaylist,
  onOpenEqualizer,
  onOpenMiniPlayer,
  onOpenFullscreen,
  onOpenImport,
  onOpenVideos,
  onOpenDownloader,
  onOpenDeduplicator,
  onOpenMerger,
  onOpenStats,
  accent,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setShowShortcutsHelp(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items: ActionItem[] = useMemo(() => {
    const q = query.toLowerCase().trim();

    // Default global actions
    const baseActions: ActionItem[] = [
      {
        id: 'toggle-play',
        category: 'action',
        title: isPlaying ? 'Mettre en pause' : 'Lancer la lecture',
        subtitle: 'Contrôle de lecture principal',
        icon: isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />,
        shortcut: 'Espace',
        onSelect: onTogglePlay,
      },
      {
        id: 'next-track',
        category: 'action',
        title: 'Morceau suivant',
        subtitle: 'Passer à la piste d’après',
        icon: <SkipForward className="w-4 h-4 text-sky-400" />,
        shortcut: 'N',
        onSelect: onNext,
      },
      {
        id: 'prev-track',
        category: 'action',
        title: 'Morceau précédent',
        subtitle: 'Revenir à la piste d’avant',
        icon: <SkipBack className="w-4 h-4 text-sky-400" />,
        shortcut: 'P',
        onSelect: onPrev,
      },
      {
        id: 'toggle-shuffle',
        category: 'action',
        title: 'Activer / Désactiver le mode aléatoire',
        subtitle: 'Mélanger la file d’attente',
        icon: <Shuffle className="w-4 h-4 text-amber-400" />,
        shortcut: 'S',
        onSelect: onToggleShuffle,
      },
      {
        id: 'open-eq',
        category: 'action',
        title: 'Ouvrir l’Égaliseur & Effets DSP 3D',
        subtitle: '10 bandes, Spatial Audio 3D, Vitesse',
        icon: <Sliders className="w-4 h-4 text-violet-400" />,
        shortcut: 'E',
        onSelect: onOpenEqualizer,
      },
      {
        id: 'open-fullscreen',
        category: 'action',
        title: 'Mode Paroles & Plein Écran immersif',
        subtitle: 'Visualiseur graphique audio',
        icon: <Maximize2 className="w-4 h-4 text-rose-400" />,
        shortcut: 'F / L',
        onSelect: onOpenFullscreen,
      },
      {
        id: 'open-pip',
        category: 'action',
        title: 'Mode Lecteur Compact / Mini-barre d’appoint',
        subtitle: 'Barre ultra-compacte ancrable en haut/bas ou widget flottant',
        icon: <Tv className="w-4 h-4 text-cyan-400" />,
        shortcut: 'W',
        onSelect: onOpenMiniPlayer,
      },
      {
        id: 'open-videos',
        category: 'action',
        title: 'Ouvrir le Lecteur Vidéo & Clips',
        subtitle: 'Lecteur multimédia MP4, WebM, MKV, MOV avec mode cinéma',
        icon: <Film className="w-4 h-4 text-sky-400" />,
        onSelect: onOpenVideos,
      },
      {
        id: 'open-downloader',
        category: 'action',
        title: 'Ouvrir le Téléchargeur Vidéo & Musique',
        subtitle: 'Télécharger depuis YouTube, TikTok, SoundCloud, X via yt-dlp & FFmpeg',
        icon: <Download className="w-4 h-4 text-red-500" />,
        onSelect: onOpenDownloader,
      },
      {
        id: 'open-import',
        category: 'action',
        title: 'Ouvrir un fichier ou dossier audio...',
        subtitle: 'Lecture et indexation instantanée (MP3, FLAC, WAV, AAC, M4A, OGG)',
        icon: <FolderUp className="w-4 h-4 text-emerald-400" />,
        onSelect: onOpenImport,
      },
      {
        id: 'open-merger',
        category: 'action',
        title: 'Assembler & Fusionner des pistes audio',
        subtitle: 'Combiner plusieurs morceaux avec transitions fondues',
        icon: <Layers className="w-4 h-4 text-indigo-400" />,
        onSelect: onOpenMerger,
      },
      {
        id: 'open-deduplicator',
        category: 'action',
        title: 'Détecteur de doublons audio',
        subtitle: 'Nettoyer et optimiser la bibliothèque',
        icon: <Copy className="w-4 h-4 text-amber-400" />,
        onSelect: onOpenDeduplicator,
      },
      {
        id: 'open-stats',
        category: 'action',
        title: 'Statistiques & Historique d’écoute',
        subtitle: 'Temps total, artistes et titres phares',
        icon: <BarChart3 className="w-4 h-4 text-teal-400" />,
        onSelect: onOpenStats,
      },
    ];

    if (!q) {
      return baseActions;
    }

    // Filtered actions
    const matchedActions = baseActions.filter(
      (a) => a.title.toLowerCase().includes(q) || (a.subtitle && a.subtitle.toLowerCase().includes(q))
    );

    // Matching tracks (up to 8)
    const matchedTracks: ActionItem[] = tracks
      .filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q))
      .slice(0, 8)
      .map((t) => ({
        id: `track-${t.id}`,
        category: 'track',
        title: t.title,
        subtitle: `${t.artist} • ${t.album || 'Single'} (${t.format.toUpperCase()})`,
        icon: <Play className="w-4 h-4 text-emerald-400" />,
        onSelect: () => onPlayTrack(t),
      }));

    // Matching playlists
    const matchedPlaylists: ActionItem[] = playlists
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 4)
      .map((p) => ({
        id: `playlist-${p.id}`,
        category: 'playlist',
        title: p.title,
        subtitle: `${p.trackIds.length} morceau(x)`,
        icon: <ListMusic className="w-4 h-4 text-violet-400" />,
        onSelect: () => onOpenPlaylist(p.id),
      }));

    return [...matchedActions, ...matchedTracks, ...matchedPlaylists];
  }, [
    query,
    isPlaying,
    tracks,
    playlists,
    onTogglePlay,
    onNext,
    onPrev,
    onToggleShuffle,
    onOpenEqualizer,
    onOpenFullscreen,
    onOpenMiniPlayer,
    onOpenImport,
    onOpenMerger,
    onOpenDeduplicator,
    onOpenStats,
    onPlayTrack,
    onOpenPlaylist,
  ]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].onSelect();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="command-palette-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="command-palette-content"
        className="w-full max-w-2xl rounded-2xl border border-neutral-700/80 bg-neutral-900/95 text-neutral-100 shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-800">
          <Search className="w-5 h-5 text-neutral-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher un morceau, artiste, action ou commande rapide..."
            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              showShortcutsHelp
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80'
            }`}
            title="Guide des raccourcis clavier"
          >
            <Keyboard className="w-4 h-4" />
            <span className="hidden sm:inline">Raccourcis (?)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Guide Overlay if requested */}
        {showShortcutsHelp ? (
          <div className="p-5 overflow-y-auto max-h-[60vh] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-sm font-bold text-neutral-200 flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-cyan-400" />
                Raccourcis Clavier Globaux PlayZic
              </span>
              <button
                type="button"
                onClick={() => setShowShortcutsHelp(false)}
                className="text-xs text-neutral-400 hover:text-neutral-200"
              >
                Retour aux commandes
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { key: 'Espace', desc: 'Lecture / Pause instantané' },
                { key: 'Ctrl + K / Cmd + K', desc: 'Palette de commandes rapides' },
                { key: 'Flèche Gauche / Droite', desc: 'Reculer / Avancer de 5 secondes' },
                { key: 'Flèche Haut / Bas', desc: 'Ajuster le volume (±5%)' },
                { key: 'M', desc: 'Couper / Rétablir le son (Mute)' },
                { key: 'N', desc: 'Morceau suivant' },
                { key: 'P', desc: 'Morceau précédent' },
                { key: 'S', desc: 'Activer / Désactiver lecture aléatoire' },
                { key: 'R', desc: 'Changer mode répétition (Tous / 1 / Off)' },
                { key: 'E', desc: 'Ouvrir l’Égaliseur & Effets DSP 3D' },
                { key: 'F / L', desc: 'Plein Écran immersif & Paroles' },
                { key: 'X', desc: 'Arrêter la lecture (Stop complet)' },
                { key: '?', desc: 'Ouvrir cette aide de raccourcis' },
              ].map((sc, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
                  <span className="text-neutral-300">{sc.desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono text-[10px] font-bold">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Results list */
          <div className="overflow-y-auto max-h-[60vh] p-2 flex flex-col gap-1">
            {items.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
                <Sparkles className="w-6 h-6 text-neutral-600" />
                <span>Aucun résultat trouvé pour "{query}"</span>
              </div>
            ) : (
              items.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      item.onSelect();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer border ${
                      isSelected
                        ? ACCENT_ACTIVE[accent]
                        : 'border-transparent hover:bg-neutral-800/60 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-neutral-800/80 flex-shrink-0">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-neutral-100 truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-[11px] text-neutral-400 truncate">{item.subtitle}</div>
                        )}
                      </div>
                    </div>

                    {item.shortcut && (
                      <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-400 font-mono text-[10px] font-semibold flex-shrink-0 ml-2">
                        {item.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-neutral-800/80 bg-neutral-950/60 flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center gap-3">
            <span>↑↓ pour naviguer</span>
            <span>↵ pour exécuter</span>
            <span>Échap pour fermer</span>
          </div>
          <span className="font-mono">Ctrl + K</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Palette,
  Smile,
  Check,
  Upload,
  Layers,
  Edit3,
  Pin,
} from 'lucide-react';
import { Playlist, AccentColor } from '../types';
import {
  PLAYLIST_ICON_PRESETS,
  PLAYLIST_EMOJI_PRESETS,
  PLAYLIST_COLOR_PRESETS,
} from '../utils/playlistIcons';
import { PlaylistIcon } from './PlaylistIcon';

interface EditPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist | null;
  onSave: (updatedPlaylist: Playlist) => void;
  accent: AccentColor;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1528164344705-475426879c0d?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
];

const ACCENT_BTN: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white font-bold',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white font-bold',
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold',
  rose: 'bg-rose-500 hover:bg-rose-400 text-white font-bold',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold',
};

const ACCENT_BADGE: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500/20 text-emerald-400',
  violet: 'bg-violet-500/20 text-violet-400',
  blue: 'bg-blue-500/20 text-blue-400',
  amber: 'bg-amber-500/20 text-amber-400',
  rose: 'bg-rose-500/20 text-rose-400',
  cyan: 'bg-cyan-500/20 text-cyan-400',
};

const ACCENT_RANGE: Record<AccentColor, string> = {
  emerald: 'accent-emerald-500',
  violet: 'accent-violet-500',
  blue: 'accent-blue-500',
  amber: 'accent-amber-500',
  rose: 'accent-rose-500',
  cyan: 'accent-cyan-500',
};

export const EditPlaylistModal: React.FC<EditPlaylistModalProps> = ({
  isOpen,
  onClose,
  playlist,
  onSave,
  accent,
}) => {
  const [activeTab, setActiveTab] = useState<'icons' | 'emojis' | 'covers'>('icons');
  const [title, setTitle] = useState(playlist?.title || '');
  const [description, setDescription] = useState(playlist?.description || '');
  const [selectedIcon, setSelectedIcon] = useState(playlist?.icon || 'music');
  const [selectedColor, setSelectedColor] = useState(playlist?.iconColor || 'emerald');
  const [selectedCover, setSelectedCover] = useState(playlist?.coverUrl || PRESET_COVERS[0]);
  const [customEmoji, setCustomEmoji] = useState('');
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [isPinned, setIsPinned] = useState(playlist?.isPinned !== false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state when modal opens or playlist prop changes
  React.useEffect(() => {
    if (playlist) {
      setTitle(playlist.title || '');
      setDescription(playlist.description || '');
      setSelectedIcon(playlist.icon || 'music');
      setSelectedColor(playlist.iconColor || 'emerald');
      setSelectedCover(playlist.coverUrl || PRESET_COVERS[0]);
      setIsPinned(playlist.isPinned !== false);
    }
  }, [playlist, isOpen]);

  if (!isOpen || !playlist) return null;

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setSelectedCover(result);
          setCustomCoverUrl('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalCover = customCoverUrl.trim() || selectedCover;
    const finalIcon = customEmoji.trim() || selectedIcon;

    const updated: Playlist = {
      ...playlist,
      title: title.trim(),
      description: description.trim(),
      icon: finalIcon,
      iconColor: selectedColor,
      coverUrl: finalCover,
      isPinned: isPinned,
      updatedAt: Date.now(),
    };

    onSave(updated);
    onClose();
  };

  return (
    <div
      id="edit-playlist-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="edit-playlist-modal-card"
        className="w-full max-w-xl max-h-[90vh] bg-neutral-900/95 glass-modal border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-neutral-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neutral-800 text-neutral-200 border border-neutral-700/60">
              <Edit3 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Personnaliser la Playlist</h3>
              <p className="text-xs text-neutral-400">Modifier l'icône, les couleurs, le titre et l'image</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Banner */}
        <div className="px-6 py-3.5 bg-neutral-950/60 border-b border-neutral-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <PlaylistIcon
              icon={customEmoji.trim() || selectedIcon}
              iconColor={selectedColor}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate">
                  {title || 'Titre de la playlist'}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
                  {playlist.trackIds.length} pistes
                </span>
              </div>
              <span className="text-xs text-neutral-400 truncate block">
                {description || 'Aucune description'}
              </span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-neutral-500 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800 flex-shrink-0">
            Aperçu direct
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-5 max-h-[calc(90vh-210px)]">
          {/* Title & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-playlist-title" className="text-xs font-semibold text-neutral-300">
                Nom de la playlist <span className="text-rose-400">*</span>
              </label>
              <input
                id="edit-playlist-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Shamisen Masters, J-pop..."
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-playlist-desc" className="text-xs font-semibold text-neutral-300">
                Description
              </label>
              <input
                id="edit-playlist-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ambiance, genre..."
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
              />
            </div>
          </div>

          {/* Color Palette Picker */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                Couleur de l'icône & du badge
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                {PLAYLIST_COLOR_PRESETS.find((c) => c.id === selectedColor)?.name}
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-neutral-950 rounded-xl border border-neutral-800">
              {PLAYLIST_COLOR_PRESETS.map((color) => {
                const isSelected = selectedColor === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setSelectedColor(color.id)}
                    className={`group relative w-8 h-8 rounded-lg flex items-center justify-center transition-all ${color.bgClass} border ${
                      isSelected ? 'border-white scale-110 shadow-md ring-2 ring-white/20' : color.borderClass
                    }`}
                    title={color.name}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: color.hex }}
                    />
                    {isSelected && (
                      <Check className="w-3 h-3 text-white absolute inset-0 m-auto drop-shadow" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tabs: Icons vs Emojis vs Covers */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('icons')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'icons'
                      ? 'bg-neutral-800 text-white border border-neutral-700'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  Icônes Thématiques ({PLAYLIST_ICON_PRESETS.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('emojis')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'emojis'
                      ? 'bg-neutral-800 text-white border border-neutral-700'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                  }`}
                >
                  <Smile className="w-3.5 h-3.5 text-amber-400" />
                  Emojis ({PLAYLIST_EMOJI_PRESETS.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('covers')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'covers'
                      ? 'bg-neutral-800 text-white border border-neutral-700'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  Image de Couverture
                </button>
              </div>
            </div>

            {/* TAB 1: LUCIDE ICONS */}
            {activeTab === 'icons' && (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-2.5 bg-neutral-950 rounded-xl border border-neutral-800 max-h-48 overflow-y-auto">
                  {PLAYLIST_ICON_PRESETS.map((preset) => {
                    const IconComp = preset.icon;
                    const isSelected = selectedIcon === preset.id && !customEmoji;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedIcon(preset.id);
                          setCustomEmoji('');
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-neutral-800 border-white text-white scale-105 shadow-md'
                            : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                        }`}
                        title={preset.name}
                      >
                        <IconComp className="w-5 h-5 mb-1" />
                        <span className="text-[9px] truncate max-w-full text-center leading-tight">
                          {preset.name.split('/')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: EMOJIS */}
            {activeTab === 'emojis' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={2}
                    value={customEmoji}
                    onChange={(e) => {
                      setCustomEmoji(e.target.value);
                      if (e.target.value) setSelectedIcon(e.target.value);
                    }}
                    placeholder="Tapez n'importe quel émoji (ex: 🎌, 🎧, ⚡)..."
                    className="flex-1 px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                  />
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 p-2.5 bg-neutral-950 rounded-xl border border-neutral-800 max-h-44 overflow-y-auto">
                  {PLAYLIST_EMOJI_PRESETS.map((emoji, idx) => {
                    const isSelected = selectedIcon === emoji || customEmoji === emoji;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedIcon(emoji);
                          setCustomEmoji(emoji);
                        }}
                        className={`text-xl p-2 rounded-xl flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-neutral-800 border-white scale-110 shadow-md'
                            : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800/60 hover:scale-105'
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: COVERS */}
            {activeTab === 'covers' && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {PRESET_COVERS.map((cover, idx) => {
                    const isSelected = selectedCover === cover && !customCoverUrl;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedCover(cover);
                          setCustomCoverUrl('');
                        }}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          isSelected
                            ? 'border-white scale-105 shadow-md ring-2 ring-white/20'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={cover}
                          alt={`Preset ${idx + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Upload or URL */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-2 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    Importer Image PC
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />

                  <input
                    type="url"
                    value={customCoverUrl}
                    onChange={(e) => {
                      setCustomCoverUrl(e.target.value);
                      if (e.target.value) setSelectedCover(e.target.value);
                    }}
                    placeholder="Ou collez une URL d'image..."
                    className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Pin Toggle Option */}
          <div
            onClick={() => setIsPinned(!isPinned)}
            className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 cursor-pointer hover:bg-neutral-800/40 transition-colors select-none"
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${isPinned ? (ACCENT_BADGE[accent] || ACCENT_BADGE.emerald) : 'bg-neutral-800 text-neutral-500'}`}>
                <Pin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">
                  Afficher dans le menu latéral (Barre de gauche)
                </span>
                <span className="text-[11px] text-neutral-400 block">
                  {isPinned
                    ? 'Visible sous la section PLAYLISTS du menu principal'
                    : 'Masquée du menu latéral (accessible via « Toutes les Playlists »)'}
                </span>
              </div>
            </div>

            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className={`w-4 h-4 rounded bg-neutral-800 border-neutral-700 cursor-pointer ${ACCENT_RANGE[accent] || 'accent-emerald-500'}`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${ACCENT_BTN[accent]}`}
            >
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

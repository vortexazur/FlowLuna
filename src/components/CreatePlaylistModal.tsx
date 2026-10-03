import React, { useState, useRef } from 'react';
import {
  ListMusic,
  X,
  Sparkles,
  Image as ImageIcon,
  Palette,
  Smile,
  Check,
  Upload,
  Pin,
} from 'lucide-react';
import { AccentColor } from '../types';
import {
  PLAYLIST_ICON_PRESETS,
  PLAYLIST_EMOJI_PRESETS,
  PLAYLIST_COLOR_PRESETS,
} from '../utils/playlistIcons';
import { PlaylistIcon } from './PlaylistIcon';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    title: string,
    description?: string,
    coverUrl?: string,
    icon?: string,
    iconColor?: string,
    isPinned?: boolean
  ) => void;
  accent: AccentColor;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
];

const ACCENT_BTN: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white font-bold',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white font-bold',
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold',
  rose: 'bg-rose-500 hover:bg-rose-400 text-white font-bold',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold',
};

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  accent,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'icons' | 'emojis' | 'covers'>('icons');
  const [selectedIcon, setSelectedIcon] = useState('music');
  const [selectedColor, setSelectedColor] = useState('emerald');
  const [customEmoji, setCustomEmoji] = useState('');
  const [selectedCover, setSelectedCover] = useState(PRESET_COVERS[0]);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [isPinned, setIsPinned] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

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
    const finalTitle = title.trim();
    if (!finalTitle) return;

    const finalCover = customCoverUrl.trim() || selectedCover;
    const finalIcon = customEmoji.trim() || selectedIcon;

    onCreate(finalTitle, description.trim(), finalCover, finalIcon, selectedColor, isPinned);
    setTitle('');
    setDescription('');
    setCustomCoverUrl('');
    setCustomEmoji('');
    setSelectedIcon('music');
    setIsPinned(true);
    onClose();
  };

  return (
    <div
      id="create-playlist-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="create-playlist-modal-card"
        className="w-full max-w-xl max-h-[90vh] bg-neutral-900/95 glass-modal border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-neutral-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-neutral-800 text-neutral-200 border border-neutral-700/60">
              <ListMusic className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Nouvelle Playlist</h3>
              <p className="text-xs text-neutral-400">Personnalisez le nom, l'icône et la couleur</p>
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

        {/* Live Preview */}
        <div className="px-6 py-3 bg-neutral-950/60 border-b border-neutral-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PlaylistIcon
              icon={customEmoji.trim() || selectedIcon}
              iconColor={selectedColor}
              size="md"
            />
            <div className="min-w-0">
              <span className="text-xs font-bold text-white truncate block">
                {title || 'Ma Playlist Personnalisée'}
              </span>
              <span className="text-[11px] text-neutral-400 truncate block">
                {description || 'Icône personnalisée pour le menu et la bibliothèque'}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
            Aperçu
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-4 max-h-[calc(90vh-190px)]">
          {/* Title input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="playlist-title-input" className="text-xs font-semibold text-neutral-300">
              Nom de la playlist <span className="text-rose-400">*</span>
            </label>
            <input
              id="playlist-title-input"
              type="text"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Électro Workout, Shamisen Masters, Chill Soirée..."
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>

          {/* Description input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="playlist-desc-input" className="text-xs font-semibold text-neutral-300">
              Description (optionnelle)
            </label>
            <input
              id="playlist-desc-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ajoutez quelques mots sur l'ambiance de cette playlist..."
              className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>

          {/* Color Selection */}
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
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-neutral-950 rounded-xl border border-neutral-800">
              {PLAYLIST_COLOR_PRESETS.map((color) => {
                const isSelected = selectedColor === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setSelectedColor(color.id)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${color.bgClass} border ${
                      isSelected ? 'border-white scale-110 shadow-md ring-2 ring-white/20' : color.borderClass
                    }`}
                    title={color.name}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
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
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 border-b border-neutral-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('icons')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'icons'
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                Icônes ({PLAYLIST_ICON_PRESETS.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('emojis')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'emojis'
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Smile className="w-3.5 h-3.5 text-amber-400" />
                Emojis
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('covers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'covers'
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                Couverture
              </button>
            </div>

            {/* TAB 1: LUCIDE ICONS */}
            {activeTab === 'icons' && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-2 bg-neutral-950 rounded-xl border border-neutral-800 max-h-40 overflow-y-auto">
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
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-neutral-800 border-white text-white scale-105 shadow-md'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                      title={preset.name}
                    >
                      <IconComp className="w-4 h-4 mb-1" />
                      <span className="text-[8px] truncate max-w-full text-center">
                        {preset.name.split('/')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB 2: EMOJIS */}
            {activeTab === 'emojis' && (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  maxLength={2}
                  value={customEmoji}
                  onChange={(e) => {
                    setCustomEmoji(e.target.value);
                    if (e.target.value) setSelectedIcon(e.target.value);
                  }}
                  placeholder="Tapez un émoji (ex: 🎌, 🎧, ⚡, 🌸)..."
                  className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                />
                <div className="grid grid-cols-8 gap-1.5 p-2 bg-neutral-950 rounded-xl border border-neutral-800 max-h-36 overflow-y-auto">
                  {PLAYLIST_EMOJI_PRESETS.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedIcon(emoji);
                        setCustomEmoji(emoji);
                      }}
                      className={`text-lg p-1.5 rounded-lg border transition-all ${
                        selectedIcon === emoji || customEmoji === emoji
                          ? 'bg-neutral-800 border-white scale-110 shadow-md'
                          : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800/60'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: COVERS */}
            {activeTab === 'covers' && (
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COVERS.map((cover, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedCover(cover);
                      setCustomCoverUrl('');
                    }}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      selectedCover === cover && !customCoverUrl
                        ? 'border-white scale-105 shadow-md'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={cover}
                      alt={`Thème ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Pin Toggle Option */}
          <div
            onClick={() => setIsPinned(!isPinned)}
            className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 cursor-pointer hover:bg-neutral-800/40 transition-colors select-none"
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${isPinned ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}>
                <Pin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">
                  Afficher dans le menu latéral (Barre de gauche)
                </span>
                <span className="text-[11px] text-neutral-400 block">
                  {isPinned
                    ? 'Cette playlist apparaîtra directement sous la section PLAYLISTS'
                    : 'Accessible uniquement via la page « Toutes les Playlists »'}
                </span>
              </div>
            </div>

            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 bg-neutral-800 border-neutral-700 cursor-pointer"
            />
          </div>

          {/* Actions */}
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
              disabled={!title.trim()}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${ACCENT_BTN[accent]}`}
            >
              Créer la playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

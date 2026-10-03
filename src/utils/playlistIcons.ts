import React from 'react';
import {
  Music,
  Headphones,
  Disc,
  Radio,
  Mic,
  Flame,
  Sparkles,
  Heart,
  Zap,
  Coffee,
  Moon,
  Sun,
  Gamepad2,
  Film,
  Car,
  Dumbbell,
  Code,
  BookOpen,
  Trophy,
  Leaf,
  Compass,
  Tv,
  Star,
  Volume2,
  Smile,
  PartyPopper,
  Guitar,
  Folder,
  ListMusic,
  HardDrive,
  Youtube,
  Cloud,
  Layers,
  LucideIcon,
} from 'lucide-react';

export interface IconPreset {
  id: string;
  name: string;
  icon: LucideIcon;
  category: 'music' | 'mood' | 'activity' | 'genre';
}

export const PLAYLIST_ICON_PRESETS: IconPreset[] = [
  // Music & Audio
  { id: 'music', name: 'Musique', icon: Music, category: 'music' },
  { id: 'headphones', name: 'Casque', icon: Headphones, category: 'music' },
  { id: 'disc', name: 'Vinyle', icon: Disc, category: 'music' },
  { id: 'radio', name: 'Radio', icon: Radio, category: 'music' },
  { id: 'mic', name: 'Micro', icon: Mic, category: 'music' },
  { id: 'guitar', name: 'Guitare', icon: Guitar, category: 'music' },
  { id: 'volume', name: 'Volume', icon: Volume2, category: 'music' },
  { id: 'list', name: 'Playlist', icon: ListMusic, category: 'music' },

  // Mood & Vibes
  { id: 'flame', name: 'Flamme / Tendance', icon: Flame, category: 'mood' },
  { id: 'sparkles', name: 'Étincelles / Magie', icon: Sparkles, category: 'mood' },
  { id: 'heart', name: 'Cœur / Favoris', icon: Heart, category: 'mood' },
  { id: 'zap', name: 'Éclair / Énergie', icon: Zap, category: 'mood' },
  { id: 'star', name: 'Étoile', icon: Star, category: 'mood' },
  { id: 'moon', name: 'Nuit / Chill', icon: Moon, category: 'mood' },
  { id: 'sun', name: 'Soleil / Été', icon: Sun, category: 'mood' },
  { id: 'party', name: 'Fête', icon: PartyPopper, category: 'mood' },
  { id: 'smile', name: 'Bonne Humeur', icon: Smile, category: 'mood' },

  // Activities & Lifestyle
  { id: 'coffee', name: 'Café / Détente', icon: Coffee, category: 'activity' },
  { id: 'gamepad', name: 'Jeux Vidéo / Gaming', icon: Gamepad2, category: 'activity' },
  { id: 'dumbbell', name: 'Sport / Workout', icon: Dumbbell, category: 'activity' },
  { id: 'car', name: 'Conduite / Roadtrip', icon: Car, category: 'activity' },
  { id: 'code', name: 'Code / Focus', icon: Code, category: 'activity' },
  { id: 'book', name: 'Lecture / Étude', icon: BookOpen, category: 'activity' },
  { id: 'trophy', name: 'Victoire / Best Of', icon: Trophy, category: 'activity' },
  { id: 'compass', name: 'Voyage / Évasion', icon: Compass, category: 'activity' },

  // Genres & Styles
  { id: 'film', name: 'Cinéma / OST', icon: Film, category: 'genre' },
  { id: 'tv', name: 'Séries / Anime', icon: Tv, category: 'genre' },
  { id: 'leaf', name: 'Nature / Acoustique', icon: Leaf, category: 'genre' },
  { id: 'folder', name: 'Dossier', icon: Folder, category: 'genre' },
  { id: 'layers', name: 'Mix / Compilation', icon: Layers, category: 'genre' },
  { id: 'harddrive', name: 'Local / PC', icon: HardDrive, category: 'genre' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, category: 'genre' },
  { id: 'cloud', name: 'Cloud', icon: Cloud, category: 'genre' },
];

export const PLAYLIST_EMOJI_PRESETS = [
  '🎵', '🎧', '🔥', '⚡', '💖', '🌙', '☀️', '☕',
  '🎮', '🎌', '🌸', '🏖️', '🚀', '💎', '👑', '🎬',
  '🚗', '🎹', '🎸', '🥁', '🎤', '🍣', '🍙', '⛩️',
  '👾', '🌌', '✨', '🍿', '💤', '🏋️', '🌊', '🏮',
  '🍁', '🔮', '🛸', '🏆', '🎯', '🎨', '🏖️', '💿'
];

export interface ColorPreset {
  id: string;
  name: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hex: string;
}

export const PLAYLIST_COLOR_PRESETS: ColorPreset[] = [
  { id: 'emerald', name: 'Émeraude', bgClass: 'bg-emerald-500/20', textClass: 'text-emerald-400', borderClass: 'border-emerald-500/30', hex: '#10b981' },
  { id: 'violet', name: 'Violet', bgClass: 'bg-violet-500/20', textClass: 'text-violet-400', borderClass: 'border-violet-500/30', hex: '#8b5cf6' },
  { id: 'blue', name: 'Bleu Océan', bgClass: 'bg-blue-500/20', textClass: 'text-blue-400', borderClass: 'border-blue-500/30', hex: '#3b82f6' },
  { id: 'amber', name: 'Ambre / Or', bgClass: 'bg-amber-500/20', textClass: 'text-amber-400', borderClass: 'border-amber-500/30', hex: '#f59e0b' },
  { id: 'rose', name: 'Rose', bgClass: 'bg-rose-500/20', textClass: 'text-rose-400', borderClass: 'border-rose-500/30', hex: '#f43f5e' },
  { id: 'cyan', name: 'Cyan / Néon', bgClass: 'bg-cyan-500/20', textClass: 'text-cyan-400', borderClass: 'border-cyan-500/30', hex: '#06b6d4' },
  { id: 'red', name: 'Rouge Écarlate', bgClass: 'bg-red-500/20', textClass: 'text-red-400', borderClass: 'border-red-500/30', hex: '#ef4444' },
  { id: 'orange', name: 'Orange', bgClass: 'bg-orange-500/20', textClass: 'text-orange-400', borderClass: 'border-orange-500/30', hex: '#f97316' },
  { id: 'lime', name: 'Lime', bgClass: 'bg-lime-500/20', textClass: 'text-lime-400', borderClass: 'border-lime-500/30', hex: '#84cc16' },
  { id: 'fuchsia', name: 'Fuchsia', bgClass: 'bg-fuchsia-500/20', textClass: 'text-fuchsia-400', borderClass: 'border-fuchsia-500/30', hex: '#d946ef' },
  { id: 'neutral', name: 'Gris Neutre', bgClass: 'bg-neutral-800', textClass: 'text-neutral-300', borderClass: 'border-neutral-700', hex: '#737373' },
];

export function getLucideIconComponent(iconId?: string): LucideIcon | null {
  if (!iconId) return null;
  const match = PLAYLIST_ICON_PRESETS.find((p) => p.id.toLowerCase() === iconId.toLowerCase());
  return match ? match.icon : null;
}

export function isEmoji(str?: string): boolean {
  if (!str) return false;
  // Simple check for unicode emojis
  return /\p{Extended_Pictographic}/u.test(str);
}

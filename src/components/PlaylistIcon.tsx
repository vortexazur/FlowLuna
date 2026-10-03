import React from 'react';
import {
  ListMusic,
  Heart,
  HardDrive,
  Youtube,
  Music,
  Disc,
} from 'lucide-react';
import { Playlist } from '../types';
import {
  getLucideIconComponent,
  isEmoji,
  PLAYLIST_COLOR_PRESETS,
} from '../utils/playlistIcons';

interface PlaylistIconProps {
  playlist?: Partial<Playlist> | null;
  icon?: string;
  iconColor?: string;
  coverUrl?: string;
  isSmart?: boolean;
  smartType?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showCoverIfAvailable?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: { box: 'w-4 h-4 text-[10px] rounded', icon: 'w-2.5 h-2.5', text: 'text-[9px]' },
  sm: { box: 'w-6 h-6 text-xs rounded-md', icon: 'w-3.5 h-3.5', text: 'text-[11px]' },
  md: { box: 'w-8 h-8 text-sm rounded-lg', icon: 'w-4 h-4', text: 'text-sm' },
  lg: { box: 'w-10 h-10 text-base rounded-xl', icon: 'w-5 h-5', text: 'text-base' },
  xl: { box: 'w-14 h-14 text-xl rounded-2xl', icon: 'w-7 h-7', text: 'text-2xl' },
  '2xl': { box: 'w-20 h-20 text-3xl rounded-2xl', icon: 'w-10 h-10', text: 'text-4xl' },
};

export const PlaylistIcon: React.FC<PlaylistIconProps> = ({
  playlist,
  icon: explicitIcon,
  iconColor: explicitColor,
  coverUrl: explicitCover,
  isSmart: explicitIsSmart,
  smartType: explicitSmartType,
  size = 'sm',
  showCoverIfAvailable = false,
  className = '',
}) => {
  const icon = explicitIcon !== undefined ? explicitIcon : playlist?.icon;
  const iconColor = explicitColor !== undefined ? explicitColor : playlist?.iconColor;
  const coverUrl = explicitCover !== undefined ? explicitCover : playlist?.coverUrl;
  const isSmart = explicitIsSmart !== undefined ? explicitIsSmart : playlist?.isSmart;
  const smartType = explicitSmartType !== undefined ? explicitSmartType : playlist?.smartType;

  const currentSize = SIZE_MAP[size] || SIZE_MAP.sm;

  // Resolve color preset
  const colorPreset = PLAYLIST_COLOR_PRESETS.find(
    (c) => c.id === iconColor || c.hex === iconColor
  ) || PLAYLIST_COLOR_PRESETS[0];

  // If cover thumbnail requested and valid
  if (showCoverIfAvailable && coverUrl && !icon) {
    return (
      <div
        className={`${currentSize.box} overflow-hidden bg-neutral-900 border border-neutral-800 flex-shrink-0 shadow-xs ${className}`}
      >
        <img
          src={coverUrl}
          alt={playlist?.title || 'Playlist'}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Smart Playlists special defaults
  if (isSmart || playlist?.id?.startsWith('playlist-')) {
    if (smartType === 'favorites' || playlist?.id === 'playlist-favorites') {
      return (
        <div
          className={`${currentSize.box} bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center flex-shrink-0 shadow-xs ${className}`}
          title="Favoris"
        >
          <Heart className={`${currentSize.icon} fill-current`} />
        </div>
      );
    }
    if (smartType === 'offline' || playlist?.id === 'playlist-offline') {
      return (
        <div
          className={`${currentSize.box} bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-xs ${className}`}
          title="Hors-ligne"
        >
          <HardDrive className={currentSize.icon} />
        </div>
      );
    }
    if (smartType === 'youtube' || playlist?.id === 'playlist-youtube') {
      return (
        <div
          className={`${currentSize.box} bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center flex-shrink-0 shadow-xs ${className}`}
          title="YouTube"
        >
          <Youtube className={currentSize.icon} />
        </div>
      );
    }
  }

  // Check if icon is an Emoji
  if (icon && (isEmoji(icon) || icon.length <= 4)) {
    return (
      <div
        className={`${currentSize.box} ${colorPreset.bgClass} border ${colorPreset.borderClass} flex items-center justify-center flex-shrink-0 shadow-xs ${className}`}
      >
        <span className={`${currentSize.text} leading-none select-none`}>{icon}</span>
      </div>
    );
  }

  // Check if icon is a registered Lucide Icon ID
  const LucideComponent = getLucideIconComponent(icon);
  if (LucideComponent) {
    return (
      <div
        className={`${currentSize.box} ${colorPreset.bgClass} border ${colorPreset.borderClass} ${colorPreset.textClass} flex items-center justify-center flex-shrink-0 shadow-xs ${className}`}
      >
        <LucideComponent className={currentSize.icon} />
      </div>
    );
  }

  // If there's a custom cover and no icon set
  if (coverUrl) {
    return (
      <div
        className={`${currentSize.box} overflow-hidden bg-neutral-900 border border-neutral-800 flex-shrink-0 shadow-xs ${className}`}
      >
        <img
          src={coverUrl}
          alt={playlist?.title || 'Playlist'}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Default fallback icon
  return (
    <div
      className={`${currentSize.box} ${colorPreset.bgClass} border ${colorPreset.borderClass} ${colorPreset.textClass} flex items-center justify-center flex-shrink-0 shadow-xs ${className}`}
    >
      <ListMusic className={currentSize.icon} />
    </div>
  );
};

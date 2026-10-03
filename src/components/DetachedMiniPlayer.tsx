import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Track, AccentColor, PlayerSettings } from '../types';
import { MiniPlayerPiP } from './MiniPlayerPiP';

export interface DetachedMiniPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  accent: AccentColor;
  settings?: PlayerSettings;
  onUpdateSettings?: (settings: PlayerSettings) => void;
  onClose: () => void;
  targetWindow?: Window | null;
}

const ACCENT_COLORS: Record<AccentColor, string> = {
  emerald: '#10b981',
  violet: '#8b5cf6',
  blue: '#3b82f6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  cyan: '#06b6d4',
};

export const DetachedMiniPlayerUI: React.FC<DetachedMiniPlayerProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onStop,
  onPrev,
  onNext,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  isFavorite,
  onToggleFavorite,
  accent,
  onClose,
}) => {
  const handleFocusMainWindow = () => {
    try {
      if (window.opener) {
        window.opener.focus();
      } else {
        window.focus();
      }
    } catch {}
  };

  return (
    <MiniPlayerPiP
      title={currentTrack?.title || 'Sélectionnez un titre'}
      artist={currentTrack?.artist || 'Lecteur prêt'}
      coverUrl={
        currentTrack?.coverUrl ||
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
      }
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={duration}
      volume={volume}
      isFavorite={isFavorite}
      isMuted={isMuted}
      onPlayToggle={onTogglePlay}
      onStop={onStop}
      onNext={onNext}
      onPrev={onPrev}
      onSeek={onSeek}
      onVolumeChange={onVolumeChange}
      onToggleMute={onToggleMute}
      onToggleFavorite={onToggleFavorite}
      onExpand={handleFocusMainWindow}
      onDetach={onClose}
      accentColor={ACCENT_COLORS[accent] || '#f59e0b'}
    />
  );
};

export const DetachedMiniPlayerPortal: React.FC<DetachedMiniPlayerProps> = (props) => {
  const { targetWindow, onClose } = props;

  useEffect(() => {
    if (!targetWindow) return;

    const handlePageHide = () => {
      onClose();
    };

    targetWindow.addEventListener('pagehide', handlePageHide);
    targetWindow.addEventListener('beforeunload', handlePageHide);

    return () => {
      try {
        targetWindow.removeEventListener('pagehide', handlePageHide);
        targetWindow.removeEventListener('beforeunload', handlePageHide);
      } catch {}
    };
  }, [targetWindow, onClose]);

  if (!targetWindow || !targetWindow.document || !targetWindow.document.body) {
    return null;
  }

  return createPortal(<DetachedMiniPlayerUI {...props} />, targetWindow.document.body);
};

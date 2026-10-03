import React from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  ListPlus,
  ExternalLink,
  Maximize2,
} from 'lucide-react';

export interface MiniPlayerPiPProps {
  title: string;
  artist: string;
  coverUrl: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isFavorite: boolean;
  isMuted?: boolean;
  onPlayToggle: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (val: number) => void;
  onVolumeChange: (val: number) => void;
  onToggleMute?: () => void;
  onToggleFavorite: () => void;
  onExpand?: () => void;
  onDetach?: () => void;
  onAddToPlaylist?: () => void;
  accentColor?: string;
}

const formatTime = (sec: number): string => {
  if (isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const MiniPlayerPiP: React.FC<MiniPlayerPiPProps> = ({
  title,
  artist,
  coverUrl,
  isPlaying,
  currentTime,
  duration,
  volume,
  isFavorite,
  isMuted = false,
  onPlayToggle,
  onStop,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFavorite,
  onExpand,
  onDetach,
  onAddToPlaylist,
  accentColor = '#f59e0b',
}) => {
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const volumePercent = isMuted ? 0 : Math.min(100, Math.max(0, volume * 100));

  return (
    <div className="pip-root" id="mini-player-pip-component">
      <div className="pip-container">
        {/* En-tête : MINI LECTEUR + Visualiseur + Actions */}
        <header className="pip-header">
          <span className="pip-label">MINI LECTEUR</span>

          <div className="pip-visualizer" title="Visualiseur audio">
            {Array.from({ length: 24 }).map((_, i) => {
              const baseHeight = Math.sin(i * 0.5) * 35 + 50;
              const animatedHeight = isPlaying ? baseHeight : Math.max(15, baseHeight * 0.25);
              return (
                <span
                  key={i}
                  className={`pip-bar ${isPlaying ? 'pip-bar-animated' : ''}`}
                  style={{
                    height: `${animatedHeight}%`,
                    background: `linear-gradient(to top, #d97706, ${accentColor})`,
                  }}
                />
              );
            })}
          </div>

          <div className="pip-header-actions">
            {onDetach && (
              <button
                type="button"
                className="pip-icon-btn"
                onClick={onDetach}
                title="Détacher (Always-on-top)"
              >
                <ExternalLink className="pip-svg" />
              </button>
            )}
            {onExpand && (
              <button
                type="button"
                className="pip-icon-btn"
                onClick={onExpand}
                title="Agrandir l'application"
              >
                <Maximize2 className="pip-svg" />
              </button>
            )}
          </div>
        </header>

        {/* Section Médium : Cover + Titre + Playlist / Favoris */}
        <section className="pip-track-section">
          <img
            src={
              coverUrl ||
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
            }
            alt={title || 'Lecture'}
            className="pip-cover"
            referrerPolicy="no-referrer"
          />

          <div className="pip-meta">
            <h3 className="pip-title" title={title}>
              {title || 'Sélectionnez un titre'}
            </h3>
            <p className="pip-artist" title={artist}>
              {artist || 'Lecteur prêt'}
            </p>
          </div>

          <div className="pip-track-actions">
            {onAddToPlaylist && (
              <button
                type="button"
                className="pip-icon-btn"
                onClick={onAddToPlaylist}
                title="Ajouter à la playlist"
              >
                <ListPlus className="pip-svg-md" />
              </button>
            )}
            <button
              type="button"
              className={`pip-icon-btn ${isFavorite ? 'active-fav' : ''}`}
              onClick={onToggleFavorite}
              title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart
                className="pip-svg-md"
                fill={isFavorite ? '#ef4444' : 'none'}
                color={isFavorite ? '#ef4444' : '#9ca3af'}
              />
            </button>
          </div>
        </section>

        {/* Barre de Progression + Horodatage (Image 2) */}
        <section className="pip-progress-section">
          <span className="pip-time">{formatTime(currentTime)}</span>
          <div className="pip-slider-wrapper">
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 100}
              step={0.5}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="pip-range-input"
              style={{
                background: `linear-gradient(to right, ${accentColor} ${progressPercent}%, #374151 0%)`,
              }}
            />
          </div>
          <span className="pip-time">{formatTime(duration)}</span>
        </section>

        {/* Barre Inférieure : Volume + Contrôles Principaux */}
        <footer className="pip-controls-footer">
          <div className="pip-volume-box">
            <button
              type="button"
              className="pip-icon-btn"
              onClick={onToggleMute}
              title={isMuted ? 'Activer le son' : 'Couper le son'}
              style={{ padding: 0 }}
            >
              {isMuted ? (
                <VolumeX className="pip-svg-sm" color="#ef4444" />
              ) : (
                <Volume2 className="pip-svg-sm text-gray" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="pip-range-input pip-volume-range"
              style={{
                background: `linear-gradient(to right, ${accentColor} ${volumePercent}%, #374151 0%)`,
              }}
            />
          </div>

          <div className="pip-main-controls">
            <button
              type="button"
              className="pip-btn-ctrl"
              onClick={onPrev}
              title="Morceau précédent"
            >
              <SkipBack className="pip-svg-lg" />
            </button>
            <button
              type="button"
              className="pip-btn-play"
              onClick={onPlayToggle}
              style={{ backgroundColor: accentColor }}
              title={isPlaying ? 'Pause' : 'Lecture'}
            >
              {isPlaying ? (
                <Pause className="pip-svg-play" fill="#000" color="#000" />
              ) : (
                <Play className="pip-svg-play ml-v" fill="#000" color="#000" />
              )}
            </button>
            <button
              type="button"
              className="pip-btn-ctrl"
              onClick={onStop}
              title="Arrêter la lecture"
            >
              <Square className="pip-svg-sm" fill="currentColor" />
            </button>
            <button
              type="button"
              className="pip-btn-ctrl"
              onClick={onNext}
              title="Morceau suivant"
            >
              <SkipForward className="pip-svg-lg" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
export const PiPPlayer = MiniPlayerPiP;

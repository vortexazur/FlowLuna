import React, { useState } from 'react';
import {
  Film,
  Play,
  Upload,
  Maximize2,
  Trash2,
  MoreVertical,
  Clock,
  Sparkles,
  HardDrive,
  FolderDown,
  Scissors,
} from 'lucide-react';
import { Track, AccentColor } from '../types';

interface VideosViewProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track, trackList?: Track[]) => void;
  onOpenVideoTheater: () => void;
  onImportFiles: (files: FileList | File[]) => void;
  onDeleteTrack?: (track: Track) => void;
  onOpenTrimmer?: (track: Track) => void;
  accent: AccentColor;
}

export const VideosView: React.FC<VideosViewProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onOpenVideoTheater,
  onImportFiles,
  onDeleteTrack,
  onOpenTrimmer,
  accent,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);

  const videoTracks = tracks.filter((t) => t.isVideo);
  const currentVideo = videoTracks.find((t) => t.id === currentTrackId);

  const formatDuration = (secs: number) => {
    const total = Math.max(0, Math.floor(secs));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(e.target.files);
    }
    e.target.value = '';
  };

  return (
    <div id="videos-view" className="flex-1 h-full overflow-y-auto p-6 md:p-8 flex flex-col gap-6 select-none">
      {/* Hidden file input for videos */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,.mp4,.mkv,.webm,.mov,.avi,.m4v"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-white/10 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 dark:border-sky-500/30 text-sky-600 dark:text-sky-400 shadow-sm backdrop-blur-md">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>Lecteur Vidéo</span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 dark:border-sky-500/30 text-sky-700 dark:text-sky-400">
                {videoTracks.length} {videoTracks.length > 1 ? 'vidéos' : 'vidéo'}
              </span>
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 font-medium">
              Lecture fluide MP4, WebM, MKV, MOV avec son Hi-Fi et égaliseur matériel
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-lg hover:shadow-sky-500/20 active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Importer une vidéo...</span>
          </button>
        </div>
      </div>

      {/* Currently Playing Banner (if a video is active) */}
      {currentVideo && (
        <div className="relative rounded-2xl glass-card border border-sky-500/30 bg-sky-500/10 p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl overflow-hidden group backdrop-blur-xl">
          <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
            <div className="relative w-24 h-16 md:w-32 md:h-20 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
              <img
                src={currentVideo.coverUrl}
                alt={currentVideo.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-lg animate-pulse">
                  <Play className="w-4 h-4 fill-white translate-x-0.5" />
                </div>
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                En cours de lecture
              </span>
              <h3 className="text-neutral-900 dark:text-white font-bold text-sm md:text-base truncate mt-0.5">
                {currentVideo.title}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-300 truncate">
                {currentVideo.artist} • {formatDuration(currentVideo.duration)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenVideoTheater}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Ouvrir en mode Cinéma</span>
          </button>
        </div>
      )}

      {/* Videos List / Grid */}
      {videoTracks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-white/15 rounded-3xl glass-card my-auto">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-sky-400 mb-4 shadow-inner backdrop-blur-md">
            <Film className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-1.5">Aucune vidéo importée</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mb-6 leading-relaxed">
            Glissez-déposez vos fichiers vidéo (MP4, WebM, MKV, MOV, AVI) ou cliquez sur le bouton ci-dessous pour lancer la lecture avec accélération et audio enrichi.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Choisir un fichier vidéo sur votre PC</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {videoTracks.map((track) => {
            const isCurrent = currentTrackId === track.id;

            return (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track, videoTracks)}
                className={`group relative rounded-2xl glass-card border transition-all duration-200 p-3 flex flex-col gap-3 cursor-pointer shadow-sm hover:shadow-xl ${
                  isCurrent
                    ? 'border-sky-500/60 ring-2 ring-sky-500/40 bg-sky-500/15'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Video Thumbnail */}
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                      <Play className="w-5 h-5 fill-current translate-x-0.5" />
                    </div>
                  </div>

                  {/* Top Badge: Format & Resolution */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/75 text-sky-300 backdrop-blur-md border border-white/10">
                      {track.format}
                      {track.videoHeight ? ` ${track.videoHeight}p` : ''}
                    </span>
                  </div>

                  {/* Bottom Right: Duration */}
                  <div className="absolute bottom-2 right-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/80 text-white backdrop-blur-md border border-white/10">
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                </div>

                {/* Info & Options */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 group-hover:text-black dark:group-hover:text-white truncate">
                      {track.title}
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {track.artist}
                    </p>
                  </div>

                  {onDeleteTrack && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTrack(track);
                      }}
                      className="p-1 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
                      title="Supprimer la vidéo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

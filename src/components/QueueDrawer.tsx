import React, { useRef } from 'react';
import {
  ListMusic,
  X,
  Trash2,
  Play,
  ArrowUp,
  ArrowDown,
  PlusSquare,
  Plus,
  Music,
} from 'lucide-react';
import { Track, AccentColor } from '../types';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Track[];
  currentTrackIndex: number;
  onSelectTrack: (index: number) => void;
  onRemoveFromQueue: (index: number) => void;
  onMoveQueueItem: (from: number, to: number) => void;
  onClearQueue: () => void;
  onSaveQueueAsPlaylist?: () => void;
  onAddMediaToQueue?: (files: FileList | File[]) => void;
  accent: AccentColor;
}

const ACCENT_TEXT: Record<AccentColor, string> = {
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  cyan: 'text-cyan-400',
};

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  queue,
  currentTrackIndex,
  onSelectTrack,
  onRemoveFromQueue,
  onMoveQueueItem,
  onClearQueue,
  onSaveQueueAsPlaylist,
  onAddMediaToQueue,
  accent,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentTrack = queue[currentTrackIndex];
  const upcomingTracks = queue.slice(currentTrackIndex + 1);

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (onAddMediaToQueue) {
        onAddMediaToQueue(e.target.files);
      }
    }
    e.target.value = '';
  };

  return (
    <div
      id="queue-drawer-backdrop"
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="queue-drawer-panel"
        className="w-full max-w-md h-full bg-neutral-900 border-l border-neutral-800 text-neutral-100 flex flex-col shadow-2xl p-6 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden input to pick videos or audio files to append to queue */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,.mp4,.mkv,.webm,.mov,.avi,.m4v,.mp3,.flac,.wav,.ogg,.m4a,.aac"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <ListMusic className={`w-5 h-5 ${ACCENT_TEXT[accent]}`} />
            <h3 className="text-base font-bold">File d'attente ({queue.length})</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="queue-add-media-btn"
              onClick={handleAddClick}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Ajouter des vidéos ou morceaux à la file"
            >
              <PlusSquare className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              type="button"
              onClick={onClearQueue}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
              title="Vider la file"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Playing */}
        {currentTrack && (
          <div className="mb-5">
            <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2 block">
              En cours de lecture
            </span>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
              <img
                src={
                  currentTrack.coverUrl ||
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
                }
                alt={currentTrack.title}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-semibold truncate ${ACCENT_TEXT[accent]}`}>{currentTrack.title}</h4>
                <p className="text-xs text-neutral-400 truncate">{currentTrack.artist}</p>
              </div>
              <span className="text-xs font-mono text-neutral-400">
                {Math.floor(currentTrack.duration / 60)}:
                {(currentTrack.duration % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        )}

        {/* Upcoming List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-1 block">
            À suivre ensuite ({upcomingTracks.length})
          </span>

          {upcomingTracks.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-sm">
              La file d'attente est vide. Ajoutez des titres depuis la bibliothèque ou vos playlists.
            </div>
          ) : (
            upcomingTracks.map((track, i) => {
              const realIndex = currentTrackIndex + 1 + i;
              return (
                <div
                  key={`${track.id}-${realIndex}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-neutral-950/30 hover:bg-neutral-800/50 border border-neutral-800/50 group transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onSelectTrack(realIndex)}
                    className="p-1 rounded-md text-neutral-400 group-hover:text-white"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <div className="flex-1 min-w-0" onClick={() => onSelectTrack(realIndex)}>
                    <h5 className="text-xs font-semibold text-neutral-200 truncate cursor-pointer">{track.title}</h5>
                    <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                  </div>

                  {/* Move Up/Down Controls */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {realIndex > currentTrackIndex + 1 && (
                      <button
                        type="button"
                        onClick={() => onMoveQueueItem(realIndex, realIndex - 1)}
                        className="p-1 text-neutral-400 hover:text-white"
                        title="Monter"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {realIndex < queue.length - 1 && (
                      <button
                        type="button"
                        onClick={() => onMoveQueueItem(realIndex, realIndex + 1)}
                        className="p-1 text-neutral-400 hover:text-white"
                        title="Descendre"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveFromQueue(realIndex)}
                      className="p-1 text-neutral-400 hover:text-red-400"
                      title="Retirer de la file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-neutral-500">
                    {Math.floor(track.duration / 60)}:
                    {(track.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

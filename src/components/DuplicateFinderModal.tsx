import React, { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileAudio,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Track, AccentColor } from '../types';

interface DuplicateFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  onDeleteTrack: (track: Track) => Promise<void> | void;
  accent: AccentColor;
}

interface DuplicateGroup {
  key: string;
  normalizedTitle: string;
  normalizedArtist: string;
  tracks: Track[];
  recommendedTrackId: string;
}

const ACCENT_BTN: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white',
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950',
  rose: 'bg-rose-500 hover:bg-rose-400 text-white',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950',
};

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\(.*?\)|\[.*?\]/g, '') // remove (feat...) etc.
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const DuplicateFinderModal: React.FC<DuplicateFinderModalProps> = ({
  isOpen,
  onClose,
  tracks,
  onDeleteTrack,
  accent,
}) => {
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Group tracks by normalized (title + artist)
  const duplicateGroups: DuplicateGroup[] = useMemo(() => {
    const map = new Map<string, Track[]>();

    for (const track of tracks) {
      if (deletedIds.has(track.id)) continue;

      const normTitle = normalizeString(track.title);
      const normArtist = normalizeString(track.artist);
      if (!normTitle) continue;

      const key = `${normTitle}__${normArtist}`;
      const existing = map.get(key) || [];
      existing.push(track);
      map.set(key, existing);
    }

    const groups: DuplicateGroup[] = [];

    for (const [key, trackList] of map.entries()) {
      if (trackList.length > 1) {
        // Recommend track with highest bitrate/format or highest playCount
        const sorted = [...trackList].sort((a, b) => {
          // Priority: FLAC/WAV > MP3 320 > etc.
          const formatWeight = (t: Track) => {
            if (t.format === 'flac') return 5;
            if (t.format === 'wav') return 4;
            if (t.bitrate && t.bitrate >= 320) return 3;
            if (t.format === 'mp3') return 2;
            return 1;
          };
          const weightDiff = formatWeight(b) - formatWeight(a);
          if (weightDiff !== 0) return weightDiff;
          return (b.playCount || 0) - (a.playCount || 0);
        });

        groups.push({
          key,
          normalizedTitle: trackList[0].title,
          normalizedArtist: trackList[0].artist,
          tracks: trackList,
          recommendedTrackId: sorted[0].id,
        });
      }
    }

    return groups;
  }, [tracks, deletedIds]);

  if (!isOpen) return null;

  const totalDuplicatesCount = duplicateGroups.reduce(
    (acc, g) => acc + (g.tracks.length - 1),
    0
  );

  const handleDeleteIndividual = async (track: Track) => {
    setDeletedIds((prev) => new Set([...prev, track.id]));
    await onDeleteTrack(track);
  };

  const handleKeepOnlyBestForGroup = async (group: DuplicateGroup) => {
    setIsProcessing(true);
    for (const track of group.tracks) {
      if (track.id !== group.recommendedTrackId) {
        setDeletedIds((prev) => new Set([...prev, track.id]));
        await onDeleteTrack(track);
      }
    }
    setIsProcessing(false);
  };

  const handleCleanAllDuplicates = async () => {
    setIsProcessing(true);
    for (const group of duplicateGroups) {
      for (const track of group.tracks) {
        if (track.id !== group.recommendedTrackId) {
          setDeletedIds((prev) => new Set([...prev, track.id]));
          await onDeleteTrack(track);
        }
      }
    }
    setIsProcessing(false);
  };

  return (
    <div
      id="duplicate-finder-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="duplicate-finder-content"
        className="w-full max-w-3xl max-h-[85vh] rounded-2xl border border-neutral-800 bg-neutral-900/98 text-neutral-100 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <span>Détecteur de Doublons Audio</span>
                {totalDuplicatesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {totalDuplicatesCount} doublon{totalDuplicatesCount > 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400">
                Analyse intelligente des titres, artistes et formats pour libérer de l'espace
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        {totalDuplicatesCount > 0 && (
          <div className="px-5 py-3 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-neutral-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                {duplicateGroups.length} groupe{duplicateGroups.length > 1 ? 's' : ''} de morceaux en double trouvés
              </span>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleCleanAllDuplicates}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer ${ACCENT_BTN[accent]}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Conserver les meilleures versions ({totalDuplicatesCount} à supprimer)</span>
            </button>
          </div>
        )}

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {duplicateGroups.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-neutral-100">Aucun doublon dans la bibliothèque !</h3>
              <p className="text-xs text-neutral-400 max-w-md">
                Chaque morceau est unique. Vous pouvez importer de nouveaux morceaux sans craindre d'encombrer votre collection.
              </p>
            </div>
          ) : (
            duplicateGroups.map((group) => (
              <div
                key={group.key}
                className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm font-bold text-white truncate">{group.normalizedTitle}</span>
                    <span className="text-xs text-neutral-400 truncate">— {group.normalizedArtist}</span>
                  </div>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleKeepOnlyBestForGroup(group)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-cyan-300 font-medium transition-colors flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Garder la meilleure</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {group.tracks.map((track) => {
                    const isRecommended = track.id === group.recommendedTrackId;
                    return (
                      <div
                        key={track.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                          isRecommended
                            ? 'bg-emerald-950/30 border-emerald-500/40 text-neutral-200'
                            : 'bg-neutral-900/60 border-neutral-800/80 text-neutral-400 hover:bg-neutral-900'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded bg-neutral-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {track.coverUrl ? (
                              <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileAudio className="w-4 h-4 text-neutral-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-neutral-200 truncate">{track.title}</span>
                              {isRecommended && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Recommandé (Meilleur)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                              <span className="uppercase font-mono font-bold text-neutral-300">
                                {track.format}
                              </span>
                              {track.bitrate && (
                                <span className="font-mono">{track.bitrate} kbps</span>
                              )}
                              <span>•</span>
                              <span>{formatDuration(track.duration)}</span>
                              <span>•</span>
                              <span>{track.album || 'Single'}</span>
                              <span>•</span>
                              <span>{track.playCount || 0} écoute(s)</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <button
                            type="button"
                            onClick={() => handleDeleteIndividual(track)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Supprimer ce doublon"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-end flex-shrink-0 bg-neutral-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

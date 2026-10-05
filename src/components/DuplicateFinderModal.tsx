import React, { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileAudio,
  Sparkles,
  ShieldCheck,
  Play,
  Pause,
  Volume2,
} from 'lucide-react';
import { Track, AccentColor } from '../types';

interface DuplicateFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  onDeleteTrack: (track: Track) => Promise<void> | void;
  onPlayTrack?: (track: Track) => void;
  currentTrackId?: string | null;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
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

// Generic placeholder artists that cannot uniquely distinguish a song
const GENERIC_ARTISTS = new Set([
  'artiste local',
  'artist local',
  'unknown',
  'unknown artist',
  'artiste inconnu',
  'inconnu',
  'various artists',
  'youtube',
  'flowluna',
  'aurawave',
  '',
]);

// Strip common video / cover / release fluff tags while preserving actual Japanese / Unicode title
function cleanFluffTags(title: string): string {
  let cleaned = title
    // Convert fullwidth brackets & parentheses to standard
    .replace(/【/g, '[')
    .replace(/】/g, ']')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/［/g, '[')
    .replace(/］/g, ']')
    .replace(/〔/g, '[')
    .replace(/〕/g, ']');

  // Remove common video/cover tags
  cleaned = cleaned
    .replace(/\[\s*(?:歌ってみた|歌ってみた動画|mv|official\s*mv|official\s*video|official\s*music\s*video|official\s*audio|official|audio|pv|hd|4k|lyric\s*video|visualizer|full\s*ver|full|cover)\s*\]/gi, ' ')
    .replace(/\(\s*(?:歌ってみた|mv|official\s*mv|official\s*video|official\s*music\s*video|official\s*audio|official|audio|pv|hd|4k|lyric\s*video|visualizer|full\s*ver|full|cover)\s*\)/gi, ' ');

  // If stripping brackets left an empty or tiny string, fallback to original title
  if (cleaned.trim().length < 2) {
    cleaned = title;
  }
  return cleaned;
}

// Unicode-aware normalization preserving all letters (Latin, CJK, Cyrillic, etc.) and digits
function normalizeUnicode(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFKD')
    // Remove diacritical marks (accents)
    .replace(/[\u0300-\u036f]/g, '')
    // Replace punctuation, symbols, and separators with a single space
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Extract core song title (removing "covered by...", "feat...", "ft...", etc.)
function extractCoreTitle(title: string): string {
  const cleaned = cleanFluffTags(title);
  let core = cleaned
    .replace(/\s+(?:covered\s+by|cover\s+by|歌ってみた)\s+.*$/i, '')
    .replace(/\s+(?:feat\.?|ft\.?|featuring)\s+.*$/i, '')
    .replace(/\s*[-/|]\s*.*$/i, ''); // remove " - Artist" suffix if in title

  core = normalizeUnicode(core);
  if (core.length < 2) {
    return normalizeUnicode(cleaned);
  }
  return core;
}

function areDurationsCompatible(d1?: number, d2?: number): boolean {
  if (!d1 || !d2 || d1 <= 0 || d2 <= 0) {
    return true; // No duration data to compare
  }
  // Audio durations must be within 8 seconds of each other
  // or within 4% of total length
  const diff = Math.abs(d1 - d2);
  if (diff <= 8) return true;
  const maxD = Math.max(d1, d2);
  return diff / maxD <= 0.04;
}

function areTracksDuplicate(a: Track, b: Track): boolean {
  if (a.id === b.id) return false;

  // 1. Duration check: if both tracks have known duration and they differ by > 8s, they are NOT the same audio!
  if (a.duration && b.duration && a.duration > 0 && b.duration > 0) {
    if (!areDurationsCompatible(a.duration, b.duration)) {
      return false;
    }
  }

  // 2. Exact file path match (if file paths are known and identical)
  if ((a as any).filePath && (b as any).filePath && (a as any).filePath === (b as any).filePath) {
    return true;
  }

  const normTitleA = normalizeUnicode(cleanFluffTags(a.title));
  const normTitleB = normalizeUnicode(cleanFluffTags(b.title));

  if (!normTitleA || !normTitleB) return false;

  const coreTitleA = extractCoreTitle(a.title);
  const coreTitleB = extractCoreTitle(b.title);

  const normArtistA = normalizeUnicode(a.artist || '');
  const normArtistB = normalizeUnicode(b.artist || '');

  const isGenericA = GENERIC_ARTISTS.has(normArtistA);
  const isGenericB = GENERIC_ARTISTS.has(normArtistB);

  // Case 1: Normalized full titles are exactly identical
  if (normTitleA === normTitleB) {
    // If both have non-generic artists, verify artists are compatible
    if (!isGenericA && !isGenericB) {
      if (normArtistA === normArtistB || normArtistA.includes(normArtistB) || normArtistB.includes(normArtistA)) {
        return true;
      }
      return false;
    }
    return true;
  }

  // Case 2: Core titles match (e.g. "Song (Cover by X)" vs "Song" or "Song feat. Y" vs "Song")
  if (coreTitleA.length >= 3 && coreTitleA === coreTitleB) {
    if (!isGenericA && !isGenericB) {
      if (normArtistA === normArtistB || normArtistA.includes(normArtistB) || normArtistB.includes(normArtistA)) {
        return true;
      }
      return false;
    }
    // If one artist is generic, ensure the duration matches tightly (diff <= 5s)
    if (a.duration && b.duration && Math.abs(a.duration - b.duration) <= 5) {
      return true;
    }
  }

  // Case 3: Title contains the other, e.g. "Artist - Song Name" vs "Song Name"
  if (normTitleA.length >= 4 && normTitleB.length >= 4) {
    const longer = normTitleA.length > normTitleB.length ? normTitleA : normTitleB;
    const shorter = normTitleA.length > normTitleB.length ? normTitleB : normTitleA;
    if (longer.includes(shorter) && shorter.length >= 5) {
      // Must have compatible duration diff <= 4s
      if (a.duration && b.duration && Math.abs(a.duration - b.duration) <= 4) {
        if (!isGenericA && !isGenericB) {
          if (normArtistA === normArtistB || longer.includes(normArtistA) || longer.includes(normArtistB)) {
            return true;
          }
        } else {
          return true;
        }
      }
    }
  }

  return false;
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
  onPlayTrack,
  currentTrackId,
  isPlaying = false,
  onTogglePlay,
  accent,
}) => {
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Group tracks with smart Unicode and duration clustering
  const duplicateGroups: DuplicateGroup[] = useMemo(() => {
    const remaining = tracks.filter((t) => !deletedIds.has(t.id));
    const visited = new Set<string>();
    const groups: DuplicateGroup[] = [];

    for (let i = 0; i < remaining.length; i++) {
      const t1 = remaining[i];
      if (visited.has(t1.id)) continue;

      const currentCluster: Track[] = [t1];

      for (let j = i + 1; j < remaining.length; j++) {
        const t2 = remaining[j];
        if (visited.has(t2.id)) continue;

        if (areTracksDuplicate(t1, t2)) {
          currentCluster.push(t2);
          visited.add(t2.id);
        }
      }

      if (currentCluster.length > 1) {
        visited.add(t1.id);

        // Recommend track with highest bitrate/format or highest playCount
        const sorted = [...currentCluster].sort((a, b) => {
          const formatWeight = (t: Track) => {
            if (t.format === 'flac') return 6;
            if (t.format === 'wav') return 5;
            if (t.format === 'm4a') return 4;
            if (t.bitrate && t.bitrate >= 320) return 3;
            if (t.format === 'mp3') return 2;
            return 1;
          };
          const weightDiff = formatWeight(b) - formatWeight(a);
          if (weightDiff !== 0) return weightDiff;
          const bitrateDiff = (b.bitrate || 0) - (a.bitrate || 0);
          if (bitrateDiff !== 0) return bitrateDiff;
          return (b.playCount || 0) - (a.playCount || 0);
        });

        groups.push({
          key: `group_${t1.id}`,
          normalizedTitle: t1.title,
          normalizedArtist: t1.artist,
          tracks: currentCluster,
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

  const handlePlayClick = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    if (currentTrackId === track.id) {
      if (onTogglePlay) onTogglePlay();
    } else {
      if (onPlayTrack) onPlayTrack(track);
    }
  };

  const handleDeleteIndividual = async (track: Track) => {
    // If the currently playing track is being deleted, pause playback
    if (currentTrackId === track.id && isPlaying && onTogglePlay) {
      onTogglePlay();
    }
    setDeletedIds((prev) => new Set([...prev, track.id]));
    await onDeleteTrack(track);
  };

  const handleKeepOnlyBestForGroup = async (group: DuplicateGroup) => {
    setIsProcessing(true);
    for (const track of group.tracks) {
      if (track.id !== group.recommendedTrackId) {
        if (currentTrackId === track.id && isPlaying && onTogglePlay) {
          onTogglePlay();
        }
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
          if (currentTrackId === track.id && isPlaying && onTogglePlay) {
            onTogglePlay();
          }
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
                Analyse intelligente des titres, artistes et durées pour libérer de l'espace sans faux positifs
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
                Chaque morceau est unique. Vos fichiers multilingues et versions distinctes sont parfaitement protégés.
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
                    const isThisTrackCurrent = currentTrackId === track.id;
                    const isThisTrackPlaying = isThisTrackCurrent && isPlaying;

                    return (
                      <div
                        key={track.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isThisTrackPlaying
                            ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] text-neutral-100'
                            : isRecommended
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-neutral-200'
                            : 'bg-neutral-900/60 border-neutral-800/80 text-neutral-400 hover:bg-neutral-900'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Album cover with interactive hover Play button */}
                          <div
                            onClick={(e) => handlePlayClick(e, track)}
                            className="w-10 h-10 rounded-lg bg-neutral-800 flex-shrink-0 overflow-hidden relative group/cover cursor-pointer flex items-center justify-center border border-white/5"
                            title={isThisTrackPlaying ? 'Mettre en pause' : 'Écouter pour vérifier'}
                          >
                            {track.coverUrl ? (
                              <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileAudio className="w-4 h-4 text-neutral-500" />
                            )}
                            <div
                              className={`absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center transition-opacity ${
                                isThisTrackPlaying ? 'opacity-100' : 'opacity-0 group-hover/cover:opacity-100'
                              }`}
                            >
                              {isThisTrackPlaying ? (
                                <Pause className="w-4 h-4 text-emerald-400 fill-current animate-pulse" />
                              ) : (
                                <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                              )}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-neutral-200 truncate">{track.title}</span>
                              {isRecommended && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                                  Recommandé (Meilleur)
                                </span>
                              )}
                              {isThisTrackPlaying && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-neutral-950 flex-shrink-0 animate-pulse">
                                  <Volume2 className="w-3 h-3" />
                                  Lecture
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-neutral-400 flex-wrap">
                              <span className="uppercase font-mono font-bold text-neutral-300">
                                {track.format}
                              </span>
                              {track.bitrate && (
                                <span className="font-mono">{track.bitrate} kbps</span>
                              )}
                              <span>•</span>
                              <span className="font-mono">{formatDuration(track.duration)}</span>
                              <span>•</span>
                              <span className="truncate max-w-[140px]">{track.album || 'Single'}</span>
                              <span>•</span>
                              <span>{track.playCount || 0} écoute(s)</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions: Listen Button + Delete Button */}
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          {onPlayTrack && (
                            <button
                              type="button"
                              onClick={(e) => handlePlayClick(e, track)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                                isThisTrackPlaying
                                  ? 'bg-emerald-500 text-neutral-950 font-bold hover:bg-emerald-400 shadow-emerald-500/20'
                                  : isThisTrackCurrent
                                  ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white'
                              }`}
                              title={
                                isThisTrackPlaying
                                  ? "Mettre en pause l'écoute"
                                  : isThisTrackCurrent
                                  ? 'Reprendre la lecture'
                                  : 'Écouter ce morceau pour vérifier'
                              }
                            >
                              {isThisTrackPlaying ? (
                                <>
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                  <span>Pause</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                  <span>Écouter</span>
                                </>
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteIndividual(track)}
                            className="p-1.5 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                            title="Supprimer ce morceau en double"
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
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between flex-shrink-0 bg-neutral-950/40">
          <p className="text-[11px] text-neutral-500">
            Conseil : Cliquez sur « Écouter » pour vérifier le morceau avant de supprimer.
          </p>
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

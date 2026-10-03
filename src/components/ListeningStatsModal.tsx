import React, { useMemo } from 'react';
import {
  X,
  BarChart3,
  Flame,
  Headphones,
  Clock,
  Music,
  Disc3,
  PieChart,
  Play,
} from 'lucide-react';
import { Track, AccentColor } from '../types';

interface ListeningStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  onPlayTrack: (track: Track) => void;
  accent: AccentColor;
}

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function formatTotalTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0 min';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 24) {
    const days = (hours / 24).toFixed(1);
    return `${days} jours (${hours}h)`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
}

export const ListeningStatsModal: React.FC<ListeningStatsModalProps> = ({
  isOpen,
  onClose,
  tracks,
  onPlayTrack,
}) => {
  const stats = useMemo(() => {
    let totalPlays = 0;
    let totalListenTimeSeconds = 0;
    let totalLibraryDuration = 0;
    const formatCounts: Record<string, number> = {};
    const artistPlays: Record<string, { count: number; tracksCount: number }> = {};

    for (const track of tracks) {
      const plays = track.playCount || 0;
      totalPlays += plays;
      totalListenTimeSeconds += plays * (track.duration || 180);
      totalLibraryDuration += track.duration || 0;

      // Formats
      const fmt = (track.format || 'mp3').toUpperCase();
      formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;

      // Artists
      const artist = track.artist || 'Artiste inconnu';
      if (!artistPlays[artist]) {
        artistPlays[artist] = { count: 0, tracksCount: 0 };
      }
      artistPlays[artist].count += plays;
      artistPlays[artist].tracksCount += 1;
    }

    // Top Tracks
    const topTracks = [...tracks]
      .filter((t) => (t.playCount || 0) > 0)
      .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
      .slice(0, 5);

    // Top Artists
    const topArtists = Object.entries(artistPlays)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Format breakdown
    const formatBreakdown = Object.entries(formatCounts).map(([fmt, count]) => ({
      format: fmt,
      count,
      percent: Math.round((count / Math.max(1, tracks.length)) * 100),
    }));

    return {
      totalTracks: tracks.length,
      totalPlays,
      totalListenTimeSeconds,
      totalLibraryDuration,
      topTracks,
      topArtists,
      formatBreakdown,
    };
  }, [tracks]);

  if (!isOpen) return null;

  return (
    <div
      id="listening-stats-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="listening-stats-content"
        className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-neutral-800 bg-neutral-900/98 text-neutral-100 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Statistiques & Récapitulatif d'Écoute</h2>
              <p className="text-xs text-neutral-400">Votre activité musicale et vos préférences d'écoute</p>
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

        {/* Scrollable Stats */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px]">Temps d'écoute</span>
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-base font-bold text-white">
                {formatTotalTime(stats.totalListenTimeSeconds)}
              </div>
              <div className="text-[10px] text-neutral-500">Estimé d'après vos lectures</div>
            </div>

            <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px]">Lectures totales</span>
                <Headphones className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-base font-bold text-white">{stats.totalPlays}</div>
              <div className="text-[10px] text-neutral-500">Titres joués</div>
            </div>

            <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px]">Bibliothèque</span>
                <Music className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-base font-bold text-white">{stats.totalTracks}</div>
              <div className="text-[10px] text-neutral-500">Morceaux uniques</div>
            </div>

            <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px]">Durée totale</span>
                <Disc3 className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div className="text-base font-bold text-white">
                {formatTotalTime(stats.totalLibraryDuration)}
              </div>
              <div className="text-[10px] text-neutral-500">Audio en stock</div>
            </div>
          </div>

          {/* Top 5 Tracks */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Titres les plus écoutés</span>
            </h3>

            {stats.topTracks.length === 0 ? (
              <div className="p-4 rounded-xl bg-neutral-950/40 border border-neutral-800 text-center text-xs text-neutral-500">
                Écoutez des morceaux pour générer votre classement des titres favoris.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {stats.topTracks.map((track, idx) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/70 hover:bg-neutral-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 text-center text-xs font-bold text-neutral-500 font-mono">
                        #{idx + 1}
                      </span>
                      <div className="w-8 h-8 rounded bg-neutral-800 overflow-hidden flex-shrink-0">
                        {track.coverUrl ? (
                          <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-500 text-[10px]">
                            🎵
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-neutral-200 truncate">{track.title}</div>
                        <div className="text-[11px] text-neutral-400 truncate">{track.artist}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-mono font-semibold text-emerald-400">
                        {track.playCount} écoute{track.playCount > 1 ? 's' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onPlayTrack(track);
                          onClose();
                        }}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
                        title="Écouter maintenant"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Artists & Format Breakdown in two columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Artists */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Disc3 className="w-4 h-4 text-violet-400" />
                <span>Artistes favoris</span>
              </h3>
              <div className="flex flex-col gap-1.5">
                {stats.topArtists.length === 0 ? (
                  <div className="p-4 rounded-xl bg-neutral-950/40 border border-neutral-800 text-center text-xs text-neutral-500">
                    Pas encore d'artistes écoutés.
                  </div>
                ) : (
                  stats.topArtists.map((artist, idx) => (
                    <div
                      key={artist.name}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/70"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-4 text-center text-xs font-bold text-neutral-500 font-mono">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-neutral-200 truncate">{artist.name}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-2 flex-shrink-0">
                        <span>{artist.tracksCount} titre(s)</span>
                        <span>•</span>
                        <span className="text-violet-300 font-mono font-semibold">{artist.count} play(s)</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Audio Formats Breakdown */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-cyan-400" />
                <span>Formats audio de la bibliothèque</span>
              </h3>
              <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/70 flex flex-col gap-2.5">
                {stats.formatBreakdown.map((item) => (
                  <div key={item.format} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-neutral-200">{item.format}</span>
                      <span className="text-neutral-400">
                        {item.count} fichier{item.count > 1 ? 's' : ''} ({item.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-end bg-neutral-950/40 flex-shrink-0">
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

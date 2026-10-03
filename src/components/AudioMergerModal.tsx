import React, { useState } from 'react';
import {
  X,
  Layers,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Download,
  Check,
  Music,
  Sliders,
} from 'lucide-react';
import { Track, AccentColor } from '../types';
import { loadAudioBufferForTrack, getAudioContext } from '../utils/audioTrimmer';
import { audioBufferToWav } from '../utils/audioSynthesizer';
import { saveAudioBlob } from '../services/audioDb';
import { saveAudioToPC } from '../utils/fileSaver';

interface AudioMergerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  onTrackCreated: (newTrack: Track) => void;
  accent: AccentColor;
}

const ACCENT_BTN: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white',
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950',
  rose: 'bg-rose-500 hover:bg-rose-400 text-white',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950',
};

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const AudioMergerModal: React.FC<AudioMergerModalProps> = ({
  isOpen,
  onClose,
  tracks,
  onTrackCreated,
  accent,
}) => {
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
  const [crossfadeSec, setCrossfadeSec] = useState<number>(2);
  const [title, setTitle] = useState('Mix Assemblé');
  const [isMerging, setIsMerging] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [mergedTrack, setMergedTrack] = useState<Track | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleAddTrack = (track: Track) => {
    if (selectedTracks.length >= 8) return;
    setSelectedTracks((prev) => [...prev, track]);
    setShowAddPicker(false);
    setSearchQuery('');
  };

  const handleRemoveTrack = (index: number) => {
    setSelectedTracks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveTrack = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedTracks.length) return;

    setSelectedTracks((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleStartMerge = async () => {
    if (selectedTracks.length < 2) return;

    setIsMerging(true);
    setMergedBlob(null);
    setMergedTrack(null);
    setProgressMsg('Préparation du moteur audio...');

    try {
      const ctx = getAudioContext();
      const audioBuffers: AudioBuffer[] = [];

      for (let i = 0; i < selectedTracks.length; i++) {
        const t = selectedTracks[i];
        setProgressMsg(`Décodage piste ${i + 1}/${selectedTracks.length} (${t.title})...`);
        const buf = await loadAudioBufferForTrack(t);
        audioBuffers.push(buf);
      }

      setProgressMsg('Calcul de l’assemblage et fondus de transition...');
      const sampleRate = audioBuffers[0].sampleRate;
      const numChannels = 2; // Stereo output
      const crossfadeSamples = Math.floor(crossfadeSec * sampleRate);

      // Compute total length
      let totalLength = 0;
      for (let i = 0; i < audioBuffers.length; i++) {
        totalLength += audioBuffers[i].length;
        if (i > 0 && crossfadeSamples > 0) {
          totalLength -= Math.min(crossfadeSamples, audioBuffers[i].length, audioBuffers[i - 1].length);
        }
      }

      const mergedBuffer = ctx.createBuffer(Math.max(2, numChannels), Math.max(1, totalLength), sampleRate);
      const outL = mergedBuffer.getChannelData(0);
      const outR = mergedBuffer.numberOfChannels > 1 ? mergedBuffer.getChannelData(1) : outL;

      let currentOffset = 0;

      for (let i = 0; i < audioBuffers.length; i++) {
        const buf = audioBuffers[i];
        const inL = buf.getChannelData(0);
        const inR = buf.numberOfChannels > 1 ? buf.getChannelData(1) : inL;
        const bufLen = buf.length;

        if (i === 0 || crossfadeSamples === 0) {
          // Direct copy
          for (let s = 0; s < bufLen; s++) {
            if (currentOffset + s < totalLength) {
              outL[currentOffset + s] = inL[s];
              outR[currentOffset + s] = inR[s];
            }
          }
          currentOffset += bufLen;
        } else {
          // Crossfade with previous buffer
          const actualFade = Math.min(crossfadeSamples, bufLen);
          const fadeStartOffset = currentOffset - actualFade;

          for (let s = 0; s < bufLen; s++) {
            const outIdx = fadeStartOffset + s;
            if (outIdx >= totalLength) break;

            if (s < actualFade) {
              // Overlap region
              const fadeRatio = s / actualFade;
              outL[outIdx] = outL[outIdx] * (1 - fadeRatio) + inL[s] * fadeRatio;
              outR[outIdx] = outR[outIdx] * (1 - fadeRatio) + inR[s] * fadeRatio;
            } else {
              outL[outIdx] = inL[s];
              outR[outIdx] = inR[s];
            }
          }
          currentOffset = fadeStartOffset + bufLen;
        }
      }

      setProgressMsg('Génération du fichier audio WAV haute fidélité...');
      const wavBlob = audioBufferToWav(mergedBuffer);
      setMergedBlob(wavBlob);

      // Create new track
      const newTrackId = `track-merged-${Date.now()}`;
      await saveAudioBlob(newTrackId, wavBlob);

      const created: Track = {
        id: newTrackId,
        title: title.trim() || 'Mix Assemblé',
        artist: selectedTracks.map((t) => t.artist).slice(0, 3).join(' & '),
        album: 'FlowLuna Mixes',
        duration: Math.round(mergedBuffer.duration),
        format: 'wav',
        bitrate: 1411,
        url: URL.createObjectURL(wavBlob),
        coverUrl: selectedTracks[0]?.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        source: 'local',
        isFavorite: false,
        isCachedOffline: true,
        cachedAt: Date.now(),
        playCount: 0,
        addedAt: Date.now(),
        sizeInBytes: wavBlob.size,
      };

      setMergedTrack(created);
      onTrackCreated(created);
      setProgressMsg('Assemblage terminé avec succès !');
    } catch (err) {
      console.error('Erreur lors de l’assemblage:', err);
      setProgressMsg('Erreur lors du traitement audio.');
    } finally {
      setIsMerging(false);
    }
  };

  const handleDownload = async () => {
    if (!mergedBlob) return;
    const filename = `${title.trim() || 'Mix_Assemble'}`;
    await saveAudioToPC(mergedBlob, filename, 'wav', true);
  };

  return (
    <div
      id="audio-merger-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="audio-merger-content"
        className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-neutral-800 bg-neutral-900/98 text-neutral-100 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Assembler & Fusionner des Pistes Audio</h2>
              <p className="text-xs text-neutral-400">
                Combinez plusieurs morceaux ou extraits en une seule piste avec fondu enchaîné
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Output Track Title & Crossfade Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Titre de la nouvelle piste
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Mon Mix Synthwave 2026"
                className="w-full text-xs px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-300">
                  Fondu de transition (Crossfade)
                </label>
                <span className="text-xs font-mono text-indigo-400 font-semibold">
                  {crossfadeSec > 0 ? `${crossfadeSec}s` : 'Enchaînement brut (0s)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3, 5].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setCrossfadeSec(sec)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      crossfadeSec === sec
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {sec === 0 ? '0s' : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Tracks List */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Ordre de lecture des morceaux ({selectedTracks.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddPicker(true)}
                disabled={selectedTracks.length >= 8}
                className="text-xs px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-indigo-300 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un morceau</span>
              </button>
            </div>

            {selectedTracks.length === 0 ? (
              <div
                onClick={() => setShowAddPicker(true)}
                className="p-8 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40 text-center flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-neutral-700 transition-colors"
              >
                <Music className="w-8 h-8 text-neutral-600" />
                <span className="text-xs font-medium text-neutral-300">
                  Aucun morceau sélectionné. Cliquez ici pour ajouter au moins 2 morceaux.
                </span>
                <span className="text-[11px] text-neutral-500">
                  Glissez ou organisez les titres pour créer votre enchaînement personnalisé.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedTracks.map((track, idx) => (
                  <div
                    key={`${track.id}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 text-center text-xs font-bold text-neutral-500 font-mono">
                        #{idx + 1}
                      </span>
                      <div className="w-9 h-9 rounded bg-neutral-800 overflow-hidden flex-shrink-0">
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
                        <div className="text-[11px] text-neutral-400 truncate">
                          {track.artist} • {formatDuration(track.duration)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveTrack(idx, 'up')}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-200 disabled:opacity-30 cursor-pointer"
                        title="Monter"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === selectedTracks.length - 1}
                        onClick={() => handleMoveTrack(idx, 'down')}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-200 disabled:opacity-30 cursor-pointer"
                        title="Descendre"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTrack(idx)}
                        className="p-1 rounded text-neutral-400 hover:text-red-400 cursor-pointer ml-1"
                        title="Retirer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Track Selector Dropdown */}
          {showAddPicker && (
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col gap-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300">
                  Sélectionner un morceau de votre bibliothèque
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddPicker(false)}
                  className="text-xs text-neutral-400 hover:text-neutral-200 cursor-pointer"
                >
                  Fermer
                </button>
              </div>
              <input
                type="text"
                placeholder="Filtrer par titre ou artiste..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-200 placeholder-neutral-500 focus:outline-none"
              />
              <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
                {tracks
                  .filter(
                    (t) =>
                      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.artist.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleAddTrack(t)}
                      className="text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-neutral-800 text-neutral-300 flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">
                        {t.title} <span className="text-neutral-500">— {t.artist}</span>
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono ml-2">
                        {formatDuration(t.duration)}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Progress / Status */}
          {progressMsg && (
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 font-medium">
                {isMerging ? (
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-400" />
                )}
                <span>{progressMsg}</span>
              </div>
              {mergedTrack && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger .wav</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-950/40 flex-shrink-0">
          <div className="text-xs text-neutral-400">
            {selectedTracks.length >= 2 ? (
              <span>
                Durée estimée :{' '}
                <strong className="text-neutral-200">
                  {formatDuration(
                    selectedTracks.reduce((acc, t) => acc + t.duration, 0) -
                      (selectedTracks.length - 1) * crossfadeSec
                  )}
                </strong>
              </span>
            ) : (
              <span>Ajoutez au moins 2 morceaux</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="button"
              disabled={selectedTracks.length < 2 || isMerging}
              onClick={handleStartMerge}
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer ${ACCENT_BTN[accent]}`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isMerging ? 'Assemblage en cours...' : 'Fusionner les morceaux'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

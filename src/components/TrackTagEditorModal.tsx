import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Tag,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Music,
  Check,
  Search,
  Loader2,
} from 'lucide-react';
import { Track, AccentColor } from '../types';
import { fetchOnlineMetadata } from '../services/metadataService';

interface TrackTagEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  onSave: (updatedTrack: Track) => Promise<void> | void;
  accent: AccentColor;
}

const ACCENT_BG: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white',
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950',
  rose: 'bg-rose-500 hover:bg-rose-400 text-white',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950',
};

const ACCENT_RING: Record<AccentColor, string> = {
  emerald: 'focus:border-emerald-500 focus:ring-emerald-500/20',
  violet: 'focus:border-violet-500 focus:ring-violet-500/20',
  blue: 'focus:border-blue-500 focus:ring-blue-500/20',
  amber: 'focus:border-amber-500 focus:ring-amber-500/20',
  rose: 'focus:border-rose-500 focus:ring-rose-500/20',
  cyan: 'focus:border-cyan-500 focus:ring-cyan-500/20',
};

export const TrackTagEditorModal: React.FC<TrackTagEditorModalProps> = ({
  isOpen,
  onClose,
  track,
  onSave,
  accent,
}) => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [year, setYear] = useState('');
  const [genre, setGenre] = useState('');
  const [trackNumber, setTrackNumber] = useState<number | ''>('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isFetchingOnline, setIsFetchingOnline] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'success' | 'not_found' | 'error' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFetchOnlineMetadata = async () => {
    if (!title.trim() && !artist.trim()) return;
    setIsFetchingOnline(true);
    setFetchStatus(null);
    try {
      const meta = await fetchOnlineMetadata(artist, title);
      if (meta) {
        if (meta.title) setTitle(meta.title);
        if (meta.artist && (artist === 'Artiste Local' || !artist.trim())) setArtist(meta.artist);
        if (meta.album) setAlbum(meta.album);
        if (meta.year) setYear(meta.year);
        if (meta.genre) setGenre(meta.genre);
        if (meta.coverUrl) setCoverUrl(meta.coverUrl);
        setFetchStatus('success');
      } else {
        setFetchStatus('not_found');
      }
    } catch {
      setFetchStatus('error');
    } finally {
      setIsFetchingOnline(false);
      setTimeout(() => setFetchStatus(null), 4000);
    }
  };

  useEffect(() => {
    if (track) {
      setTitle(track.title || '');
      setArtist(track.artist || '');
      setAlbum(track.album || '');
      setYear(track.year || '');
      setGenre(track.genre || '');
      setTrackNumber(track.trackNumber ?? '');
      setCoverUrl(track.coverUrl || '');
      setSavedSuccess(false);
    }
  }, [track, isOpen]);

  if (!isOpen || !track) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateCover = () => {
    const randomSeeds = [
      'abstract-neon',
      'dark-waves',
      'gradient-mesh',
      'cyber-geometric',
      'soundwave-aurora',
    ];
    const seed = randomSeeds[Math.floor(Math.random() * randomSeeds.length)];
    setCoverUrl(`https://picsum.photos/seed/${encodeURIComponent(title || seed)}/600/600`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) return;

    setIsSaving(true);
    const updatedTrack: Track = {
      ...track,
      title: title.trim(),
      artist: artist.trim(),
      album: album.trim() || 'Single',
      year: year.trim() || undefined,
      genre: genre.trim() || undefined,
      trackNumber: typeof trackNumber === 'number' ? trackNumber : undefined,
      coverUrl: coverUrl.trim() || undefined,
    };

    try {
      await onSave(updatedTrack);
      setSavedSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Erreur de sauvegarde des métadonnées:', err);
      setIsSaving(false);
    }
  };

  return (
    <div
      id="track-tag-editor-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="track-tag-editor-content"
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900/98 glass-modal text-neutral-100 p-6 shadow-2xl flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neutral-800 text-sky-400 border border-neutral-700">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Éditeur de Métadonnées & Pochette</h2>
              <p className="text-xs text-neutral-400">Modifier les tags ID3, l'album et la couverture du titre</p>
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Cover Art Section */}
          <div className="flex items-center gap-4 p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/70">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0 group border border-neutral-700">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                  onError={() => setCoverUrl('')}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500">
                  <Music className="w-8 h-8 opacity-40" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] text-white font-medium cursor-pointer"
              >
                <Upload className="w-4 h-4 mb-1" />
                Changer
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <span className="text-xs font-semibold text-neutral-300">Pochette d'album</span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Image PC
                </button>
                <button
                  type="button"
                  onClick={handleGenerateCover}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Générer une pochette stylisée"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Générer
                </button>
                <button
                  type="button"
                  onClick={handleFetchOnlineMetadata}
                  disabled={isFetchingOnline}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Rechercher automatiquement la pochette officielle et les métadonnées sur iTunes"
                >
                  {isFetchingOnline ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  Recherche en ligne
                </button>
                {coverUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverUrl('')}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-red-400 hover:bg-neutral-800/80 transition-colors cursor-pointer"
                  >
                    Effacer
                  </button>
                )}
              </div>
              {fetchStatus === 'success' && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Pochette et métadonnées trouvées avec succès !
                </div>
              )}
              {fetchStatus === 'not_found' && (
                <div className="text-[11px] text-neutral-400">
                  Aucune métadonnée trouvée en ligne pour ce titre.
                </div>
              )}
              {fetchStatus === 'error' && (
                <div className="text-[11px] text-red-400">
                  Erreur de connexion lors de la recherche en ligne.
                </div>
              )}
              <input
                type="url"
                placeholder="Ou collez une URL d'image (https://...)"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                className="w-full text-xs px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-700 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
              />
            </div>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Titre du morceau <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full text-xs px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700/80 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 ${ACCENT_RING[accent]}`}
                placeholder="ex: Bohemian Rhapsody"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Artiste / Groupe <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className={`w-full text-xs px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700/80 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 ${ACCENT_RING[accent]}`}
                placeholder="ex: Queen"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Album</label>
              <input
                type="text"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                className={`w-full text-xs px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700/80 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 ${ACCENT_RING[accent]}`}
                placeholder="ex: A Night at the Opera"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Genre</label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className={`w-full text-xs px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700/80 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 ${ACCENT_RING[accent]}`}
                placeholder="ex: Rock, Pop, Synthwave, Electro"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Année</label>
              <input
                type="text"
                value={year}
                maxLength={4}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
                className={`w-full text-xs px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700/80 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 ${ACCENT_RING[accent]}`}
                placeholder="ex: 1975"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Piste N°</label>
              <input
                type="number"
                min={1}
                max={999}
                value={trackNumber}
                onChange={(e) => setTrackNumber(e.target.value ? parseInt(e.target.value, 10) : '')}
                className={`w-full text-xs px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700/80 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 ${ACCENT_RING[accent]}`}
                placeholder="ex: 1"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-neutral-800 pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer ${ACCENT_BG[accent]}`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Enregistré !</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Enregistrement...' : 'Sauvegarder les tags'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

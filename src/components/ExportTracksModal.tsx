import React, { useState } from 'react';
import {
  Download,
  FolderDown,
  Archive,
  FileAudio,
  Check,
  X,
  Sparkles,
  Layers,
  Settings2,
  HardDrive,
  Music,
  AlertCircle,
  Clock,
  Disc,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { Track, AccentColor } from '../types';
import {
  ExportAudioFormat,
  EXPORT_FORMATS,
  exportBatchTracksToPC,
  SaveFileResult,
} from '../utils/fileSaver';

interface ExportTracksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  accent: AccentColor;
  defaultZipName?: string;
}

const ACCENT_BTN: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white font-bold',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white font-bold',
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold',
  rose: 'bg-rose-500 hover:bg-rose-400 text-white font-bold',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold',
};

const ACCENT_TEXT: Record<AccentColor, string> = {
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  cyan: 'text-cyan-400',
};

const ACCENT_BORDER: Record<AccentColor, string> = {
  emerald: 'border-emerald-500/50 bg-emerald-950/20',
  violet: 'border-violet-500/50 bg-violet-950/20',
  blue: 'border-blue-500/50 bg-blue-950/20',
  amber: 'border-amber-500/50 bg-amber-950/20',
  rose: 'border-rose-500/50 bg-rose-950/20',
  cyan: 'border-cyan-500/50 bg-cyan-950/20',
};

const ACCENT_PROGRESS: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500',
  violet: 'bg-violet-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  cyan: 'bg-cyan-500',
};

export const ExportTracksModal: React.FC<ExportTracksModalProps> = ({
  isOpen,
  onClose,
  tracks: initialTracks,
  accent,
  defaultZipName = 'Musique_FlowLuna_PC',
}) => {
  const [selectedTracks, setSelectedTracks] = useState<Track[]>(initialTracks);
  const [format, setFormat] = useState<ExportAudioFormat>('mp3');
  const [bitrate, setBitrate] = useState<string>('320k');
  const [mode, setMode] = useState<'zip' | 'individual'>(initialTracks.length > 1 ? 'zip' : 'individual');
  const [namingPattern, setNamingPattern] = useState<'artist_title' | 'title_artist' | 'numbered' | 'title_only'>('artist_title');
  const [zipName, setZipName] = useState<string>(defaultZipName);

  // Export progress
  const [isExporting, setIsExporting] = useState(false);
  const [progressInfo, setProgressInfo] = useState<{
    currentIndex: number;
    total: number;
    currentTrackTitle: string;
    stage: 'converting' | 'zipping' | 'saving' | 'done';
    percentage: number;
  } | null>(null);
  const [exportResult, setExportResult] = useState<SaveFileResult | null>(null);

  // Sync initial tracks when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedTracks(initialTracks);
      setMode(initialTracks.length > 1 ? 'zip' : 'individual');
      setIsExporting(false);
      setProgressInfo(null);
      setExportResult(null);
    }
  }, [isOpen, initialTracks]);

  if (!isOpen) return null;

  const handleRemoveTrack = (trackId: string) => {
    setSelectedTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  const handleStartExport = async () => {
    if (selectedTracks.length === 0) return;

    setIsExporting(true);
    setExportResult(null);
    setProgressInfo({
      currentIndex: 0,
      total: selectedTracks.length,
      currentTrackTitle: 'Initialisation de l’exportation...',
      stage: 'converting',
      percentage: 5,
    });

    try {
      const res = await exportBatchTracksToPC({
        tracks: selectedTracks,
        format,
        bitrate,
        mode,
        namingPattern,
        zipFileName: zipName || defaultZipName,
        onProgress: (prog) => {
          setProgressInfo(prog);
        },
      });

      setExportResult(res);
    } catch (err: any) {
      console.error('Export error:', err);
      setExportResult({
        success: false,
        error: err.message || 'Une erreur est survenue pendant l’exportation.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const isMultiple = selectedTracks.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-neutral-900/95 glass-modal border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800/80 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-neutral-800 border border-neutral-700/80 ${ACCENT_TEXT[accent]}`}>
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {isMultiple ? `Exporter ${selectedTracks.length} Musiques sur PC` : 'Exporter la Musique sur PC'}
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {selectedTracks.length} piste{isMultiple ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Choisissez le format audio, la qualité et le dossier de destination sur votre disque dur.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 select-none">
          
          {/* Active Exporting / Progress view */}
          {isExporting && progressInfo && (
            <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col gap-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <div>
                    <span className="text-sm font-bold text-white block">
                      {progressInfo.stage === 'converting' && 'Conversion audio haute fidélité...'}
                      {progressInfo.stage === 'zipping' && 'Compression dans l’archive ZIP...'}
                      {progressInfo.stage === 'saving' && 'Écriture sur votre disque dur PC...'}
                      {progressInfo.stage === 'done' && 'Exportation terminée !'}
                    </span>
                    <span className="text-xs text-neutral-400 truncate max-w-md block">
                      {progressInfo.currentTrackTitle}
                    </span>
                  </div>
                </div>

                <span className="text-sm font-mono font-bold text-white">
                  {progressInfo.percentage}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-300 ${ACCENT_PROGRESS[accent]}`}
                  style={{ width: `${progressInfo.percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span>Piste {progressInfo.currentIndex} sur {progressInfo.total}</span>
                <span>Format cible : {format.toUpperCase()}</span>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {exportResult?.success && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
              <div className="flex-1">
                <span className="font-bold text-sm text-emerald-300 block">Exportation Réussie !</span>
                <span className="text-xs text-neutral-300 block mt-0.5">
                  Vos fichiers ont été enregistrés avec succès ({exportResult.fileName || 'Fichiers enregistrés'}).
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {exportResult && !exportResult.success && !exportResult.cancelled && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1">
                <span className="font-bold text-sm text-red-300 block">Erreur d'exportation</span>
                <span className="text-xs text-neutral-300 block mt-0.5">
                  {exportResult.error || 'Une erreur est survenue lors de l’écriture du fichier.'}
                </span>
              </div>
            </div>
          )}

          {/* Track Summary List */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Pistes sélectionnées ({selectedTracks.length})
              </span>
            </div>

            <div className="max-h-36 overflow-y-auto rounded-xl bg-neutral-950/70 border border-neutral-800 p-2 flex flex-col gap-1.5">
              {selectedTracks.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-500">
                  Aucun morceau sélectionné.
                </div>
              ) : (
                selectedTracks.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className="flex items-center justify-between gap-3 p-2 rounded-lg bg-neutral-900/60 hover:bg-neutral-800/60 border border-neutral-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {t.coverUrl ? (
                        <img
                          src={t.coverUrl}
                          alt=""
                          className="w-7 h-7 rounded-md object-cover flex-shrink-0 bg-neutral-950"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-md bg-neutral-800 flex items-center justify-center flex-shrink-0 text-neutral-400">
                          <Music className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {t.title}
                        </span>
                        <span className="text-[10px] text-neutral-400 block truncate">
                          {t.artist}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                        {t.format}
                      </span>
                      {selectedTracks.length > 1 && !isExporting && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTrack(t.id)}
                          className="p-1 rounded text-neutral-500 hover:text-red-400 transition-colors"
                          title="Retirer de l'export"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Format Selection Grid */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Format Audio Cible
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {EXPORT_FORMATS.map((fmt) => {
                const isSelected = format === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => {
                      setFormat(fmt.id);
                      if (fmt.defaultBitrate !== 'auto') {
                        setBitrate(fmt.defaultBitrate);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? `${ACCENT_BORDER[accent]} ring-1 ring-white/20 shadow-md`
                        : 'bg-neutral-950/60 border-neutral-800/80 hover:bg-neutral-800/50 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs text-white">{fmt.label.split(' ')[0]}</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {fmt.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-400 leading-tight">
                      {fmt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quality & Bitrate (if applicable) */}
          {(format === 'mp3' || format === 'm4a') && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-neutral-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Débit Binaire (Bitrate)</span>
                  <span className="text-[10px] text-neutral-400">Plus le débit est élevé, plus la qualité audio est riche</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {['320k', '256k', '192k', '128k'].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setBitrate(rate)}
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg transition-colors ${
                      bitrate === rate
                        ? 'bg-neutral-700 text-white border border-neutral-600'
                        : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                    }`}
                  >
                    {rate}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Multi-track Export Mode */}
          {isMultiple && (
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Mode d'exportation groupé
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('zip')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    mode === 'zip'
                      ? `${ACCENT_BORDER[accent]} ring-1 ring-white/20`
                      : 'bg-neutral-950/60 border-neutral-800/80 hover:bg-neutral-800/50'
                  }`}
                >
                  <Archive className="w-5 h-5 flex-shrink-0 mt-0.5 text-neutral-300" />
                  <div>
                    <span className="font-bold text-xs text-white block">
                      Archive .ZIP Groupée (Recommandé)
                    </span>
                    <span className="text-[11px] text-neutral-400 block mt-0.5">
                      1 seul fichier ZIP téléchargé contenant tous les morceaux organisés avec leurs métadonnées.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('individual')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    mode === 'individual'
                      ? `${ACCENT_BORDER[accent]} ring-1 ring-white/20`
                      : 'bg-neutral-950/60 border-neutral-800/80 hover:bg-neutral-800/50'
                  }`}
                >
                  <FileAudio className="w-5 h-5 flex-shrink-0 mt-0.5 text-neutral-300" />
                  <div>
                    <span className="font-bold text-xs text-white block">
                      Fichiers Individuels
                    </span>
                    <span className="text-[11px] text-neutral-400 block mt-0.5">
                      Enregistre chaque fichier audio consécutivement dans votre dossier de téléchargement.
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* File Naming Pattern & Archive Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-neutral-400">Format du Nom de Fichier</span>
              <select
                value={namingPattern}
                onChange={(e) => setNamingPattern(e.target.value as any)}
                className="bg-neutral-950 border border-neutral-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none"
              >
                <option value="artist_title">Artiste - Titre.{format}</option>
                <option value="title_artist">Titre - Artiste.{format}</option>
                <option value="numbered">01. Artiste - Titre.{format} (Numéroté)</option>
                <option value="title_only">Titre.{format}</option>
              </select>
            </div>

            {isMultiple && mode === 'zip' && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-neutral-400">Nom de l'Archive .ZIP</span>
                <input
                  type="text"
                  value={zipName}
                  onChange={(e) => setZipName(e.target.value)}
                  placeholder="Nom_Archive"
                  className="bg-neutral-950 border border-neutral-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none placeholder-neutral-600"
                />
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-800/80 bg-neutral-950 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            Fermer
          </button>

          <button
            type="button"
            id="modal-start-export-btn"
            onClick={handleStartExport}
            disabled={isExporting || selectedTracks.length === 0}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-200 shadow-md ${
              isExporting || selectedTracks.length === 0
                ? 'opacity-50 cursor-not-allowed bg-neutral-800 text-neutral-400'
                : `${ACCENT_BTN[accent]} hover:scale-[1.02] active:scale-[0.98]`
            }`}
          >
            {isExporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Exportation en cours...</span>
              </>
            ) : (
              <>
                <FolderDown className="w-4 h-4" />
                <span>
                  {isMultiple
                    ? `Exporter les ${selectedTracks.length} morceaux (.${format.toUpperCase()})`
                    : `Exporter sur mon PC (.${format.toUpperCase()})`}
                </span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

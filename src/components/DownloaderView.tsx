import React, { useState, useEffect } from 'react';
import {
  Download,
  Search,
  Music,
  Film,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  FileAudio,
  FileVideo,
  Play,
  RotateCcw,
  Copy,
  ExternalLink,
  ChevronRight,
  Sliders,
  Layers,
  ListPlus,
  Trash2,
  FolderDown,
  RefreshCw,
} from 'lucide-react';
import { AccentColor, Track, PlayerSettings } from '../types';
import { getT } from '../i18n';

interface InspectedMedia {
  id: string;
  title: string;
  artist: string;
  originalTitle: string;
  originalArtist: string;
  duration: number;
  durationStr: string;
  thumbnail: string;
  description?: string;
  extractor?: string;
  webpageUrl?: string;
  viewCount?: number | string;
  hasVideo: boolean;
  hasAudio: boolean;
  videoResolutions: number[];
  audioFormats: { format: string; label: string; bitrates: string[]; defaultBitrate: string }[];
  videoFormats: { format: string; label: string }[];
}

interface DownloadHistoryItem {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  type: 'audio' | 'video';
  format: string;
  quality: string;
  downloadUrl: string;
  timestamp: number;
  durationStr: string;
  sizeStr?: string;
  filePath?: string;
}

interface DownloaderViewProps {
  accent: AccentColor;
  onTrackImported?: (track: Track) => void;
  onPlayTrack?: (track: Track) => void;
  settings?: PlayerSettings;
}

const ACCENT_BG_CLASSES: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950',
  violet: 'bg-violet-500 hover:bg-violet-400 text-white',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white',
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950',
  rose: 'bg-rose-500 hover:bg-rose-400 text-white',
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950',
};

const ACCENT_TEXT_CLASSES: Record<AccentColor, string> = {
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  cyan: 'text-cyan-400',
};

const ACCENT_BORDER_CLASSES: Record<AccentColor, string> = {
  emerald: 'border-emerald-500/30 focus:border-emerald-500',
  violet: 'border-violet-500/30 focus:border-violet-500',
  blue: 'border-blue-500/30 focus:border-blue-500',
  amber: 'border-amber-500/30 focus:border-amber-500',
  rose: 'border-rose-500/30 focus:border-rose-500',
  cyan: 'border-cyan-500/30 focus:border-cyan-500',
};

const SUPPORTED_SERVICES = [
  { name: 'YouTube', desc: 'Vidéos, Musiques & Shorts 4K', color: 'text-red-400' },
  { name: 'TikTok', desc: 'Vidéos & Audios sans filigrane', color: 'text-cyan-300' },
  { name: 'SoundCloud', desc: 'Morceaux & Podcasts Hi-Fi', color: 'text-amber-400' },
  { name: 'Instagram', desc: 'Reels & Vidéos', color: 'text-pink-400' },
  { name: 'X / Twitter', desc: 'Clips & Médias', color: 'text-sky-400' },
  { name: 'Vimeo & Dailymotion', desc: 'Vidéos HD', color: 'text-indigo-400' },
];

export const DownloaderView: React.FC<DownloaderViewProps> = ({
  accent,
  onTrackImported,
  onPlayTrack,
  settings,
}) => {
  const t = getT(settings?.language);
  const [inputUrl, setInputUrl] = useState('');
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [inspectedMedia, setInspectedMedia] = useState<InspectedMedia | null>(null);

  // User Choices state
  const [mediaType, setMediaType] = useState<'audio' | 'video'>('audio');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [audioBitrate, setAudioBitrate] = useState('320k');
  const [videoFormat, setVideoFormat] = useState('mp4');
  const [videoQuality, setVideoQuality] = useState('1080');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');

  // Download processing state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgressStep, setDownloadProgressStep] = useState<string>('');
  const [downloadProgressData, setDownloadProgressData] = useState<{
    percent: number;
    speed?: string;
    eta?: string;
    totalSize?: string;
    message?: string;
  } | null>(null);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Mode: Single URL vs Batch URLs
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'history'>('single');
  const [batchUrls, setBatchUrls] = useState('');
  const [batchStatusList, setBatchStatusList] = useState<{ url: string; status: 'pending' | 'downloading' | 'done' | 'error'; title?: string }[]>([]);

  // Download History
  const [history, setHistory] = useState<DownloadHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('flowluna_dl_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveHistoryItem = (item: DownloadHistoryItem) => {
    setHistory((prev) => {
      const updated = [item, ...prev.filter((h) => h.id !== item.id)].slice(0, 30);
      try {
        localStorage.setItem('flowluna_dl_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('flowluna_dl_history');
    } catch {}
  };

  // Inspect URL
  const handleInspectUrl = async (urlToInspect?: string) => {
    const target = (urlToInspect || inputUrl).trim();
    if (!target) return;

    setIsInspecting(true);
    setInspectError(null);
    setDownloadSuccessMessage(null);
    setDownloadError(null);

    try {
      const res = await fetch('/api/downloader/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Impossible d’analyser le lien.');
      }

      setInspectedMedia(data);
      setCustomTitle(data.title);
      setCustomArtist(data.artist);

      // Default quality logic
      if (data.videoResolutions && data.videoResolutions.length > 0) {
        const topRes = data.videoResolutions.find((r: number) => r <= 1080) || data.videoResolutions[0];
        setVideoQuality(topRes.toString());
      } else {
        setVideoQuality('best');
      }

      if (data.hasVideo && !data.hasAudio) {
        setMediaType('video');
      }
    } catch (err: any) {
      setInspectError(err.message || 'Erreur lors de l’analyse du média.');
      setInspectedMedia(null);
    } finally {
      setIsInspecting(false);
    }
  };

  // Trigger inspect automatically on paste if it looks like a URL
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (pasted.startsWith('http://') || pasted.startsWith('https://')) {
      setInputUrl(pasted);
      setTimeout(() => handleInspectUrl(pasted), 100);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        setInputUrl(text);
        handleInspectUrl(text);
      }
    } catch {
      // Fallback
    }
  };

  // Download directly to PC via Browser with live progress
  const handleDownloadToPC = () => {
    if (!inspectedMedia) return;

    setIsDownloading(true);
    setDownloadError(null);
    setDownloadSuccessMessage(null);
    setDownloadProgressData({ percent: 0, message: 'Initialisation du téléchargement...' });
    setDownloadProgressStep('Initialisation du téléchargement via yt-dlp & FFmpeg...');

    const jobId = `pc_dl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const eventSource = new EventSource(`/api/downloader/progress/${jobId}`);

    eventSource.onmessage = (e) => {
      try {
        const update = JSON.parse(e.data);
        setDownloadProgressData(update);
        if (update.message) setDownloadProgressStep(update.message);
        if (update.status === 'finished' || update.percent >= 100) {
          eventSource.close();
          setDownloadProgressData({ percent: 100, message: t.downloadComplete });
          setDownloadProgressStep(t.downloadComplete);
          setDownloadSuccessMessage(
            `"${customTitle || inspectedMedia.title}" a été téléchargé avec succès sur votre PC !`
          );
          setTimeout(() => {
            setIsDownloading(false);
            setDownloadProgressStep('');
          }, 4500);
        }
      } catch {}
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    const params = new URLSearchParams({
      jobId,
      url: inspectedMedia.webpageUrl || inputUrl,
      type: mediaType,
      audioFormat: audioFormat,
      audioBitrate: audioBitrate,
      videoFormat: videoFormat,
      videoQuality: videoQuality,
      title: customTitle,
      artist: customArtist,
    });

    const downloadUrl = `/api/downloader/download?${params.toString()}`;

    // Create anchor to initiate file download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Save to history
    saveHistoryItem({
      id: `${inspectedMedia.id}-${Date.now()}`,
      title: customTitle || inspectedMedia.title,
      artist: customArtist || inspectedMedia.artist,
      thumbnail: inspectedMedia.thumbnail,
      type: mediaType,
      format: mediaType === 'video' ? videoFormat : audioFormat,
      quality: mediaType === 'video' ? `${videoQuality}p` : audioBitrate,
      downloadUrl,
      timestamp: Date.now(),
      durationStr: inspectedMedia.durationStr,
    });
  };

  // Save to App Library & Offline Cache with live progress
  const handleSaveToApp = async (andPlay: boolean = false) => {
    if (!inspectedMedia) return;

    setIsDownloading(true);
    setDownloadError(null);
    setDownloadSuccessMessage(null);
    setDownloadProgressData({ percent: 0, message: 'Démarrage du téléchargement...' });
    setDownloadProgressStep('Téléchargement et intégration dans la bibliothèque FlowLuna...');

    const jobId = `app_dl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const eventSource = new EventSource(`/api/downloader/progress/${jobId}`);

    eventSource.onmessage = (e) => {
      try {
        const update = JSON.parse(e.data);
        setDownloadProgressData(update);
        if (update.message) setDownloadProgressStep(update.message);
        if (update.status === 'finished') {
          eventSource.close();
        }
      } catch {}
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    try {
      const res = await fetch('/api/downloader/save-to-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          url: inspectedMedia.webpageUrl || inputUrl,
          mediaType,
          audioFormat,
          audioBitrate,
          videoFormat,
          videoQuality,
          title: customTitle,
          artist: customArtist,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de l’enregistrement');
      }

      if (onTrackImported && data.track) {
        onTrackImported(data.track);
      }

      if (andPlay && onPlayTrack && data.track) {
        onPlayTrack(data.track);
      }

      saveHistoryItem({
        id: `${inspectedMedia.id}-${Date.now()}`,
        title: customTitle || inspectedMedia.title,
        artist: customArtist || inspectedMedia.artist,
        thumbnail: inspectedMedia.thumbnail,
        type: mediaType,
        format: data.track?.format || (mediaType === 'video' ? videoFormat : audioFormat),
        quality: mediaType === 'video' ? `${videoQuality}p` : audioBitrate,
        downloadUrl: data.track?.url || '',
        timestamp: Date.now(),
        durationStr: inspectedMedia.durationStr,
        filePath: data.track?.filePath,
      });

      setDownloadSuccessMessage(
        `"${data.track?.title || customTitle}" a été importé avec succès dans votre bibliothèque locale !`
      );
    } catch (err: any) {
      setDownloadError(err.message || 'Erreur lors de l’importation.');
    } finally {
      eventSource.close();
      setIsDownloading(false);
      setDownloadProgressStep('');
    }
  };

  // Batch URLs downloader
  const handleStartBatchDownload = async () => {
    const urls = batchUrls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http://') || u.startsWith('https://'));

    if (urls.length === 0) return;

    setBatchStatusList(urls.map((u) => ({ url: u, status: 'pending' })));

    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      setBatchStatusList((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'downloading' } : item))
      );

      try {
        const params = new URLSearchParams({
          url: u,
          type: mediaType,
          audioFormat,
          audioBitrate,
          videoFormat,
          videoQuality,
        });

        const dlUrl = `/api/downloader/download?${params.toString()}`;
        const a = document.createElement('a');
        a.href = dlUrl;
        a.setAttribute('download', '');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setBatchStatusList((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: 'done' } : item))
        );
        // Small delay between batch downloads
        await new Promise((r) => setTimeout(r, 1500));
      } catch {
        setBatchStatusList((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: 'error' } : item))
        );
      }
    }
  };

  return (
    <div id="downloader-view" className="flex-1 h-full overflow-y-auto p-6 md:p-8 flex flex-col gap-6 select-none glass-main">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 shadow-sm backdrop-blur-md">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>Téléchargeur Média</span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400">
                yt-dlp & FFmpeg
              </span>
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Téléchargez et convertissez vos musiques et vidéos en haute fidélité
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-white/5 dark:bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'single'
                ? 'bg-white/15 dark:bg-white/20 text-neutral-900 dark:text-white shadow-xs font-bold'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Lien Unique
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'batch'
                ? 'bg-white/15 dark:bg-white/20 text-neutral-900 dark:text-white shadow-xs font-bold'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Par Lots
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white/15 dark:bg-white/20 text-neutral-900 dark:text-white shadow-xs font-bold'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-red-400" />
            <span>Historique ({history.length})</span>
          </button>
        </div>
      </div>

      {/* SINGLE URL MODE */}
      {activeTab === 'single' && (
        <div className="space-y-6">
          {/* Main Input Bar */}
          <div className="p-4 rounded-2xl glass-card border border-white/10 shadow-xl space-y-3 backdrop-blur-xl">
            <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <span>Collez l'URL de votre vidéo ou musique</span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-normal">
                (YouTube, TikTok, SoundCloud, Instagram, X/Twitter, Vimeo...)
              </span>
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInspectUrl();
                    }
                  }}
                  placeholder="https://www.youtube.com/watch?v=... ou tiktok, soundcloud, x.com"
                  className="w-full pl-4 pr-24 py-3 rounded-xl bg-black/30 dark:bg-black/40 border border-white/10 text-xs text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all font-mono backdrop-blur-md"
                />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {inputUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setInputUrl('');
                        setInspectedMedia(null);
                        setInspectError(null);
                      }}
                      className="px-2 py-1 text-[10px] text-neutral-500 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-white/10 hover:bg-white/20 rounded-md cursor-pointer transition-colors"
                    >
                      Effacer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="px-2 py-1 text-[10px] text-neutral-500 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-white/10 hover:bg-white/20 rounded-md cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Coller
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleInspectUrl()}
                disabled={!inputUrl.trim() || isInspecting}
                className={`w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                  !inputUrl.trim() || isInspecting
                    ? 'opacity-50 cursor-not-allowed bg-white/10 text-neutral-500'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/50'
                }`}
              >
                {isInspecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Analyse yt-dlp...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Analyser le média</span>
                  </>
                )}
              </button>
            </div>

            {/* Supported services tags */}
            <div className="pt-2 flex items-center gap-2 flex-wrap text-[11px] text-neutral-400">
              <span className="font-semibold text-neutral-500 dark:text-neutral-400">Services pris en charge :</span>
              {SUPPORTED_SERVICES.map((s) => (
                <span
                  key={s.name}
                  className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-700 dark:text-neutral-300 font-medium backdrop-blur-md"
                >
                  <span className={s.color}>{s.name}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Inspect Error Message */}
          {inspectError && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Erreur d'analyse</span>
                <span>{inspectError}</span>
              </div>
            </div>
          )}

          {/* INSPECTION RESULT & USER CHOICES CARD */}
          {inspectedMedia && (
            <div className="p-6 rounded-2xl glass-card border border-white/10 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 backdrop-blur-xl">
              {/* Media Preview Banner */}
              <div className="flex flex-col md:flex-row items-start gap-5 bg-white/5 dark:bg-black/30 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                {inspectedMedia.thumbnail && (
                  <div className="relative w-full md:w-48 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 border border-white/10 group">
                    <img
                      src={inspectedMedia.thumbnail}
                      alt={inspectedMedia.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-white font-semibold">
                      {inspectedMedia.durationStr}
                    </div>
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 border border-red-500/30 text-red-400 uppercase">
                      {inspectedMedia.extractor || 'Web'}
                    </span>
                    {inspectedMedia.viewCount && (
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                        {typeof inspectedMedia.viewCount === 'number'
                          ? `${(inspectedMedia.viewCount / 1000000).toFixed(1)}M vues`
                          : inspectedMedia.viewCount}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-neutral-900 dark:text-white leading-snug">
                    {inspectedMedia.title}
                  </h3>

                  <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium flex items-center gap-1.5">
                    <span>Créateur / Artiste :</span>
                    <span className="text-red-400 font-semibold">{inspectedMedia.artist}</span>
                  </p>

                  {inspectedMedia.description && (
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2">
                      {inspectedMedia.description}
                    </p>
                  )}
                </div>
              </div>

              {/* DEMANDE À L'UTILISATEUR : CHOIX DU TYPE DE MÉDIA (AUDIO vs VIDÉO) */}
              <div className="space-y-4 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-extrabold text-neutral-500 dark:text-neutral-400 tracking-wider">
                    1. Choisissez le type de conversion
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mode Audio */}
                  <button
                    type="button"
                    onClick={() => setMediaType('audio')}
                    className={`p-4 rounded-xl border transition-all text-left flex items-start gap-3.5 cursor-pointer backdrop-blur-md ${
                      mediaType === 'audio'
                        ? 'bg-red-500/15 border-red-500 shadow-md ring-1 ring-red-500/50'
                        : 'bg-white/5 border-white/10 hover:border-white/20 text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl ${
                        mediaType === 'audio'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-white/5 text-neutral-400'
                      }`}
                    >
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-neutral-900 dark:text-white block">
                        Extraction Audio / Musique
                      </span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
                        MP3 (320k), FLAC Lossless, WAV Studio, M4A, OGG, OPUS
                      </span>
                    </div>
                  </button>

                  {/* Mode Vidéo */}
                  <button
                    type="button"
                    onClick={() => setMediaType('video')}
                    className={`p-4 rounded-xl border transition-all text-left flex items-start gap-3.5 cursor-pointer backdrop-blur-md ${
                      mediaType === 'video'
                        ? 'bg-red-500/15 border-red-500 shadow-md ring-1 ring-red-500/50'
                        : 'bg-white/5 border-white/10 hover:border-white/20 text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl ${
                        mediaType === 'video'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-white/5 text-neutral-400'
                      }`}
                    >
                      <FileVideo className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-neutral-900 dark:text-white block">
                        Téléchargement Vidéo & Clip
                      </span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
                        MP4, MKV, WebM (4K, 1440p, 1080p Full HD, 720p)
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* DEMANDE À L'UTILISATEUR : PARAMÈTRES DE FORMAT & QUALITÉ */}
              <div className="space-y-4 pt-2 border-t border-white/10">
                <span className="text-xs uppercase font-extrabold text-neutral-500 dark:text-neutral-400 tracking-wider">
                  2. Personnalisez le format et la qualité
                </span>

                {mediaType === 'audio' ? (
                  /* Audio Options */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Format Audio */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Format du fichier audio
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {inspectedMedia.audioFormats.map((af) => (
                          <button
                            key={af.format}
                            type="button"
                            onClick={() => {
                              setAudioFormat(af.format);
                              setAudioBitrate(af.defaultBitrate);
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer backdrop-blur-md ${
                              audioFormat === af.format
                                ? 'bg-red-500/20 border-red-500 text-red-300 shadow-xs'
                                : 'bg-white/5 border-white/10 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <span className="uppercase">{af.format}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bitrate / Qualité */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Débit audio & Qualité
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {['320k', '256k', '192k', '128k'].map((br) => (
                          <button
                            key={br}
                            type="button"
                            onClick={() => setAudioBitrate(br)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer backdrop-blur-md ${
                              audioBitrate === br
                                ? 'bg-red-500/20 border-red-500 text-red-300 shadow-xs'
                                : 'bg-white/5 border-white/10 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <span>{br === '320k' ? '320 kbps (Hi-Fi Studio)' : `${br.replace('k', ' kbps')}`}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Video Options */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Conteneur Vidéo */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Format vidéo
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {inspectedMedia.videoFormats.map((vf) => (
                          <button
                            key={vf.format}
                            type="button"
                            onClick={() => setVideoFormat(vf.format)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer backdrop-blur-md ${
                              videoFormat === vf.format
                                ? 'bg-red-500/20 border-red-500 text-red-300 shadow-xs'
                                : 'bg-white/5 border-white/10 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <span className="uppercase">{vf.format}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Résolution Vidéo */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Résolution vidéo
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {inspectedMedia.videoResolutions.length > 0 ? (
                          inspectedMedia.videoResolutions.slice(0, 6).map((res) => (
                            <button
                              key={res}
                              type="button"
                              onClick={() => setVideoQuality(res.toString())}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer backdrop-blur-md ${
                                videoQuality === res.toString()
                                  ? 'bg-red-500/20 border-red-500 text-red-300 shadow-xs'
                                  : 'bg-white/5 border-white/10 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <span>{res >= 2160 ? '4K (2160p)' : res >= 1440 ? '2K (1440p)' : res >= 1080 ? '1080p HD' : `${res}p`}</span>
                            </button>
                          ))
                        ) : (
                          <button
                            type="button"
                            onClick={() => setVideoQuality('best')}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/20 border-red-500 text-red-300 col-span-3"
                          >
                            Meilleure disponible
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Métadonnées éditables */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                      Titre du fichier
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black/30 dark:bg-black/40 border border-white/10 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-red-500/60 backdrop-blur-md"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                      Artiste / Chaîne
                    </label>
                    <input
                      type="text"
                      value={customArtist}
                      onChange={(e) => setCustomArtist(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black/30 dark:bg-black/40 border border-white/10 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-red-500/60 backdrop-blur-md"
                    />
                  </div>
                </div>
              </div>

              {/* DEMANDE À L'UTILISATEUR : ACTIONS DE SORTIE */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <span className="text-xs uppercase font-extrabold text-neutral-500 dark:text-neutral-400 tracking-wider block">
                  3. Choisissez l'action de sortie
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Action 1: Direct PC Download */}
                  <button
                    type="button"
                    onClick={handleDownloadToPC}
                    disabled={isDownloading}
                    className="p-3.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-500 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 cursor-pointer disabled:opacity-50"
                  >
                    <FolderDown className="w-4 h-4" />
                    <span>Télécharger sur mon PC</span>
                  </button>

                  {/* Action 2: Save to App Library */}
                  <button
                    type="button"
                    onClick={() => handleSaveToApp(false)}
                    disabled={isDownloading}
                    className="p-3.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-neutral-900 dark:text-white border border-white/10 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 backdrop-blur-md"
                  >
                    <HardDrive className="w-4 h-4 text-red-400" />
                    <span>Ajouter à la Bibliothèque</span>
                  </button>

                  {/* Action 3: Download and Play immediately */}
                  <button
                    type="button"
                    onClick={() => handleSaveToApp(true)}
                    disabled={isDownloading}
                    className="p-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Télécharger & Lire</span>
                  </button>
                </div>

                {/* Real-time Progress / Success / Error feedback */}
                {isDownloading && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/5 dark:bg-black/40 border-2 border-red-500/40 text-xs text-neutral-700 dark:text-neutral-300 flex flex-col gap-3.5 animate-in fade-in shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <RefreshCw className="w-4 h-4 animate-spin text-red-400 shrink-0" />
                        <span className="font-bold text-neutral-900 dark:text-white text-sm truncate">
                          {downloadProgressStep || t.downloadingState}
                        </span>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-mono font-black text-sm shrink-0 pl-2 shadow-sm">
                        {Math.round(downloadProgressData?.percent || 0)}%
                      </span>
                    </div>

                    {/* Prominent High-Visibility 0% to 100% Progress Bar */}
                    <div className="flex flex-col gap-1.5">
                      <div className="w-full h-4 sm:h-5 rounded-full bg-black/40 overflow-hidden relative border border-white/10 shadow-inner p-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 rounded-full transition-all duration-300 shadow-md relative"
                          style={{ width: `${Math.min(100, Math.max(2, downloadProgressData?.percent || 0))}%` }}
                        >
                          {/* Shimmer light sweep */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-neutral-500 dark:text-neutral-400 px-1">
                        <span>0%</span>
                        <span className="text-neutral-400">50%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {/* Metrics: Speed, ETA, Size */}
                    {(downloadProgressData?.speed || downloadProgressData?.eta || downloadProgressData?.totalSize) && (
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono pt-1 border-t border-white/10">
                        <div className="bg-white/5 py-1.5 px-2 rounded-lg border border-white/10 backdrop-blur-md">
                          <span className="text-neutral-500 dark:text-neutral-400 block text-[9px] uppercase font-bold">{t.speedLabel}</span>
                          <span className="text-amber-400 font-bold">{downloadProgressData.speed || '—'}</span>
                        </div>
                        <div className="bg-white/5 py-1.5 px-2 rounded-lg border border-white/10 backdrop-blur-md">
                          <span className="text-neutral-500 dark:text-neutral-400 block text-[9px] uppercase font-bold">{t.etaLabel}</span>
                          <span className="text-neutral-700 dark:text-neutral-200 font-bold">{downloadProgressData.eta || '—'}</span>
                        </div>
                        <div className="bg-white/5 py-1.5 px-2 rounded-lg border border-white/10 backdrop-blur-md">
                          <span className="text-neutral-500 dark:text-neutral-400 block text-[9px] uppercase font-bold">{t.sizeLabel}</span>
                          <span className="text-cyan-400 font-bold">{downloadProgressData.totalSize || '—'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {downloadSuccessMessage && (
                  <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-300 flex items-center gap-2.5 animate-in fade-in backdrop-blur-md">
                    <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{downloadSuccessMessage}</span>
                  </div>
                )}

                {downloadError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2.5 animate-in fade-in backdrop-blur-md">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{downloadError}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BATCH DOWNLOAD MODE */}
      {activeTab === 'batch' && (
        <div className="p-6 rounded-2xl glass-card border border-white/10 shadow-xl space-y-5 animate-in fade-in backdrop-blur-xl">
          <div>
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
              Téléchargement Multi-Liens par Lots
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Collez plusieurs liens (un par ligne). Chaque vidéo ou piste sera téléchargée automatiquement avec les paramètres ci-dessous.
            </p>
          </div>

          <textarea
            value={batchUrls}
            onChange={(e) => setBatchUrls(e.target.value)}
            rows={5}
            placeholder="https://www.youtube.com/watch?v=...&#10;https://www.youtube.com/watch?v=...&#10;https://soundcloud.com/..."
            className="w-full p-4 rounded-xl bg-black/30 dark:bg-black/40 border border-white/10 text-xs text-neutral-900 dark:text-white placeholder-neutral-500 font-mono focus:outline-none focus:ring-1 focus:ring-red-500/50 backdrop-blur-md"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 dark:bg-black/30 p-4 rounded-xl border border-white/10 backdrop-blur-md">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Format de conversion</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMediaType('audio')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    mediaType === 'audio'
                      ? 'bg-red-600 text-white'
                      : 'bg-white/10 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Audio (MP3 320k)
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType('video')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    mediaType === 'video'
                      ? 'bg-red-600 text-white'
                      : 'bg-white/10 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Vidéo (MP4 1080p)
                </button>
              </div>
            </div>

            <div className="flex items-end justify-end">
              <button
                type="button"
                onClick={handleStartBatchDownload}
                disabled={!batchUrls.trim()}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer ${
                  !batchUrls.trim()
                    ? 'opacity-50 cursor-not-allowed bg-white/10 text-neutral-500'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/50'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Lancer le lot</span>
              </button>
            </div>
          </div>

          {batchStatusList.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Statut de la file :</span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {batchStatusList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between text-xs backdrop-blur-md"
                  >
                    <span className="truncate max-w-[70%] font-mono text-neutral-700 dark:text-neutral-300">
                      {item.url}
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        item.status === 'done'
                          ? 'text-red-400'
                          : item.status === 'downloading'
                          ? 'text-amber-400 animate-pulse'
                          : item.status === 'error'
                          ? 'text-rose-400'
                          : 'text-neutral-500'
                      }`}
                    >
                      {item.status === 'done'
                        ? '✅ Téléchargé'
                        : item.status === 'downloading'
                        ? '⏳ Téléchargement...'
                        : item.status === 'error'
                        ? '❌ Erreur'
                        : 'En attente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORY MODE */}
      {activeTab === 'history' && (
        <div className="p-6 rounded-2xl glass-card border border-white/10 shadow-xl space-y-4 animate-in fade-in backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                Historique des téléchargements récents
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Retrouvez facilement les fichiers téléchargés lors de cette session.
              </p>
            </div>

            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/40 border border-rose-800/40 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Effacer l'historique</span>
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 space-y-2">
              <Download className="w-10 h-10 mx-auto opacity-40 text-neutral-400" />
              <p className="text-xs">Aucun téléchargement récent pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 flex items-center justify-between gap-3 transition-colors backdrop-blur-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover bg-black/40 border border-white/10 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-neutral-500 flex-shrink-0">
                        {item.type === 'video' ? <Film className="w-5 h-5" /> : <Music className="w-5 h-5" />}
                      </div>
                    )}

                    <div className="min-w-0">
                      <span className="font-bold text-xs text-neutral-900 dark:text-white block truncate">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block truncate">
                        {item.artist}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-500">
                        <span className="uppercase font-mono font-semibold text-red-400">
                          {item.format}
                        </span>
                        <span>•</span>
                        <span>{item.quality}</span>
                        <span>•</span>
                        <span>{item.durationStr}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onPlayTrack && (
                      <button
                        type="button"
                        onClick={() => {
                          const historyTrack: Track = {
                            id: item.id,
                            title: item.title,
                            artist: item.artist,
                            album: item.type === 'video' ? 'Vidéos Téléchargées' : 'Téléchargements yt-dlp',
                            duration: 180,
                            format: (item.format as any) || (item.type === 'video' ? 'mp4' : 'mp3'),
                            url: item.downloadUrl,
                            coverUrl: item.thumbnail,
                            source: 'local',
                            isFavorite: false,
                            isCachedOffline: true,
                            playCount: 0,
                            addedAt: item.timestamp,
                            isVideo: item.type === 'video',
                            filePath: item.filePath || (item.downloadUrl.startsWith('/api/library/stream?file=')
                              ? decodeURIComponent(item.downloadUrl.replace('/api/library/stream?file=', ''))
                              : undefined),
                          };
                          onPlayTrack(historyTrack);
                        }}
                        className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer shadow-xs"
                        title="Écouter / Lire ce média"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </button>
                    )}
                    {item.downloadUrl && (
                      <a
                        href={item.downloadUrl}
                        download
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white border border-white/10 transition-colors"
                        title="Re-télécharger"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

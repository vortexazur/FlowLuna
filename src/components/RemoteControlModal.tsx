import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  X,
  Copy,
  Check,
  QrCode,
  Wifi,
  ExternalLink,
  ShieldCheck,
  Radio,
  Sliders,
  Music,
} from 'lucide-react';
import { AccentColor } from '../types';
import { generateQrSvg } from '../utils/qrCodeGenerator';
import { fetchRemoteInfo, RemoteInfo } from '../services/remoteControlService';

interface RemoteControlModalProps {
  isOpen: boolean;
  onClose: () => void;
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

const ACCENT_BORDER: Record<AccentColor, string> = {
  emerald: 'border-emerald-500/30',
  violet: 'border-violet-500/30',
  blue: 'border-blue-500/30',
  amber: 'border-amber-500/30',
  rose: 'border-rose-500/30',
  cyan: 'border-cyan-500/30',
};

const ACCENT_BG: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500/10',
  violet: 'bg-violet-500/10',
  blue: 'bg-blue-500/10',
  amber: 'bg-amber-500/10',
  rose: 'bg-rose-500/10',
  cyan: 'bg-cyan-500/10',
};

export const RemoteControlModal: React.FC<RemoteControlModalProps> = ({
  isOpen,
  onClose,
  accent,
}) => {
  const [remoteInfo, setRemoteInfo] = useState<RemoteInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetchRemoteInfo().then((info) => {
      setRemoteInfo(info);
      setIsLoading(false);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const remoteUrl = remoteInfo?.url || 'http://127.0.0.1:3000/remote';
  const qrSvg = generateQrSvg(remoteUrl, {
    size: 200,
    fgColor: accent === 'emerald' ? '#10b981' : accent === 'violet' ? '#8b5cf6' : '#38bdf8',
    bgColor: 'rgba(255, 255, 255, 0.03)',
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(remoteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-neutral-900/95 border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col items-center select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 w-full">
          <div className={`p-2.5 rounded-xl ${ACCENT_BG[accent]} ${ACCENT_BORDER[accent]} border`}>
            <Smartphone className={`w-6 h-6 ${ACCENT_TEXT[accent]}`} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              FlowLuna Remote
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Wi-Fi Local
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              Contrôlez la musique et vos vidéos depuis votre smartphone
            </p>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center my-2 shadow-inner">
          {isLoading ? (
            <div className="w-[200px] h-[200px] flex items-center justify-center text-xs text-neutral-500 animate-pulse">
              Génération du QR Code...
            </div>
          ) : (
            <div
              className="rounded-xl overflow-hidden shadow-lg p-2 bg-neutral-950/80 border border-white/5"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400 font-medium">
            <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Scannez avec votre appareil photo</span>
          </div>
        </div>

        {/* Pairing PIN & URL */}
        <div className="w-full mt-3 space-y-2">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
                Lien direct navigateur
              </span>
              <span className="text-xs text-neutral-200 font-mono truncate max-w-[260px]">
                {remoteUrl}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-neutral-200 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="Copier le lien"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copié</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier</span>
                </>
              )}
            </button>
          </div>

          {/* Quick PIN Code */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-neutral-300 font-medium">Code PIN de sécurité</span>
            </div>
            <span className="text-sm font-mono font-bold tracking-widest text-emerald-400 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              {remoteInfo?.pin || '4242'}
            </span>
          </div>
        </div>

        {/* Features preview */}
        <div className="grid grid-cols-3 gap-2 w-full mt-4 pt-3 border-t border-white/10 text-center">
          <div className="p-2 rounded-xl bg-white/[0.02]">
            <Music className="w-4 h-4 mx-auto mb-1 text-neutral-400" />
            <div className="text-[11px] font-semibold text-neutral-200">Lecture Hi-Fi</div>
            <div className="text-[9px] text-neutral-500">Play, pause, saut</div>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.02]">
            <Sliders className="w-4 h-4 mx-auto mb-1 text-neutral-400" />
            <div className="text-[11px] font-semibold text-neutral-200">Volume & File</div>
            <div className="text-[9px] text-neutral-500">Ajustement direct</div>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.02]">
            <Radio className="w-4 h-4 mx-auto mb-1 text-amber-400" />
            <div className="text-[11px] font-semibold text-neutral-200">Skip OP Vidéo</div>
            <div className="text-[9px] text-neutral-500">Bouton télécommande</div>
          </div>
        </div>
      </div>
    </div>
  );
};

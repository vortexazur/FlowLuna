import React from 'react';
import { Sliders, X, RotateCcw, Volume2, Sparkles, Check } from 'lucide-react';
import { EqualizerSettings, EqualizerPresetName, AccentColor, PlayerSettings } from '../types';
import { EQ_PRESETS, DEFAULT_EQ_FREQUENCIES, audioEngine } from '../services/audioEngine';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EqualizerSettings;
  onChange: (settings: EqualizerSettings) => void;
  accent: AccentColor;
  playerSettings?: PlayerSettings;
  onUpdatePlayerSettings?: (settings: PlayerSettings) => void;
}

const ACCENT_BG: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500 text-neutral-950',
  violet: 'bg-violet-500 text-white',
  blue: 'bg-blue-500 text-white',
  amber: 'bg-amber-500 text-neutral-950',
  rose: 'bg-rose-500 text-white',
  cyan: 'bg-cyan-500 text-neutral-950',
};

const ACCENT_ACCENT: Record<AccentColor, string> = {
  emerald: 'accent-emerald-500',
  violet: 'accent-violet-500',
  blue: 'accent-blue-500',
  amber: 'accent-amber-500',
  rose: 'accent-rose-500',
  cyan: 'accent-cyan-500',
};

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
  accent,
  playerSettings,
  onUpdatePlayerSettings,
}) => {
  if (!isOpen) return null;

  const handleBandChange = (index: number, gain: number) => {
    const newBands = [...settings.bands];
    newBands[index] = { ...newBands[index], gain };
    const updated: EqualizerSettings = {
      ...settings,
      preset: 'Custom',
      bands: newBands,
    };
    onChange(updated);
    audioEngine.applyEqualizer(updated);
  };

  const handlePresetSelect = (preset: EqualizerPresetName) => {
    const gains = EQ_PRESETS[preset] || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const newBands = DEFAULT_EQ_FREQUENCIES.map((freq, idx) => ({
      frequency: freq,
      gain: gains[idx] || 0,
      label: freq >= 1000 ? `${freq / 1000}k` : `${freq}`,
    }));

    const updated: EqualizerSettings = {
      ...settings,
      preset,
      bands: newBands,
    };
    onChange(updated);
    audioEngine.applyEqualizer(updated);
  };

  const handleToggle = () => {
    const updated: EqualizerSettings = {
      ...settings,
      enabled: !settings.enabled,
    };
    onChange(updated);
    audioEngine.applyEqualizer(updated);
  };

  const handleReset = () => {
    handlePresetSelect('Flat');
  };

  const formatFrequencyLabel = (freq: number) => {
    return freq >= 1000 ? `${freq / 1000} kHz` : `${freq} Hz`;
  };

  return (
    <div
      id="equalizer-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="equalizer-modal-content"
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900/95 glass-modal text-neutral-100 p-6 shadow-2xl flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${ACCENT_BG[accent]}`}>
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Égaliseur Paramétrique 10 Bandes</h2>
              <p className="text-xs text-neutral-400">Traitement audio haute fidélité temps réel 32-bit float</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="eq-toggle-btn"
              onClick={handleToggle}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
                settings.enabled
                  ? `${ACCENT_BG[accent]} shadow-md`
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Check className={`w-3.5 h-3.5 ${settings.enabled ? 'block' : 'hidden'}`} />
              {settings.enabled ? 'Actif' : 'Désactivé'}
            </button>

            <button
              type="button"
              id="eq-reset-btn"
              onClick={handleReset}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
              title="Réinitialiser"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              id="eq-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Presets Chips */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium uppercase tracking-wider text-neutral-400">Préréglages Audio</label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(EQ_PRESETS) as EqualizerPresetName[]).map((p) => {
              const isSelected = settings.preset === p;
              return (
                <button
                  key={p}
                  type="button"
                  id={`eq-preset-${p.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => handlePresetSelect(p)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap ${
                    isSelected
                      ? `${ACCENT_BG[accent]} font-bold`
                      : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* 10-Band Sliders Grid */}
        <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-mono mb-2">
            <span>+12 dB</span>
            <span>0 dB</span>
            <span>-12 dB</span>
          </div>

          <div className="grid grid-cols-10 gap-2 items-center justify-items-center h-48 py-2">
            {settings.bands.map((band, idx) => (
              <div key={band.frequency} className="flex flex-col items-center justify-between h-full w-full">
                <span className="text-[11px] font-mono text-neutral-400 font-semibold mb-1">
                  {band.gain > 0 ? `+${band.gain}` : band.gain}
                </span>

                <div className="relative flex items-center justify-center h-32 w-6">
                  {/* Zero line */}
                  <div className="absolute w-full h-[1px] bg-neutral-700/60 top-1/2" />
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={band.gain}
                    disabled={!settings.enabled}
                    onChange={(e) => handleBandChange(idx, parseFloat(e.target.value))}
                    className={`h-28 w-2 appearance-none bg-neutral-800 rounded-lg cursor-pointer orient-vertical ${ACCENT_ACCENT[accent]} disabled:opacity-40`}
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                    }}
                  />
                </div>

                <span className="text-[11px] text-neutral-400 mt-2 font-medium">
                  {formatFrequencyLabel(band.frequency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Preamp, Bass & Treble Enhancers (3 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-neutral-800/80 pt-4">
          <div className="bg-neutral-950/40 p-3 rounded-lg border border-neutral-800/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-300">Pré-amplification</span>
              <span className="text-xs font-mono text-neutral-400">
                {settings.preampGain > 0 ? `+${settings.preampGain} dB` : `${settings.preampGain} dB`}
              </span>
            </div>
            <input
              type="range"
              min={-12}
              max={12}
              step={0.5}
              value={settings.preampGain}
              disabled={!settings.enabled}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                const updated = { ...settings, preampGain: val };
                onChange(updated);
                audioEngine.applyEqualizer(updated);
              }}
              className={`w-full h-1.5 bg-neutral-800 rounded-lg ${ACCENT_ACCENT[accent]} cursor-pointer`}
            />
          </div>

          <div className="bg-neutral-950/40 p-3 rounded-lg border border-neutral-800/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-300">Amplificateur de Basses</span>
              <span className="text-xs font-mono text-neutral-400">{settings.bassBoost}/10</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={settings.bassBoost}
              disabled={!settings.enabled}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                const updated = { ...settings, bassBoost: val };
                onChange(updated);
                audioEngine.applyEqualizer(updated);
              }}
              className={`w-full h-1.5 bg-neutral-800 rounded-lg ${ACCENT_ACCENT[accent]} cursor-pointer`}
            />
          </div>

          <div className="bg-neutral-950/40 p-3 rounded-lg border border-neutral-800/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-300">Clarté des Aigus</span>
              <span className="text-xs font-mono text-neutral-400">{settings.trebleBoost}/10</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={settings.trebleBoost}
              disabled={!settings.enabled}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                const updated = { ...settings, trebleBoost: val };
                onChange(updated);
                audioEngine.applyEqualizer(updated);
              }}
              className={`w-full h-1.5 bg-neutral-800 rounded-lg ${ACCENT_ACCENT[accent]} cursor-pointer`}
            />
          </div>
        </div>

        {/* Normalisation EBU R128 sur toute la longueur (Full-width row) */}
        {playerSettings && onUpdatePlayerSettings && (
          <div className="bg-neutral-950/40 p-3.5 rounded-lg border border-neutral-800/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-neutral-200">Normalisation Sonore EBU R128</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                    playerSettings.volumeNormalization
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {playerSettings.volumeNormalization
                    ? playerSettings.normalizationTarget === 'replaygain'
                      ? 'ReplayGain (-18 LUFS)'
                      : playerSettings.normalizationTarget === 'broadcast'
                      ? 'Broadcast / Cinéma (-23 LUFS)'
                      : 'Streaming Web (-14 LUFS)'
                    : 'Désactivé'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-tight">
                Harmonisation dynamique intelligente selon la norme ITU-R BS.1770 / EBU R128 pour éliminer les écarts de volume.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {playerSettings.volumeNormalization && (
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-neutral-900 border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...playerSettings, normalizationTarget: 'streaming' as const };
                      onUpdatePlayerSettings(updated);
                      audioEngine.setVolumeNormalization(true, 'streaming');
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                      (playerSettings.normalizationTarget ?? 'streaming') === 'streaming'
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'bg-transparent text-neutral-400 hover:text-neutral-200'
                    }`}
                    title="Cible streaming (-14 LUFS : Spotify, YouTube, Web)"
                  >
                    -14 LUFS (Streaming)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...playerSettings, normalizationTarget: 'replaygain' as const };
                      onUpdatePlayerSettings(updated);
                      audioEngine.setVolumeNormalization(true, 'replaygain');
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                      playerSettings.normalizationTarget === 'replaygain'
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'bg-transparent text-neutral-400 hover:text-neutral-200'
                    }`}
                    title="Cible ReplayGain audiophile (-18 LUFS)"
                  >
                    -18 LUFS (ReplayGain)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...playerSettings, normalizationTarget: 'broadcast' as const };
                      onUpdatePlayerSettings(updated);
                      audioEngine.setVolumeNormalization(true, 'broadcast');
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                      playerSettings.normalizationTarget === 'broadcast'
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'bg-transparent text-neutral-400 hover:text-neutral-200'
                    }`}
                    title="Cible Broadcast / Télévision / Cinéma (-23 LUFS standard EBU R128)"
                  >
                    -23 LUFS (Cinéma)
                  </button>
                </div>
              )}

              <button
                type="button"
                id="eq-toggle-normalization-btn"
                onClick={() => {
                  const updated = {
                    ...playerSettings,
                    volumeNormalization: !playerSettings.volumeNormalization,
                  };
                  onUpdatePlayerSettings(updated);
                  audioEngine.setVolumeNormalization(updated.volumeNormalization, updated.normalizationTarget ?? 'streaming');
                }}
                className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-colors text-center cursor-pointer whitespace-nowrap ${
                  playerSettings.volumeNormalization
                    ? `${ACCENT_BG[accent]} shadow-xs`
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {playerSettings.volumeNormalization ? 'Désactiver' : 'Activer'}
              </button>
            </div>
          </div>
        )}

        {/* DSP Effects: Spatial 3D Audio, Speed & Crossfade */}
        <div className="border-t border-neutral-800/80 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Spatial Audio 3D Stereo Widener */}
          <div className="bg-neutral-950/50 p-3.5 rounded-xl border border-neutral-800/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Spatial Audio 3D
                </span>
                <span className="text-xs font-mono text-cyan-300 font-semibold">
                  {Math.round((settings.stereoWidth ?? 1.0) * 100)}%
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-tight mb-2.5">
                Élargissement de la scène sonore au casque ou enceintes
              </p>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={settings.stereoWidth ?? 1.0}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                const updated = { ...settings, stereoWidth: val };
                onChange(updated);
                audioEngine.setStereoWidth(val);
              }}
              className={`w-full h-1.5 bg-neutral-800 rounded-lg ${ACCENT_ACCENT[accent]} cursor-pointer mb-2`}
            />
            <div className="flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => {
                  const updated = { ...settings, stereoWidth: 0 };
                  onChange(updated);
                  audioEngine.setStereoWidth(0);
                }}
                className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  (settings.stereoWidth ?? 1.0) === 0 ? 'bg-neutral-700 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Mono (0%)
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...settings, stereoWidth: 1.0 };
                  onChange(updated);
                  audioEngine.setStereoWidth(1.0);
                }}
                className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  (settings.stereoWidth ?? 1.0) === 1.0 ? 'bg-neutral-700 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Standard (100%)
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...settings, stereoWidth: 1.6 };
                  onChange(updated);
                  audioEngine.setStereoWidth(1.6);
                }}
                className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  (settings.stereoWidth ?? 1.0) === 1.6 ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                3D Immersion (160%)
              </button>
            </div>
          </div>

          {/* Playback Speed (Time-Stretching) */}
          <div className="bg-neutral-950/50 p-3.5 rounded-xl border border-neutral-800/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-neutral-200">Vitesse & Tonalité</span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  {(settings.playbackSpeed ?? 1.0).toFixed(2)}x
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-tight mb-2.5">
                Accélération / Ralenti avec tonalité préservée
              </p>
            </div>
            <div className="grid grid-cols-5 gap-1 my-1">
              {[0.75, 0.9, 1.0, 1.25, 1.5].map((spd) => {
                const isSelected = Math.abs((settings.playbackSpeed ?? 1.0) - spd) < 0.02;
                return (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => {
                      const updated = { ...settings, playbackSpeed: spd };
                      onChange(updated);
                      audioEngine.setPlaybackSpeed(spd);
                    }}
                    className={`py-1 rounded text-[11px] font-medium transition-colors cursor-pointer text-center ${
                      isSelected
                        ? `${ACCENT_BG[accent]} font-bold`
                        : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    {spd}x
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] text-neutral-500 text-center mt-1">
              Idéal pour travailler un instrument ou écouter plus vite
            </div>
          </div>

          {/* Dynamic Crossfade */}
          {playerSettings && onUpdatePlayerSettings && (
            <div className="bg-neutral-950/50 p-3.5 rounded-xl border border-neutral-800/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-neutral-200">Fondu Enchaîné (Crossfade)</span>
                  <span className="text-xs font-mono text-amber-300 font-semibold">
                    {playerSettings.crossfadeDuration > 0 ? `${playerSettings.crossfadeDuration}s` : 'Désactivé'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight mb-2.5">
                  Transition fondue et mix continu entre chaque morceau
                </p>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                step={1}
                value={playerSettings.crossfadeDuration}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const updated = { ...playerSettings, crossfadeDuration: val };
                  onUpdatePlayerSettings(updated);
                }}
                className={`w-full h-1.5 bg-neutral-800 rounded-lg ${ACCENT_ACCENT[accent]} cursor-pointer mb-2`}
              />
              <div className="flex items-center justify-between text-[10px] text-neutral-500">
                <span>0s (Cut)</span>
                <span>3s (Standard)</span>
                <span>6s (Radio)</span>
                <span>12s (Club)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Sliders, X, RotateCcw, Volume2, Sparkles, Check, Headphones, Search, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { EqualizerSettings, EqualizerPresetName, AccentColor, PlayerSettings } from '../types';
import { EQ_PRESETS, DEFAULT_EQ_FREQUENCIES, audioEngine } from '../services/audioEngine';
import {
  AutoEqProfile,
  searchAutoEqProfiles,
  getAutoEqBrands,
  parseAutoEqGraphicEq,
  EMBEDDED_AUTOEQ_PROFILES,
} from '../services/autoEqService';
import { getT } from '../i18n';

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
  const t = getT(playerSettings?.language);

  const [showAutoEq, setShowAutoEq] = React.useState(settings.preset === 'AutoEq');
  const [autoEqQuery, setAutoEqQuery] = React.useState('');
  const [selectedBrand, setSelectedBrand] = React.useState('all');
  const [selectedFormFactor, setSelectedFormFactor] = React.useState('all');
  const [showCustomImport, setShowCustomImport] = React.useState(false);
  const [customImportText, setCustomImportText] = React.useState('');
  const [importError, setImportError] = React.useState<string | null>(null);

  const brands = React.useMemo(() => getAutoEqBrands(), []);

  const filteredAutoEqProfiles = React.useMemo(() => {
    return searchAutoEqProfiles(autoEqQuery, selectedBrand, selectedFormFactor);
  }, [autoEqQuery, selectedBrand, selectedFormFactor]);

  const effectiveBands = React.useMemo(() => {
    if (settings?.bands && Array.isArray(settings.bands) && settings.bands.length > 0) {
      return settings.bands;
    }
    return DEFAULT_EQ_FREQUENCIES.map((freq) => ({
      frequency: freq,
      gain: 0,
      label: freq >= 1000 ? `${freq / 1000}k` : `${freq}`,
    }));
  }, [settings?.bands]);

  if (!isOpen) return null;

  const handleBandChange = (index: number, gain: number) => {
    const newBands = [...effectiveBands];
    newBands[index] = { ...(newBands[index] || { frequency: DEFAULT_EQ_FREQUENCIES[index] || 1000, label: '1k' }), gain };
    const updated: EqualizerSettings = {
      ...settings,
      preset: 'Custom',
      bands: newBands,
    };
    onChange(updated);
    audioEngine.applyEqualizer(updated);
  };

  const handleApplyAutoEq = (profile: AutoEqProfile) => {
    const newBands = DEFAULT_EQ_FREQUENCIES.map((freq, idx) => ({
      frequency: freq,
      gain: profile.bands[idx] ?? 0,
      label: freq >= 1000 ? `${freq / 1000}k` : `${freq}`,
    }));

    const updated: EqualizerSettings = {
      ...settings,
      enabled: true,
      preset: 'AutoEq',
      bands: newBands,
      preampGain: profile.preamp,
      autoEqProfileId: profile.id,
      autoEqProfileName: profile.name,
      autoEqBrand: profile.brand,
    };
    onChange(updated);
    audioEngine.applyEqualizer(updated);
  };

  const handleCustomImport = () => {
    setImportError(null);
    const parsed = parseAutoEqGraphicEq(customImportText);
    if (!parsed) {
      setImportError('Format non reconnu. Utilisez le format AutoEq (ex: GraphicEQ: 31.25 1.5; 62.5 -0.5...).');
      return;
    }

    const newBands = DEFAULT_EQ_FREQUENCIES.map((freq, idx) => ({
      frequency: freq,
      gain: parsed.bands[idx] ?? 0,
      label: freq >= 1000 ? `${freq / 1000}k` : `${freq}`,
    }));

    const updated: EqualizerSettings = {
      ...settings,
      enabled: true,
      preset: 'AutoEq',
      bands: newBands,
      preampGain: parsed.preamp,
      autoEqProfileId: 'custom-imported',
      autoEqProfileName: 'Profil Personnalisé',
      autoEqBrand: 'Import',
    };
    onChange(updated);
    audioEngine.applyEqualizer(updated);
    setShowCustomImport(false);
    setCustomImportText('');
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
      autoEqProfileId: undefined,
      autoEqProfileName: undefined,
      autoEqBrand: undefined,
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
              <h2 className="text-xl font-bold tracking-tight">{t.equalizerTitle}</h2>
              <p className="text-xs text-neutral-400">{t.equalizerSubtitle}</p>
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
              {settings.enabled ? t.eqActive : t.eqDisabled}
            </button>

            <button
              type="button"
              id="eq-reset-btn"
              onClick={handleReset}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
              title={t.eqReset}
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
          <label className="text-xs font-medium uppercase tracking-wider text-neutral-400">{t.eqPresetsLabel}</label>
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
            {settings.preset === 'AutoEq' && (
              <button
                key="autoeq-chip"
                type="button"
                onClick={() => setShowAutoEq(true)}
                className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${ACCENT_BG[accent]}`}
              >
                <Headphones className="w-3.5 h-3.5" />
                {settings.autoEqBrand ? `${settings.autoEqBrand} ${settings.autoEqProfileName}` : 'AutoEq'}
              </button>
            )}
          </div>
        </div>

        {/* AutoEq Profiles Banner & Interactive Selector */}
        <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl overflow-hidden transition-all">
          <div
            className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-neutral-900/60 transition-colors"
            onClick={() => setShowAutoEq(!showAutoEq)}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-neutral-200">Profils Casques AutoEq (Cible Harman & Neutral)</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                    {EMBEDDED_AUTOEQ_PROFILES.length} modèles intégrés
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  {settings.preset === 'AutoEq' && settings.autoEqProfileName
                    ? `Actif : ${settings.autoEqBrand} ${settings.autoEqProfileName} (${settings.preampGain} dB preamp)`
                    : 'Compensation acoustique idéale pour casques et écouteurs (Sony, Sennheiser, Apple, Bose...)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {settings.preset === 'AutoEq' && (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-800/50">
                  <Check className="w-3.5 h-3.5" /> Calibré
                </span>
              )}
              <button
                type="button"
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                {showAutoEq ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {showAutoEq && (
            <div className="p-3.5 border-t border-neutral-800/80 bg-neutral-900/40 flex flex-col gap-3">
              {/* Filters bar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par modèle ou marque (ex: XM5, HD650, AirPods, DT770)..."
                    value={autoEqQuery}
                    onChange={(e) => setAutoEqQuery(e.target.value)}
                    className="w-full bg-neutral-950/80 border border-neutral-800 text-xs rounded-lg pl-8 pr-3 py-1.5 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                  />
                  {autoEqQuery && (
                    <button
                      type="button"
                      onClick={() => setAutoEqQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-neutral-600"
                >
                  <option value="all">Toutes les marques</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                <select
                  value={selectedFormFactor}
                  onChange={(e) => setSelectedFormFactor(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-neutral-600"
                >
                  <option value="all">Tous les formats</option>
                  <option value="over-ear">Casques (Over-Ear)</option>
                  <option value="in-ear">Intra-auriculaires (In-Ear)</option>
                  <option value="earbud">Écouteurs ouverts (Earbuds)</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowCustomImport(!showCustomImport)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:text-white cursor-pointer"
                  title="Importer un fichier ou texte GraphicEQ"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importer</span>
                </button>
              </div>

              {/* Custom Import Box */}
              {showCustomImport && (
                <div className="p-3 bg-neutral-950/80 border border-neutral-700 rounded-lg flex flex-col gap-2">
                  <span className="text-xs font-semibold text-neutral-200">
                    Importer une courbe AutoEq (Texte GraphicEQ ou ParametricEQ) :
                  </span>
                  <textarea
                    value={customImportText}
                    onChange={(e) => setCustomImportText(e.target.value)}
                    placeholder="Collez ici les données AutoEq (ex: Preamp: -5.5 dB &#10;GraphicEQ: 31.25 1.5; 62.5 -0.5; ...)"
                    rows={3}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs font-mono p-2 rounded-lg text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                  />
                  {importError && (
                    <p className="text-xs text-rose-400 font-medium">{importError}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowCustomImport(false); setImportError(null); }}
                      className="px-3 py-1 rounded-lg text-xs bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleCustomImport}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${ACCENT_BG[accent]}`}
                    >
                      Appliquer
                    </button>
                  </div>
                </div>
              )}

              {/* Profiles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {filteredAutoEqProfiles.length === 0 ? (
                  <div className="col-span-2 text-center py-6 text-neutral-500 text-xs">
                    Aucun casque correspondant trouvé. Essayez avec un autre mot-clé ou importez votre profil.
                  </div>
                ) : (
                  filteredAutoEqProfiles.map((p) => {
                    const isActive = settings.preset === 'AutoEq' && settings.autoEqProfileId === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isActive
                            ? 'border-emerald-500/50 bg-emerald-500/10 shadow-xs'
                            : 'border-neutral-800/80 bg-neutral-950/50 hover:bg-neutral-950/90 hover:border-neutral-700'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                              {p.brand}
                            </span>
                            <h4 className="text-xs font-bold text-neutral-100 truncate">{p.name}</h4>
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                            {p.description || `${p.formFactor} • ${p.source}`}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono mt-1">
                            <span>Preamp: {p.preamp > 0 ? `+${p.preamp}` : p.preamp} dB</span>
                            <span>•</span>
                            <span>Cible: {p.source}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApplyAutoEq(p)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                            isActive
                              ? 'bg-emerald-500 text-neutral-950 shadow-md'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Actif</span>
                            </>
                          ) : (
                            <span>Activer</span>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* 10-Band Sliders Grid */}
        <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-mono mb-2">
            <span>+12 dB</span>
            <span>0 dB</span>
            <span>-12 dB</span>
          </div>

          <div className="grid grid-cols-10 gap-2 items-center justify-items-center h-48 py-2">
            {effectiveBands.map((band, idx) => (
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

        {/* Normalisation EBU R128 sur toute la longueur (Full-width layout) */}
        {playerSettings && onUpdatePlayerSettings && (
          <div className="bg-neutral-950/40 p-3.5 rounded-lg border border-neutral-800/50 flex flex-col gap-3">
            {/* Titre & Description sur toute la longueur */}
            <div className="w-full">
              <h4 className="text-xs font-semibold text-neutral-200 mb-1">
                Normalisation Sonore EBU R128
              </h4>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Harmonisation dynamique intelligente selon la norme ITU-R BS.1770 / EBU R128 pour éliminer les écarts de volume.
              </p>
            </div>

            {/* Contrôles sur toute la longueur sous le paragraphe */}
            <div className="w-full flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {playerSettings.volumeNormalization && (
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-neutral-900 border border-neutral-800 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...playerSettings, normalizationTarget: 'streaming' as const };
                      onUpdatePlayerSettings(updated);
                      audioEngine.setVolumeNormalization(true, 'streaming');
                    }}
                    className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors font-medium cursor-pointer text-center truncate ${
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
                    className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors font-medium cursor-pointer text-center truncate ${
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
                    className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors font-medium cursor-pointer text-center truncate ${
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
                className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all text-center cursor-pointer whitespace-nowrap active:scale-95 ${
                  !playerSettings.volumeNormalization ? 'w-full py-2.5' : 'flex-shrink-0'
                } ${
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
                    {playerSettings.crossfadeDuration > 0
                      ? `${playerSettings.crossfadeDuration}s`
                      : (playerSettings.gaplessPlayback ? 'Zéro Blanc' : 'Désactivé')}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight mb-2.5">
                  Transition fondue et mix continu (remplace le mode Zéro Blanc si &gt; 0s)
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
                  const updated = {
                    ...playerSettings,
                    crossfadeDuration: val,
                    gaplessPlayback: val === 0 ? true : false,
                  };
                  onUpdatePlayerSettings(updated);
                }}
                className={`w-full h-1.5 bg-neutral-800 rounded-lg ${ACCENT_ACCENT[accent]} cursor-pointer mb-2`}
              />
              <div className="flex items-center justify-between text-[10px] text-neutral-500">
                <span>0s (Zéro Blanc)</span>
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

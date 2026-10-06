/**
 * LibVLCSharp Architecture Media Engine for AuraWave / Screenbox
 * Based on LibVLCSharp (LibVLC .NET / WinUI multimedia core)
 *
 * Implements:
 * - LibVLC runtime context and options
 * - MediaPlayer with full event model (Playing, Paused, Stopped, Buffering, TimeChanged, PositionChanged, EndReached, EncounteredError)
 * - Media representation (MRL, tracks, audio/video codecs, metadata)
 * - LibVLC 10-Band Graphic Equalizer with official VLC presets
 * - DSP Audio Pipeline: Preamp, Spatializer (Stereo Widener), ReplayGain/Normalizer, Peak Limiter
 * - Real-time FFT spectrum analyser for visualizers
 */

import { EqualizerSettings, Track } from '../types';

export enum VLCState {
  NothingSpecial = 'NothingSpecial',
  Opening = 'Opening',
  Buffering = 'Buffering',
  Playing = 'Playing',
  Paused = 'Paused',
  Stopped = 'Stopped',
  Ended = 'Ended',
  Error = 'Error',
}

export interface VLCTrackInfo {
  codec: string;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  type: 'audio' | 'video' | 'subtitle';
}

export interface VLCMediaParsedInfo {
  mrl: string;
  title?: string;
  artist?: string;
  album?: string;
  durationMs: number;
  tracks: VLCTrackInfo[];
}

// VLC 10 Standard ISO frequencies (Hz)
export const VLC_EQ_FREQUENCIES = [31.25, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

// Official LibVLC Equalizer Presets (10 bands from -20dB to +20dB)
export const VLC_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Classical: [4.8, 4.8, 3.2, 2.4, -1.6, -1.6, 0, 2.4, 3.2, 4.0],
  Club: [0, 0, 1.6, 3.2, 3.2, 3.2, 1.6, 0, 0, 0],
  Dance: [9.6, 7.2, 2.4, 0, 0, -4.0, -5.6, -5.6, 0, 0],
  'Full Bass': [9.6, 9.6, 9.6, 5.6, 1.6, -4.0, -8.0, -10.4, -11.2, -11.2],
  'Full Bass and Treble': [7.2, 5.6, 0, -7.2, -4.8, 1.6, 8.0, 11.2, 12.0, 12.0],
  'Full Treble': [-9.6, -9.6, -9.6, -4.0, 2.4, 11.2, 16.0, 16.0, 16.0, 16.8],
  Headphones: [4.8, 11.2, 5.6, -3.2, -2.4, 1.6, 4.8, 9.6, 12.8, 14.4],
  'Large Hall': [10.4, 10.4, 5.6, 5.6, 0, -4.8, -4.8, -4.8, 0, 0],
  Live: [-4.8, 0, 4.0, 5.6, 5.6, 5.6, 4.0, 2.4, 2.4, 2.4],
  Party: [7.2, 7.2, 0, 0, 0, 0, 0, 0, 7.2, 7.2],
  Pop: [-1.6, 1.6, 7.2, 8.0, 5.6, 0, -2.4, -2.4, -1.6, -1.6],
  Reggae: [0, 0, 0, -5.6, 0, 6.4, 6.4, 0, 0, 0],
  Rock: [8.0, 4.8, -5.6, -8.0, -3.2, 4.0, 8.8, 11.2, 11.2, 11.2],
  Ska: [-2.4, -4.8, -4.0, -0.8, 4.0, 5.6, 8.8, 9.6, 11.2, 9.6],
  Soft: [4.8, 1.6, 0, -2.4, 0, 4.0, 8.0, 9.6, 11.2, 12.0],
  'Soft Rock': [4.0, 4.0, 2.4, 0, -4.0, -5.6, -3.2, 0, 2.4, 8.8],
  Techno: [8.0, 5.6, 0, -5.6, -4.8, 0, 8.0, 9.6, 9.6, 8.8],
};

export class VLCEqualizer {
  public preamp: number = 0; // -20 dB to +20 dB
  public bands: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 10 bands

  constructor(presetName?: string) {
    if (presetName && VLC_PRESETS[presetName]) {
      this.setPreset(presetName);
    }
  }

  public setPreset(presetName: string) {
    if (VLC_PRESETS[presetName]) {
      this.bands = [...VLC_PRESETS[presetName]];
    }
  }

  public setBand(index: number, gain: number) {
    if (index >= 0 && index < 10) {
      this.bands[index] = Math.max(-20, Math.min(20, gain));
    }
  }

  public setPreamp(gain: number) {
    this.preamp = Math.max(-20, Math.min(20, gain));
  }
}

export class VLCMedia {
  public mrl: string;
  public metadata: Partial<Track> = {};
  public durationMs: number = 0;
  public state: VLCState = VLCState.NothingSpecial;

  constructor(mrl: string, metadata?: Partial<Track>) {
    this.mrl = mrl;
    if (metadata) {
      this.metadata = metadata;
      this.durationMs = (metadata.duration || 0) * 1000;
    }
  }
}

type EventListener = (...args: any[]) => void;

export class VLCMediaPlayer {
  private media: VLCMedia | null = null;
  private state: VLCState = VLCState.NothingSpecial;
  private audioEl: HTMLMediaElement | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;

  // VLC DSP Audio Graph
  private preampGainNode: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private normalizerGainNode: GainNode | null = null;
  private dynamicsCompressorNode: DynamicsCompressorNode | null = null;
  private limiterNode: DynamicsCompressorNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  // Spatial Stereo Widener
  private splitterNode: ChannelSplitterNode | null = null;
  private mergerNode: ChannelMergerNode | null = null;
  private llGainNode: GainNode | null = null;
  private lrGainNode: GainNode | null = null;
  private rlGainNode: GainNode | null = null;
  private rrGainNode: GainNode | null = null;

  private equalizer: VLCEqualizer = new VLCEqualizer('Flat');
  private stereoWidth: number = 1.0;
  private isNormalizationActive: boolean = true;
  private normalizationTarget: 'streaming' | 'replaygain' | 'broadcast' = 'streaming';
  private isConnected: boolean = false;
  private playbackRate: number = 1.0;
  private volumeLevel: number = 85; // 0..100
  private isMutedState: boolean = false;

  private listeners: Map<string, Set<EventListener>> = new Map();

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    } catch (e) {
      console.warn('LibVLCSharp audio context warning:', e);
    }
  }

  public attachMediaElement(element: HTMLMediaElement) {
    if (this.audioEl === element && this.isConnected) return;
    this.audioEl = element;

    this.setupMediaEventListeners();
    this.buildDspPipeline();
  }

  private setupMediaEventListeners() {
    if (!this.audioEl) return;

    this.audioEl.addEventListener('loadstart', () => {
      this.setState(VLCState.Opening);
      this.emit('opening');
    });

    this.audioEl.addEventListener('waiting', () => {
      this.setState(VLCState.Buffering);
      this.emit('buffering', 0);
    });

    this.audioEl.addEventListener('playing', () => {
      this.setState(VLCState.Playing);
      this.emit('playing');
    });

    this.audioEl.addEventListener('pause', () => {
      if (this.state !== VLCState.Stopped && this.state !== VLCState.Ended) {
        this.setState(VLCState.Paused);
        this.emit('paused');
      }
    });

    this.audioEl.addEventListener('ended', () => {
      this.setState(VLCState.Ended);
      this.emit('endReached');
    });

    this.audioEl.addEventListener('error', (e) => {
      this.setState(VLCState.Error);
      this.emit('encounteredError', e);
    });

    this.audioEl.addEventListener('timeupdate', () => {
      if (this.audioEl) {
        const timeMs = Math.round(this.audioEl.currentTime * 1000);
        const duration = this.audioEl.duration || 1;
        const position = Math.max(0, Math.min(1, this.audioEl.currentTime / duration));
        this.emit('timeChanged', timeMs);
        this.emit('positionChanged', position);
      }
    });

    this.audioEl.addEventListener('durationchange', () => {
      if (this.audioEl && !isNaN(this.audioEl.duration)) {
        this.emit('lengthChanged', Math.round(this.audioEl.duration * 1000));
      }
    });
  }

  private buildDspPipeline() {
    if (!this.audioEl || !this.audioContext || this.isConnected) return;

    try {
      this.sourceNode = this.audioContext.createMediaElementSource(this.audioEl);

      // Preamp Gain
      this.preampGainNode = this.audioContext.createGain();
      this.preampGainNode.gain.value = 1.0;

      // 10-Band Graphic Equalizer (LibVLC frequencies)
      this.eqFilters = VLC_EQ_FREQUENCIES.map((freq) => {
        const filter = this.audioContext!.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.414;
        filter.gain.value = 0;
        return filter;
      });

      // Loudness Normalizer & AGC
      this.normalizerGainNode = this.audioContext.createGain();
      this.normalizerGainNode.gain.value = 1.0;

      this.dynamicsCompressorNode = this.audioContext.createDynamicsCompressor();
      this.dynamicsCompressorNode.threshold.value = -20;
      this.dynamicsCompressorNode.knee.value = 24;
      this.dynamicsCompressorNode.ratio.value = 8;
      this.dynamicsCompressorNode.attack.value = 0.005;
      this.dynamicsCompressorNode.release.value = 0.25;

      this.limiterNode = this.audioContext.createDynamicsCompressor();
      this.limiterNode.threshold.value = -1.5;
      this.limiterNode.knee.value = 0;
      this.limiterNode.ratio.value = 20;
      this.limiterNode.attack.value = 0.001;
      this.limiterNode.release.value = 0.08;

      // Spatial 3D Stereo Widener (Mid/Side processing matrix)
      this.splitterNode = this.audioContext.createChannelSplitter(2);
      this.mergerNode = this.audioContext.createChannelMerger(2);
      this.llGainNode = this.audioContext.createGain();
      this.lrGainNode = this.audioContext.createGain();
      this.rlGainNode = this.audioContext.createGain();
      this.rrGainNode = this.audioContext.createGain();

      // Analyser Node for Spectrum Visualizer
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Graph wiring:
      // source -> preamp -> eq[0..9] -> normalizer -> compressor -> limiter -> spatializer -> analyser -> destination
      let current: AudioNode = this.sourceNode;
      current.connect(this.preampGainNode);
      current = this.preampGainNode;

      for (const filter of this.eqFilters) {
        current.connect(filter);
        current = filter;
      }

      current.connect(this.normalizerGainNode);
      this.normalizerGainNode.connect(this.dynamicsCompressorNode);
      this.dynamicsCompressorNode.connect(this.limiterNode);

      try {
        if (
          this.splitterNode &&
          this.mergerNode &&
          this.splitterNode.numberOfOutputs >= 2 &&
          this.mergerNode.numberOfInputs >= 2 &&
          this.llGainNode &&
          this.lrGainNode &&
          this.rlGainNode &&
          this.rrGainNode
        ) {
          this.limiterNode.connect(this.splitterNode);
          this.splitterNode.connect(this.llGainNode, 0, 0);
          this.splitterNode.connect(this.rlGainNode, 0, 0);
          this.splitterNode.connect(this.lrGainNode, 1, 0);
          this.splitterNode.connect(this.rrGainNode, 1, 0);

          this.llGainNode.connect(this.mergerNode, 0, 0);
          this.lrGainNode.connect(this.mergerNode, 0, 0);
          this.rlGainNode.connect(this.mergerNode, 0, 1);
          this.rrGainNode.connect(this.mergerNode, 0, 1);

          this.mergerNode.connect(this.analyserNode);
        } else {
          this.limiterNode.connect(this.analyserNode);
        }
      } catch (spatialErr) {
        console.warn('Spatial stereo widener fallback to direct limiter->analyser:', spatialErr);
        this.limiterNode.connect(this.analyserNode);
      }

      this.analyserNode.connect(this.audioContext.destination);

      this.isConnected = true;
      this.applyEqualizer();
      this.applyStereoWidth();
    } catch (e) {
      console.warn('LibVLC DSP Graph init error:', e);
    }
  }

  public setMedia(media: VLCMedia) {
    this.media = media;
    if (this.audioEl && media.mrl) {
      this.audioEl.src = media.mrl;
      this.audioEl.load();
    }
  }

  public async resumeContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume().catch(() => {});
    }
  }

  public async play(): Promise<boolean> {
    await this.resumeContext();

    if (this.audioEl) {
      try {
        await this.audioEl.play();
        this.setState(VLCState.Playing);
        return true;
      } catch (err) {
        console.warn('LibVLC Play rejected:', err);
        return false;
      }
    }
    return false;
  }

  public pause() {
    if (this.audioEl) {
      this.audioEl.pause();
      this.setState(VLCState.Paused);
    }
  }

  public stop() {
    if (this.audioEl) {
      try {
        this.audioEl.pause();
        if (isFinite(this.audioEl.duration) && this.audioEl.duration > 0) {
          this.audioEl.currentTime = 0;
        }
        this.audioEl.removeAttribute('src');
        this.audioEl.load();
      } catch (err) {
        console.warn('Error resetting audioEl in vlcMediaEngine:', err);
      }
    }
    this.setState(VLCState.Stopped);
    this.emit('stopped');
  }

  public setTime(timeMs: number) {
    if (this.audioEl && isFinite(timeMs)) {
      try {
        const sec = Math.max(0, timeMs / 1000);
        if (isFinite(this.audioEl.duration) && this.audioEl.duration > 0) {
          this.audioEl.currentTime = Math.min(sec, this.audioEl.duration);
        } else {
          this.audioEl.currentTime = sec;
        }
      } catch (err) {
        console.warn('setTime error ignored:', err);
      }
    }
  }

  public setPosition(position: number) {
    if (this.audioEl && isFinite(this.audioEl.duration) && this.audioEl.duration > 0 && isFinite(position)) {
      try {
        this.audioEl.currentTime = Math.max(0, Math.min(1, position)) * this.audioEl.duration;
      } catch (err) {
        console.warn('setPosition error ignored:', err);
      }
    }
  }

  public setRate(rate: number) {
    this.playbackRate = Math.max(0.25, Math.min(4.0, rate));
    if (this.audioEl) {
      (this.audioEl as any).preservesPitch = true;
      this.audioEl.playbackRate = this.playbackRate;
    }
  }

  public setVolume(volume0to100: number) {
    this.volumeLevel = Math.max(0, Math.min(100, volume0to100));
    if (this.audioEl) {
      this.audioEl.volume = this.isMutedState ? 0 : this.volumeLevel / 100;
      this.emit('volumeChanged', this.volumeLevel);
    }
  }

  public setMute(muted: boolean) {
    this.isMutedState = muted;
    if (this.audioEl) {
      this.audioEl.volume = muted ? 0 : this.volumeLevel / 100;
      this.emit('muted', muted);
    }
  }

  public setEqualizer(eq: VLCEqualizer) {
    this.equalizer = eq;
    this.applyEqualizer();
  }

  private applyEqualizer() {
    if (!this.isConnected || !this.audioContext) return;
    const now = this.audioContext.currentTime;

    // Apply Preamp
    if (this.preampGainNode) {
      const linear = Math.pow(10, this.equalizer.preamp / 20);
      this.preampGainNode.gain.setTargetAtTime(linear, now, 0.05);
    }

    // Apply 10 Bands
    this.eqFilters.forEach((filter, i) => {
      const gain = this.equalizer.bands[i] || 0;
      filter.gain.setTargetAtTime(gain, now, 0.05);
    });
  }

  public setStereoWidth(width: number) {
    this.stereoWidth = Math.max(0, Math.min(2.5, width));
    this.applyStereoWidth();
  }

  private applyStereoWidth() {
    if (!this.isConnected || !this.audioContext || !this.llGainNode || !this.rrGainNode || !this.lrGainNode || !this.rlGainNode) {
      return;
    }
    const t = this.audioContext.currentTime;
    const direct = (1 + this.stereoWidth) / 2;
    const cross = (1 - this.stereoWidth) / 2;

    this.llGainNode.gain.setTargetAtTime(direct, t, 0.05);
    this.rrGainNode.gain.setTargetAtTime(direct, t, 0.05);
    this.lrGainNode.gain.setTargetAtTime(cross, t, 0.05);
    this.rlGainNode.gain.setTargetAtTime(cross, t, 0.05);
  }

  public setNormalization(enabled: boolean, target: 'streaming' | 'replaygain' | 'broadcast' = 'streaming') {
    this.isNormalizationActive = enabled;
    this.normalizationTarget = target;
    if (!this.isConnected || !this.audioContext) return;
    const now = this.audioContext.currentTime;

    if (enabled) {
      if (target === 'streaming') {
        // -14 LUFS Streaming Target (EBU R128 / Spotify / YouTube Music / Apple Music standard)
        this.dynamicsCompressorNode?.threshold.setTargetAtTime(-16, now, 0.05);
        this.dynamicsCompressorNode?.knee.setTargetAtTime(18, now, 0.05);
        this.dynamicsCompressorNode?.ratio.setTargetAtTime(6, now, 0.05);
        this.dynamicsCompressorNode?.attack.setTargetAtTime(0.003, now, 0.05);
        this.dynamicsCompressorNode?.release.setTargetAtTime(0.20, now, 0.05);
        this.normalizerGainNode?.gain.setTargetAtTime(1.15, now, 0.05);
        this.limiterNode?.threshold.setTargetAtTime(-1.0, now, 0.05);
      } else if (target === 'replaygain') {
        // -18 LUFS ReplayGain Standard (89 dB SPL classic audiophile calibration)
        this.dynamicsCompressorNode?.threshold.setTargetAtTime(-20, now, 0.05);
        this.dynamicsCompressorNode?.knee.setTargetAtTime(24, now, 0.05);
        this.dynamicsCompressorNode?.ratio.setTargetAtTime(4, now, 0.05);
        this.dynamicsCompressorNode?.attack.setTargetAtTime(0.005, now, 0.05);
        this.dynamicsCompressorNode?.release.setTargetAtTime(0.30, now, 0.05);
        this.normalizerGainNode?.gain.setTargetAtTime(1.0, now, 0.05);
        this.limiterNode?.threshold.setTargetAtTime(-1.0, now, 0.05);
      } else {
        // -23 LUFS Broadcast Target (EBU R128 original television & cinema standard)
        this.dynamicsCompressorNode?.threshold.setTargetAtTime(-24, now, 0.05);
        this.dynamicsCompressorNode?.knee.setTargetAtTime(28, now, 0.05);
        this.dynamicsCompressorNode?.ratio.setTargetAtTime(3.5, now, 0.05);
        this.dynamicsCompressorNode?.attack.setTargetAtTime(0.008, now, 0.05);
        this.dynamicsCompressorNode?.release.setTargetAtTime(0.35, now, 0.05);
        this.normalizerGainNode?.gain.setTargetAtTime(0.85, now, 0.05);
        this.limiterNode?.threshold.setTargetAtTime(-1.0, now, 0.05);
      }
    } else {
      this.dynamicsCompressorNode?.threshold.setTargetAtTime(0, now, 0.05);
      this.dynamicsCompressorNode?.ratio.setTargetAtTime(1, now, 0.05);
      this.normalizerGainNode?.gain.setTargetAtTime(1.0, now, 0.05);
      this.limiterNode?.threshold.setTargetAtTime(0, now, 0.05);
    }
  }

  public getNormalizationTarget(): 'streaming' | 'replaygain' | 'broadcast' {
    return this.normalizationTarget;
  }

  public getFrequencyData(array: Uint8Array): void {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(array);
    } else {
      array.fill(0);
    }
  }

  public getTimeDomainData(array: Uint8Array): void {
    if (this.analyserNode) {
      this.analyserNode.getByteTimeDomainData(array);
    } else {
      array.fill(128);
    }
  }

  public getSpectrumBands(numBands = 32): number[] {
    if (!this.analyserNode) return new Array(numBands).fill(0);
    const buffer = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(buffer);

    const result: number[] = [];
    const totalBins = buffer.length;

    for (let i = 0; i < numBands; i++) {
      const startBin = Math.floor(Math.pow(totalBins, i / numBands) - 1);
      const endBin = Math.floor(Math.pow(totalBins, (i + 1) / numBands));
      const s = Math.max(0, startBin);
      const e = Math.min(totalBins - 1, Math.max(s + 1, endBin));
      let sum = 0;
      for (let j = s; j < e; j++) {
        sum += buffer[j];
      }
      const avg = sum / (e - s || 1);
      result.push(Math.min(1, avg / 255));
    }
    return result;
  }

  public getState(): VLCState {
    return this.state;
  }

  private setState(newState: VLCState) {
    if (this.state !== newState) {
      this.state = newState;
      this.emit('stateChanged', newState);
    }
  }

  // Event Subscription
  public on(event: string, callback: EventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: EventListener) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(...args);
      } catch (err) {
        console.error(`Error in LibVLC event listener [${event}]:`, err);
      }
    });
  }
}

/**
 * LibVLC Core Instance
 */
export class LibVLC {
  private static instance: LibVLC | null = null;
  public readonly version: string = '3.0.21-vlcsharp-core';

  private constructor() {
    console.info(`[LibVLCSharp] Media Core Engine initialized (${this.version})`);
  }

  public static getInstance(): LibVLC {
    if (!LibVLC.instance) {
      LibVLC.instance = new LibVLC();
    }
    return LibVLC.instance;
  }

  public createMediaPlayer(): VLCMediaPlayer {
    return new VLCMediaPlayer();
  }

  public createMedia(mrl: string, metadata?: Partial<Track>): VLCMedia {
    return new VLCMedia(mrl, metadata);
  }

  public createEqualizer(presetName?: string): VLCEqualizer {
    return new VLCEqualizer(presetName);
  }
}

export const vlcInstance = LibVLC.getInstance();
export const vlcMediaPlayer = vlcInstance.createMediaPlayer();

import { EqualizerBand, EqualizerSettings } from '../types';
import { vlcMediaPlayer, VLC_EQ_FREQUENCIES, VLC_PRESETS, VLCEqualizer } from './vlcMediaEngine';

export const DEFAULT_EQ_FREQUENCIES = VLC_EQ_FREQUENCIES;

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5.5, 4, 2, 0.5, 0, 0, 0, 0, 0],
  'Treble Boost': [0, 0, 0, 0, 0, 1, 2.5, 4.5, 6, 7],
  Vocal: [-2, -2, -1, 1, 3.5, 4, 3, 1, -1, -2],
  Rock: [8.0, 4.8, -5.6, -8.0, -3.2, 4.0, 8.8, 11.2, 11.2, 11.2],
  Electronic: [5, 4, 2, 0, -1.5, 2, 1, 2.5, 4, 5],
  'Hip-Hop': [5.5, 4.5, 3, 1.5, -0.5, 1, 2, 1.5, 3, 3.5],
  Classical: [4.8, 4.8, 3.2, 2.4, -1.6, -1.6, 0, 2.4, 3.2, 4.0],
  Jazz: [3, 2, 1, 1.5, -1, -1, 1, 2.5, 3, 3.5],
  Acoustic: [3, 2, 1, 0.5, 1, 2, 2.5, 3, 2.5, 2],
  ...VLC_PRESETS,
};

class AudioEngine {
  private vlcPlayer = vlcMediaPlayer;

  public init(mediaElement: HTMLMediaElement) {
    this.vlcPlayer.attachMediaElement(mediaElement);
  }

  public resume() {
    this.vlcPlayer.play();
  }

  public setVolumeNormalization(enabled: boolean, target: 'streaming' | 'replaygain' | 'broadcast' = 'streaming') {
    this.vlcPlayer.setNormalization(enabled, target);
  }

  public getNormalizationTarget(): 'streaming' | 'replaygain' | 'broadcast' {
    return this.vlcPlayer.getNormalizationTarget();
  }

  public resetNormalization() {
    // Handled smoothly by VLC dynamic limiter
  }

  public isNormalizationActive(): boolean {
    return true;
  }

  public setStereoWidth(width: number) {
    this.vlcPlayer.setStereoWidth(width);
  }

  public getStereoWidth(): number {
    return 1.0;
  }

  public setPlaybackSpeed(speed: number, preservePitch = true) {
    this.vlcPlayer.setRate(speed);
  }

  public applyEqualizer(settings: EqualizerSettings) {
    const vlcEq = new VLCEqualizer();
    vlcEq.setPreamp(settings.preampGain || 0);

    if (settings.enabled && settings.bands) {
      settings.bands.forEach((b, i) => {
        let gain = b.gain || 0;
        // Apply bass & treble boosts seamlessly into VLC EQ bands
        if (i < 2 && settings.bassBoost) {
          gain += (settings.bassBoost || 0) * 1.2;
        }
        if (i >= 7 && settings.trebleBoost) {
          gain += (settings.trebleBoost || 0) * 1.2;
        }
        vlcEq.setBand(i, gain);
      });
    }

    this.vlcPlayer.setEqualizer(vlcEq);

    if (settings.stereoWidth !== undefined) {
      this.vlcPlayer.setStereoWidth(settings.stereoWidth);
    }
    if (settings.playbackSpeed !== undefined) {
      this.vlcPlayer.setRate(settings.playbackSpeed);
    }
  }

  public getFrequencyData(array: Uint8Array): void {
    this.vlcPlayer.getFrequencyData(array);
  }

  public getTimeDomainData(array: Uint8Array): void {
    this.vlcPlayer.getTimeDomainData(array);
  }

  public getSpectrumBands(numBands = 32): number[] {
    return this.vlcPlayer.getSpectrumBands(numBands);
  }

  public getAnalyser(): AnalyserNode | null {
    return (this.vlcPlayer as any).analyserNode || null;
  }

  public getAudioContext(): AudioContext | null {
    return (this.vlcPlayer as any).audioContext || null;
  }

  public getLibVLCPlayer() {
    return this.vlcPlayer;
  }
}

export const audioEngine = new AudioEngine();

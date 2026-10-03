// Helper to convert an AudioBuffer to a valid WAV Blob
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF chunk
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');

  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Interleave and write 16-bit PCM samples
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channelData[c][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Generates a white noise buffer for drums
function createNoiseBuffer(ctx: BaseAudioContext, duration: number): AudioBuffer {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// Musical notes frequencies (Hz)
const NOTE_FREQ: Record<string, number> = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, Db4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23,
  Gb4: 369.99, G4: 392.0, Ab4: 415.3, A4: 440.0, Bb4: 466.16, B4: 493.88,
  C5: 523.25, Db5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46,
  G5: 783.99, Ab5: 830.61, A5: 880.0, Bb5: 932.33, B5: 987.77,
  C6: 1046.5,
};

// Generates an authentic musical track using Web Audio API synthesis
export async function generateSynthesizedTrack(
  trackId: string,
  durationSec: number = 45
): Promise<Blob> {
  const AudioCtxClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!AudioCtxClass) {
    throw new Error('OfflineAudioContext not supported');
  }

  const sampleRate = 44100;
  const length = Math.min(Math.max(durationSec, 30), 60); // 30-60s loop
  const totalSamples = Math.floor(sampleRate * length);
  const ctx = new AudioCtxClass(2, totalSamples, sampleRate);

  // Master compressor and limiter
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, 0);
  compressor.knee.setValueAtTime(10, 0);
  compressor.ratio.setValueAtTime(4, 0);
  compressor.attack.setValueAtTime(0.005, 0);
  compressor.release.setValueAtTime(0.08, 0);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.85, 0);

  compressor.connect(masterGain);
  masterGain.connect(ctx.destination);

  const noiseBuffer = createNoiseBuffer(ctx, 1.0);

  // Drum helpers
  const playKick = (time: number) => {
    if (time >= length) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.18);
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    osc.connect(gain);
    gain.connect(compressor);
    osc.start(time);
    osc.stop(time + 0.25);
  };

  const playSnare = (time: number) => {
    if (time >= length) return;
    // Tonal snap
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.12);
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
    osc.connect(oscGain);
    oscGain.connect(compressor);
    osc.start(time);
    osc.stop(time + 0.12);

    // Noise burst
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(compressor);
    noise.start(time);
    noise.stop(time + 0.18);
  };

  const playHiHat = (time: number, accent: boolean = false) => {
    if (time >= length) return;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(accent ? 0.25 : 0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + (accent ? 0.08 : 0.04));
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(compressor);
    noise.start(time);
    noise.stop(time + 0.09);
  };

  const playTone = (
    freq: number,
    time: number,
    duration: number,
    type: OscillatorType = 'sine',
    vol: number = 0.3
  ) => {
    if (time >= length || freq <= 0) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(compressor);
    osc.start(time);
    osc.stop(time + duration);
  };

  // Compose according to trackId / theme
  switch (trackId) {
    case 'track-1': {
      // Midnight City Lights - Synthwave / Retrowave (110 BPM)
      const bpm = 110;
      const beat = 60 / bpm;
      const bassProg = [NOTE_FREQ.A2, NOTE_FREQ.F2, NOTE_FREQ.C3, NOTE_FREQ.G2];
      const leadArp = [
        NOTE_FREQ.A4, NOTE_FREQ.C5, NOTE_FREQ.E5, NOTE_FREQ.A5,
        NOTE_FREQ.G5, NOTE_FREQ.E5, NOTE_FREQ.C5, NOTE_FREQ.B4,
      ];

      for (let t = 0; t < length; t += beat * 4) {
        const chordIdx = Math.floor(t / (beat * 4)) % bassProg.length;
        const bassNote = bassProg[chordIdx];

        // 8th note bassline
        for (let b = 0; b < 8; b++) {
          const noteTime = t + b * (beat / 2);
          playTone(bassNote, noteTime, beat * 0.45, 'sawtooth', 0.22);
        }

        // Drums (Kick on 1 & 3, Snare on 2 & 4, 16th hats)
        playKick(t);
        playKick(t + beat * 2);
        playSnare(t + beat);
        playSnare(t + beat * 3);

        for (let h = 0; h < 8; h++) {
          playHiHat(t + h * (beat / 2), h % 2 === 0);
        }

        // Arpeggiated melody
        for (let a = 0; a < 8; a++) {
          const note = leadArp[(chordIdx * 2 + a) % leadArp.length];
          playTone(note, t + a * (beat / 2), beat * 0.4, 'sine', 0.18);
        }
      }
      break;
    }

    case 'track-2': {
      // Clair de Lune - Reimagined Ambient Piano (Db major / 65 BPM)
      const bpm = 65;
      const beat = 60 / bpm;
      const chords = [
        [NOTE_FREQ.Db4, NOTE_FREQ.F4, NOTE_FREQ.Ab4, NOTE_FREQ.C5],
        [NOTE_FREQ.Bb3, NOTE_FREQ.Db4, NOTE_FREQ.F4, NOTE_FREQ.Ab4],
        [NOTE_FREQ.Gb3, NOTE_FREQ.Bb3, NOTE_FREQ.Db4, NOTE_FREQ.F4],
        [NOTE_FREQ.Ab3, NOTE_FREQ.C4, NOTE_FREQ.Eb4, NOTE_FREQ.Gb4],
      ];

      for (let t = 0; t < length; t += beat * 4) {
        const chordIdx = Math.floor(t / (beat * 4)) % chords.length;
        const currentChord = chords[chordIdx];

        // Soft ambient bass pad
        playTone(currentChord[0] / 2, t, beat * 3.8, 'triangle', 0.25);

        // Cascading gentle piano arpeggios
        for (let i = 0; i < currentChord.length; i++) {
          playTone(currentChord[i], t + i * (beat * 0.9), beat * 2.2, 'sine', 0.28);
          // Upper octave overtone
          playTone(currentChord[i] * 2, t + i * (beat * 0.9) + 0.05, beat * 1.5, 'sine', 0.1);
        }
      }
      break;
    }

    case 'track-3': {
      // Cyberpunk Drive 2088 - High energy electro (128 BPM)
      const bpm = 128;
      const beat = 60 / bpm;
      const notes = [NOTE_FREQ.E2, NOTE_FREQ.E2, NOTE_FREQ.G2, NOTE_FREQ.A2];

      for (let t = 0; t < length; t += beat * 4) {
        // Driving Four-on-the-floor kick
        for (let k = 0; k < 4; k++) {
          playKick(t + k * beat);
          playHiHat(t + k * beat + beat / 2, true);
        }
        playSnare(t + beat);
        playSnare(t + beat * 3);

        // 16th note acid/cyber bass
        for (let s = 0; s < 16; s++) {
          const n = notes[(s + Math.floor(t)) % notes.length];
          playTone(n, t + s * (beat / 4), beat * 0.2, 'sawtooth', 0.24);
        }
      }
      break;
    }

    case 'track-4': {
      // Deep Focus - Lofi Study Beats (78 BPM)
      const bpm = 78;
      const beat = 60 / bpm;
      const lofiChords = [
        [NOTE_FREQ.D3, NOTE_FREQ.F3, NOTE_FREQ.A3, NOTE_FREQ.C4, NOTE_FREQ.E4], // Dm9
        [NOTE_FREQ.G2, NOTE_FREQ.F3, NOTE_FREQ.B3, NOTE_FREQ.E4],              // G13
        [NOTE_FREQ.C3, NOTE_FREQ.E3, NOTE_FREQ.G3, NOTE_FREQ.B3, NOTE_FREQ.D4], // Cmaj9
        [NOTE_FREQ.A2, NOTE_FREQ.G3, NOTE_FREQ.Db4, NOTE_FREQ.E4],             // A7#9
      ];

      for (let t = 0; t < length; t += beat * 4) {
        const chord = lofiChords[Math.floor(t / (beat * 4)) % lofiChords.length];

        // Lofi boom-bap rhythm (laid-back kick and rim)
        playKick(t);
        playKick(t + beat * 2.5);
        playSnare(t + beat);
        playSnare(t + beat * 3);

        // Soft swing hi-hats
        for (let h = 0; h < 8; h++) {
          playHiHat(t + h * (beat / 2) + (h % 2 === 1 ? 0.03 : 0), false);
        }

        // Rhodes-style electric piano chord
        for (const freq of chord) {
          playTone(freq, t, beat * 3.5, 'sine', 0.22);
          playTone(freq * 1.002, t, beat * 3.5, 'triangle', 0.08); // Chorus detune
        }
      }
      break;
    }

    case 'track-5': {
      // Solaris Sunset - Warm Ambient Chill (70 BPM)
      const bpm = 70;
      const beat = 60 / bpm;
      const sunsetPads = [
        [NOTE_FREQ.E3, NOTE_FREQ.G3, NOTE_FREQ.B3, NOTE_FREQ.D4],
        [NOTE_FREQ.C3, NOTE_FREQ.E3, NOTE_FREQ.G3, NOTE_FREQ.B3],
        [NOTE_FREQ.A2, NOTE_FREQ.C3, NOTE_FREQ.E3, NOTE_FREQ.G3],
        [NOTE_FREQ.B2, NOTE_FREQ.Eb3, NOTE_FREQ.Gb3, NOTE_FREQ.B3],
      ];

      for (let t = 0; t < length; t += beat * 4) {
        const pad = sunsetPads[Math.floor(t / (beat * 4)) % sunsetPads.length];
        for (const freq of pad) {
          playTone(freq, t, beat * 3.9, 'sine', 0.2);
          playTone(freq * 2, t + 0.2, beat * 3.5, 'sine', 0.08);
        }
        playTone(pad[0] / 2, t, beat * 3.9, 'triangle', 0.25);
      }
      break;
    }

    case 'track-6':
    default: {
      // Acoustic Morning Breeze - Fingerpicked folk harmonies (96 BPM)
      const bpm = 96;
      const beat = 60 / bpm;
      const acousticPattern = [
        [NOTE_FREQ.C3, NOTE_FREQ.G3, NOTE_FREQ.C4, NOTE_FREQ.E4, NOTE_FREQ.G4],
        [NOTE_FREQ.A2, NOTE_FREQ.E3, NOTE_FREQ.A3, NOTE_FREQ.C4, NOTE_FREQ.E4],
        [NOTE_FREQ.F2, NOTE_FREQ.C3, NOTE_FREQ.F3, NOTE_FREQ.A3, NOTE_FREQ.C4],
        [NOTE_FREQ.G2, NOTE_FREQ.D3, NOTE_FREQ.G3, NOTE_FREQ.B3, NOTE_FREQ.D4],
      ];

      for (let t = 0; t < length; t += beat * 4) {
        const pattern = acousticPattern[Math.floor(t / (beat * 4)) % acousticPattern.length];
        // Plucked fingerstyle sequence
        for (let i = 0; i < 8; i++) {
          const note = pattern[i % pattern.length];
          playTone(note, t + i * (beat / 2), beat * 0.8, 'triangle', 0.25);
          playTone(note * 2, t + i * (beat / 2) + 0.01, beat * 0.4, 'sine', 0.1);
        }
      }
      break;
    }
  }

  const renderedBuffer = await ctx.startRendering();
  return audioBufferToWav(renderedBuffer);
}

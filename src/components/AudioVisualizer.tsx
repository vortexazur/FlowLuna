import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';
import { AccentColor } from '../types';

interface AudioVisualizerProps {
  isPlaying: boolean;
  style?: 'bars' | 'wave' | 'circle' | 'minimal' | 'pillars';
  accent?: AccentColor;
  barCount?: number;
  className?: string;
  showPeaks?: boolean;
  interactive?: boolean;
  onStyleChange?: (style: 'bars' | 'wave' | 'circle' | 'minimal' | 'pillars') => void;
}

const ACCENT_HEX: Record<AccentColor, string> = {
  emerald: '#10b981',
  violet: '#8b5cf6',
  blue: '#3b82f6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  cyan: '#06b6d4',
};

const ACCENT_GLOW: Record<AccentColor, string> = {
  emerald: 'rgba(16, 185, 129, 0.4)',
  violet: 'rgba(139, 92, 246, 0.4)',
  blue: 'rgba(59, 130, 246, 0.4)',
  amber: 'rgba(245, 158, 11, 0.4)',
  rose: 'rgba(244, 63, 94, 0.4)',
  cyan: 'rgba(6, 182, 212, 0.4)',
};

/**
 * Universal safe rounded rectangle drawing function that never throws IndexSizeError
 */
function drawSafeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  if (w <= 0 || h <= 0 || !isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h)) {
    return;
  }
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (r <= 0.5) {
    ctx.fillRect(x, y, w, h);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  style = 'bars',
  accent = 'emerald',
  barCount = 32,
  className = '',
  showPeaks = true,
  onStyleChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const peaksRef = useRef<number[]>([]);
  const peakDecaySpeedRef = useRef<number[]>([]);

  const handleCanvasClick = () => {
    if (!onStyleChange) return;
    const styles: Array<'bars' | 'wave' | 'circle' | 'minimal' | 'pillars'> = [
      'bars',
      'wave',
      'pillars',
      'circle',
      'minimal',
    ];
    const currentIndex = styles.indexOf(style);
    const nextStyle = styles[(currentIndex + 1) % styles.length];
    onStyleChange(nextStyle);
  };

  // Keep canvas resolution strictly in sync with its CSS size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const displayWidth = Math.max(10, canvas.clientWidth || 100);
      const displayHeight = Math.max(8, canvas.clientHeight || 30);
      canvas.width = Math.round(displayWidth * dpr);
      canvas.height = Math.round(displayHeight * dpr);
    });

    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colorHex = ACCENT_HEX[accent] || '#10b981';
    const glowColor = ACCENT_GLOW[accent] || 'rgba(16, 185, 129, 0.4)';

    // Buffer setup
    const bufferLength = 128;
    const rawFreqArray = new Uint8Array(bufferLength);
    const timeDomainArray = new Uint8Array(bufferLength);

    const numBands = Math.max(4, Math.min(barCount, 64));

    // Initialize peaks
    if (peaksRef.current.length !== numBands) {
      peaksRef.current = new Array(numBands).fill(0);
      peakDecaySpeedRef.current = new Array(numBands).fill(0);
    }

    const render = () => {
      try {
        // Handle high DPI
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const displayWidth = Math.max(10, canvas.clientWidth || 100);
        const displayHeight = Math.max(8, canvas.clientHeight || 30);

        if (canvas.width !== Math.round(displayWidth * dpr) || canvas.height !== Math.round(displayHeight * dpr)) {
          canvas.width = Math.round(displayWidth * dpr);
          canvas.height = Math.round(displayHeight * dpr);
        }

        ctx.save();
        ctx.scale(dpr, dpr);
        const width = displayWidth;
        const height = displayHeight;

        if (width <= 4 || height <= 4) {
          ctx.restore();
          return;
        }

        // Memory & CPU conservation: pause canvas rendering loop when app is hidden/minimized
        if (typeof document !== 'undefined' && document.hidden) {
          ctx.restore();
          return;
        }

        ctx.clearRect(0, 0, width, height);

        if (!isPlaying) {
          // If paused, decay peaks to zero then stop animation loop to conserve CPU & RAM
          let hasRemainingPeak = false;
          for (let i = 0; i < peaksRef.current.length; i++) {
            if (peaksRef.current[i] > 1) {
              peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 5);
              hasRemainingPeak = true;
            } else {
              peaksRef.current[i] = 0;
            }
          }
          if (hasRemainingPeak) {
            animationFrameRef.current = requestAnimationFrame(render);
          }
          ctx.restore();
          return;
        }

        animationFrameRef.current = requestAnimationFrame(render);

        // Fetch live audio data
        audioEngine.getFrequencyData(rawFreqArray);
        audioEngine.getTimeDomainData(timeDomainArray);

        // Check if live audio frequencies are actively flowing
        let sumTotal = 0;
        let hasActiveAudio = false;
        const totalBins = rawFreqArray.length;
        for (let j = 0; j < totalBins; j++) {
          sumTotal += rawFreqArray[j];
          if (rawFreqArray[j] > 2) {
            hasActiveAudio = true;
          }
        }
        const avgBinValue = sumTotal / Math.max(1, totalBins);
        // Anti-saturation detector: triggers if almost all bins are clipped to 255
        const isSaturated = avgBinValue > 248;

        // Compute logarithmic bands for natural spectrum display across audible music frequencies (~30Hz to ~15kHz)
        const bands: number[] = [];
        const minBin = 1; // Skip DC offset at bin 0
        const maxBin = Math.min(totalBins - 1, 86); // Musically active spectrum up to ~15 kHz
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

        for (let i = 0; i < numBands; i++) {
          const ratio = i / numBands;
          const nextRatio = (i + 1) / numBands;
          const startBin = Math.floor(minBin * Math.pow(maxBin / minBin, ratio));
          const endBin = Math.ceil(minBin * Math.pow(maxBin / minBin, nextRatio));
          const s = Math.max(minBin, startBin);
          const e = Math.min(maxBin + 1, Math.max(s + 1, endBin));

          let bandVal = 0;

          if (hasActiveAudio && isPlaying) {
            let sum = 0;
            for (let j = s; j < e; j++) {
              sum += rawFreqArray[j];
            }
            let rawAvg = sum / Math.max(1, e - s);

            // Anti-saturation guard: if stream is heavily clipped, scale down to prevent full-height stuck bars
            if (isSaturated) {
              rawAvg = (rawAvg / 255) * 170;
            }

            // Balanced perceptual tilt: human ear is less sensitive to high frequencies
            // Gentle factor (+25% at highest band) prevents saturating higher bands
            const perceptualTilt = 1 + ratio * 0.25;
            const normalized = Math.min(1.0, Math.max(0, (rawAvg / 255) * perceptualTilt));

            // Scale to 238 max: provides clean headroom so bars and peak caps never jam against the container border
            bandVal = Math.round(normalized * 238);
          } else if (isPlaying) {
            // Organic simulation fallback when stream is silent or CORS-restricted
            // Controlled amplitude: pulses smoothly between 15% and 55% height, NEVER hits maximum continuous height
            const t = now * 0.003;
            const wave1 = Math.sin(t * 2.2 + i * 0.45);
            const wave2 = Math.cos(t * 3.4 - i * 0.35);
            const wave3 = Math.sin(t * 1.2 + i * 0.75);
            const simNorm = (wave1 * 0.35 + wave2 * 0.25 + wave3 * 0.15 + 0.5) * 0.55;
            bandVal = Math.round(Math.max(12, Math.min(135, simNorm * 255)));
          }

          bands.push(bandVal);
        }

        // Update peaks with gravity
        for (let i = 0; i < numBands; i++) {
          const val = bands[i];
          if (val >= (peaksRef.current[i] || 0)) {
            peaksRef.current[i] = val;
            peakDecaySpeedRef.current[i] = 0.5;
          } else {
            peakDecaySpeedRef.current[i] = (peakDecaySpeedRef.current[i] || 0.5) + 0.25;
            peaksRef.current[i] = Math.max(0, (peaksRef.current[i] || 0) - peakDecaySpeedRef.current[i]);
          }
        }

        // 1. WAVEFORM (Oscilloscope)
        if (style === 'wave') {
          ctx.lineWidth = 2;
          ctx.strokeStyle = colorHex;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 6;
          ctx.beginPath();

          const sliceWidth = width / Math.max(1, timeDomainArray.length - 1);
          let x = 0;

          for (let i = 0; i < timeDomainArray.length; i++) {
            let v = timeDomainArray[i] / 128.0;
            if (!hasActiveAudio && isPlaying) {
              const t = now * 0.003;
              v = 1.0 + Math.sin(t * 3 + i * 0.12) * 0.22;
            }
            const y = (v * height) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }

          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        // 2. RADIAL CIRCLE SPECTRUM
        else if (style === 'circle') {
          const centerX = width / 2;
          const centerY = height / 2;
          const baseRadius = Math.max(4, Math.min(centerX, centerY) * 0.4);

          ctx.strokeStyle = colorHex;
          ctx.lineWidth = 1.8;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 4;
          ctx.beginPath();

          for (let i = 0; i < numBands; i++) {
            const val = bands[i] / 255;
            const rad = (i / numBands) * Math.PI * 2;
            const r = baseRadius + val * (Math.min(centerX, centerY) * 0.55);
            const x = centerX + Math.cos(rad) * r;
            const y = centerY + Math.sin(rad) * r;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.closePath();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        // 3. PILLARS (Symmetric Studio Spectrum from Center)
        else if (style === 'pillars') {
          const halfCount = Math.floor(numBands / 2);
          const totalPillars = Math.max(2, halfCount * 2);
          const gap = 1.5;
          const stepX = width / totalPillars;
          const pillarWidth = Math.max(1.5, stepX - gap);
          const centerY = height / 2;

          for (let i = 0; i < totalPillars; i++) {
            const bandIdx = i < halfCount ? halfCount - 1 - i : i - halfCount;
            const val = bands[bandIdx] || 0;
            const pillarHeight = Math.max(2, (val / 255) * (height * 0.9));
            const x = i * stepX;
            const topY = centerY - pillarHeight / 2;

            if (pillarHeight > 1) {
              const grad = ctx.createLinearGradient(0, topY, 0, topY + pillarHeight);
              grad.addColorStop(0, colorHex);
              grad.addColorStop(0.5, colorHex + 'cc');
              grad.addColorStop(1, colorHex);
              ctx.fillStyle = grad;
              drawSafeRoundedRect(ctx, x, topY, pillarWidth, pillarHeight, 1.5);
            }
          }
        }
        // 4. MINIMAL (Micro Dot LED Matrix)
        else if (style === 'minimal') {
          const gap = 2;
          const stepX = width / numBands;
          const dotWidth = Math.max(2, stepX - gap);
          const maxDots = 5;

          for (let i = 0; i < numBands; i++) {
            const val = bands[i];
            const activeDots = Math.round((val / 255) * maxDots);
            const x = i * stepX;

            for (let d = 0; d < maxDots; d++) {
              const dotH = Math.max(1, (height - (maxDots - 1) * gap) / maxDots);
              const dotY = height - (d + 1) * dotH - d * gap;
              const isActive = isPlaying && d < activeDots;

              ctx.fillStyle = isActive ? colorHex : 'rgba(255, 255, 255, 0.08)';
              drawSafeRoundedRect(ctx, x, dotY, dotWidth, dotH, 1.5);
            }
          }
        }
        // 5. STANDARD BARS (Studio Spectrum with Peak Caps)
        else {
          const gap = 2;
          const stepX = width / numBands;
          const barWidth = Math.max(2, stepX - gap);

          for (let i = 0; i < numBands; i++) {
            const val = bands[i];
            const barHeight = Math.max(1.5, (val / 255) * Math.max(2, height - 3));
            const x = i * stepX;
            const y = Math.max(0, height - barHeight);

            // Bar gradient
            const grad = ctx.createLinearGradient(0, height, 0, Math.min(height - 1, y));
            grad.addColorStop(0, colorHex + '33');
            grad.addColorStop(0.7, colorHex + 'dd');
            grad.addColorStop(1, colorHex);

            ctx.fillStyle = grad;
            drawSafeRoundedRect(ctx, x, y, barWidth, barHeight, 1.5);

            // Peak cap
            if (showPeaks && isPlaying) {
              const peakVal = peaksRef.current[i] || 0;
              if (peakVal > 10) {
                const peakY = Math.max(0, height - (peakVal / 255) * Math.max(2, height - 3));
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x, peakY, barWidth, 1.5);
              }
            }
          }
        }

        ctx.restore();
      } catch (err) {
        // Silently catch any transient canvas rendering error without bubbling up
        try {
          ctx.restore();
        } catch {}
      }
    };

    render();

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden && isPlaying) {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, style, accent, barCount, showPeaks]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      className={`block select-none cursor-pointer transition-opacity ${className}`}
      title="Cliquer pour changer le style du visualiseur sonore"
    />
  );
};

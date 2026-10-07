import { useState, useEffect, useRef, useCallback } from 'react';
import { SkipInterval, Track, PlayerSkipState } from '../types';
import { resolveOpeningCascade } from '../services/openingDetectorService';

interface UseOpeningDetectorProps {
  track: Track | null;
  currentTime: number;
  duration: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onSeek: (time: number) => void;
  initialAutoSkip?: boolean;
  onAutoSkipChange?: (enabled: boolean) => void;
}

export interface UseOpeningDetectorReturn {
  currentInterval: SkipInterval | null;
  isDetecting: boolean;
  isVisible: boolean;
  autoSkipEnabled: boolean;
  setAutoSkipEnabled: (enabled: boolean) => void;
  skipOpening: () => void;
  autoSkippedToast: string | null;
}

export function useOpeningDetector({
  track,
  currentTime,
  duration,
  videoRef,
  onSeek,
  initialAutoSkip = false,
  onAutoSkipChange,
}: UseOpeningDetectorProps): UseOpeningDetectorReturn {
  const [currentInterval, setCurrentInterval] = useState<SkipInterval | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [autoSkipEnabled, setAutoSkipEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('flowluna_auto_skip_opening');
      if (saved !== null) return saved === 'true';
    } catch {}
    return initialAutoSkip;
  });
  const [autoSkippedToast, setAutoSkippedToast] = useState<string | null>(null);

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoSkippedForTrackRef = useRef<string | null>(null);
  const isSkippingRef = useRef<boolean>(false);

  // Synchronisation du toggle auto-skip avec le stockage local et le callback parent
  const setAutoSkipEnabled = useCallback(
    (enabled: boolean) => {
      setAutoSkipEnabledState(enabled);
      try {
        localStorage.setItem('flowluna_auto_skip_opening', enabled ? 'true' : 'false');
      } catch {}
      if (onAutoSkipChange) {
        onAutoSkipChange(enabled);
      }
    },
    [onAutoSkipChange]
  );

  // Étape 1 : Résolution en cascade du SkipInterval dès qu'une nouvelle vidéo est chargée
  useEffect(() => {
    if (!track || !track.isVideo) {
      setCurrentInterval(null);
      setIsDetecting(false);
      setIsVisible(false);
      return;
    }

    let isMounted = true;
    setIsDetecting(true);
    setIsVisible(false);
    lastAutoSkippedForTrackRef.current = null;

    resolveOpeningCascade(videoRef.current, track, duration || track.duration || 0)
      .then((interval) => {
        if (isMounted) {
          setCurrentInterval(interval);
          setIsDetecting(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCurrentInterval(null);
          setIsDetecting(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [track?.id, track?.title, videoRef, duration]);

  // Action manuelle : Passer l'opening
  const skipOpening = useCallback(() => {
    if (!currentInterval) return;
    isSkippingRef.current = true;
    onSeek(currentInterval.end);
    setIsVisible(false);

    // Déclencher un bref toast informatif
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setAutoSkippedToast("Opening passé");
    toastTimerRef.current = setTimeout(() => {
      setAutoSkippedToast(null);
      isSkippingRef.current = false;
    }, 2000);
  }, [currentInterval, onSeek]);

  // Étape 2 : Écoute du flux temporel (timeupdate / currentTime)
  useEffect(() => {
    if (!currentInterval || isSkippingRef.current) {
      if (isVisible) setIsVisible(false);
      return;
    }

    const { start, end } = currentInterval;
    const isInsideOpening = currentTime >= start && currentTime < end;

    if (isInsideOpening) {
      if (autoSkipEnabled) {
        // Éviter les boucles de saut si déjà sauté pour cette vidéo
        const trackKey = `${track?.id || track?.title}_${start}`;
        if (lastAutoSkippedForTrackRef.current !== trackKey) {
          lastAutoSkippedForTrackRef.current = trackKey;
          isSkippingRef.current = true;
          onSeek(end);
          setIsVisible(false);

          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          setAutoSkippedToast("Opening passé automatiquement");
          toastTimerRef.current = setTimeout(() => {
            setAutoSkippedToast(null);
            isSkippingRef.current = false;
          }, 2500);
        }
      } else {
        // Mode manuel : afficher le bouton flottant
        if (!isVisible) {
          setIsVisible(true);
        }
      }
    } else {
      // Disparition automatique dès que currentTime sort de l'intervalle
      if (isVisible) {
        setIsVisible(false);
      }
    }
  }, [currentTime, currentInterval, autoSkipEnabled, onSeek, track, isVisible]);

  return {
    currentInterval,
    isDetecting,
    isVisible,
    autoSkipEnabled,
    setAutoSkipEnabled,
    skipOpening,
    autoSkippedToast,
  };
}

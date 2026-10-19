import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Track,
  MarathonConfig,
  VideoSkipMarkers,
  SkipInterval,
  DEFAULT_MARATHON_CONFIG,
} from '../types';
import {
  resolveVideoMarkersCascade,
  parseAnimeTitleAndEpisode,
} from '../services/openingDetectorService';
import { getTrackPlayableUrl } from '../services/audioDb';
import { isTrackVideo } from '../utils/fileAudioLoader';

export interface UseMarathonControllerProps {
  track: Track | null;
  currentTime: number;
  duration: number;
  queue?: Track[];
  currentTrackIndex?: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onNext: () => void;
  onSeek: (time: number) => void;
  config?: MarathonConfig;
  onUpdateConfig?: (config: MarathonConfig) => void;
  autoSkipOpening?: boolean;
  enableSkipOpening?: boolean;
  enableSilenceSnapping?: boolean;
}

export interface UseMarathonControllerReturn {
  markers: VideoSkipMarkers | null;
  isDetecting: boolean;
  episodeNumber: number;
  // Countdown overlay state
  isCountdownActive: boolean;
  countdownRemaining: number;
  countdownTotal: number;
  countdownProgress: number; // 0 (start) to 1 (done)
  nextTrack: Track | null;
  nextEpisodeNumber: number;
  // Actions
  triggerNextImmediately: () => void;
  cancelCountdown: () => void;
  toggleMarathon: () => void;
  marathonToast: string | null;
  // Opening controls (compatible with SkipOpeningButton)
  opInterval: SkipInterval | null;
  isOpButtonVisible: boolean;
  skipOpening: () => void;
}

export function useMarathonController({
  track,
  currentTime,
  duration,
  queue = [],
  currentTrackIndex = 0,
  videoRef,
  onNext,
  onSeek,
  config = DEFAULT_MARATHON_CONFIG,
  onUpdateConfig,
  autoSkipOpening = false,
  enableSkipOpening = true,
  enableSilenceSnapping = true,
}: UseMarathonControllerProps): UseMarathonControllerReturn {
  const [markers, setMarkers] = useState<VideoSkipMarkers | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [episodeNumber, setEpisodeNumber] = useState<number>(1);
  const [isCountdownActive, setIsCountdownActive] = useState<boolean>(false);
  const [countdownRemaining, setCountdownRemaining] = useState<number>(config.countdownDuration);
  const [countdownTotal, setCountdownTotal] = useState<number>(config.countdownDuration);
  const [countdownProgress, setCountdownProgress] = useState<number>(0);
  const [marathonToast, setMarathonToast] = useState<string | null>(null);
  const [isOpButtonVisible, setIsOpButtonVisible] = useState<boolean>(false);

  // References for tracking actions per track to avoid repeating cycles
  const hasPreloadedRef = useRef<boolean>(false);
  const hasSkippedOpRef = useRef<boolean>(false);
  const hasSkippedEdRef = useRef<boolean>(false);
  const hasTriggeredTransitionRef = useRef<boolean>(false);
  const isCancelledRef = useRef<boolean>(false);
  const isSeekingRef = useRef<boolean>(false);
  const countdownEndTimeRef = useRef<number>(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preloadedMediaElementRef = useRef<HTMLVideoElement | null>(null);

  // Next track info
  const hasNext = currentTrackIndex >= 0 && currentTrackIndex + 1 < queue.length;
  const nextTrack = hasNext ? queue[currentTrackIndex + 1] : null;
  const nextEpisodeNumber = nextTrack
    ? parseAnimeTitleAndEpisode(nextTrack.title || nextTrack.album || '').episodeNumber
    : episodeNumber + 1;

  // Show a brief informative toast
  const showToast = useCallback((msg: string, durationMs: number = 2500) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setMarathonToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setMarathonToast(null);
    }, durationMs);
  }, []);

  // Nettoyage complet de tout média de préchargement pour libérer les ressources GPU / Direct3D
  const cleanupPreloadedElement = useCallback(() => {
    if (preloadedMediaElementRef.current) {
      try {
        preloadedMediaElementRef.current.pause();
        preloadedMediaElementRef.current.removeAttribute('src');
        preloadedMediaElementRef.current.load();
        preloadedMediaElementRef.current.remove();
      } catch {}
      preloadedMediaElementRef.current = null;
    }
  }, []);

  // Preload next episode in background (préchauffe le cache réseau / disque sans instancier de décodeur GPU concurrent)
  const preloadNextTrack = useCallback(async (target: Track) => {
    if (!target) return;
    try {
      const url = await getTrackPlayableUrl(target);
      if (!url) return;

      // Nettoyer tout décodeur résiduel antérieur
      cleanupPreloadedElement();

      // Précharger via une requête Range HTTP légère (2 Mo) pour amorcer le flux
      // sans ouvrir de second pipeline de décodage matériel Direct3D 11 concurrent
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        await fetch(url, {
          headers: { Range: 'bytes=0-2097151' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        console.info(`[Marathon] Préchargement réseau initié pour l'épisode suivant : "${target.title}"`);
      } catch {
        // En cas d'interruption ou timeout, aucun impact sur la vidéo active
      }
    } catch (err) {
      console.warn('[Marathon] Avertissement préchargement :', err);
    }
  }, [cleanupPreloadedElement]);

  // Cleanup preloaded media element on unmount
  useEffect(() => {
    return () => {
      cleanupPreloadedElement();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [cleanupPreloadedElement]);

  // 1. Resolve markers and episode info when a new track is loaded
  useEffect(() => {
    // Nettoyage systématique de tout préchargement antérieur pour libérer les décodeurs matériels
    cleanupPreloadedElement();

    if (!track || !isTrackVideo(track)) {
      setMarkers(null);
      setIsDetecting(false);
      setIsOpButtonVisible(false);
      setIsCountdownActive(false);
      return;
    }

    let isMounted = true;
    setIsDetecting(true);
    setIsOpButtonVisible(false);
    setIsCountdownActive(false);

    // Reset cycle guards for new video
    hasPreloadedRef.current = false;
    hasSkippedOpRef.current = false;
    hasSkippedEdRef.current = false;
    hasTriggeredTransitionRef.current = false;
    isCancelledRef.current = false;
    isSeekingRef.current = false;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    const { episodeNumber: epNum } = parseAnimeTitleAndEpisode(track.title || track.album || '');
    setEpisodeNumber(epNum);

    resolveVideoMarkersCascade(videoRef.current, track, duration || track.duration || 0, enableSilenceSnapping)
      .then((resolved) => {
        if (isMounted) {
          setMarkers(resolved);
          setIsDetecting(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[Marathon] Erreur cascade marqueurs :', err);
          setMarkers(null);
          setIsDetecting(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [track?.id, track?.title, videoRef, duration, currentTrackIndex]);

  // Start transition towards next episode (either immediate or with countdown overlay)
  const startTransition = useCallback(() => {
    if (hasTriggeredTransitionRef.current || isCancelledRef.current || !hasNext) return;
    hasTriggeredTransitionRef.current = true;

    if (config.countdownDuration <= 0) {
      onNext();
    } else {
      setIsCountdownActive(true);
      setCountdownRemaining(config.countdownDuration);
      setCountdownTotal(config.countdownDuration);
      setCountdownProgress(0);
      countdownEndTimeRef.current = Date.now() + config.countdownDuration * 1000;

      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        const remaining = Math.max(0, (countdownEndTimeRef.current - Date.now()) / 1000);
        setCountdownRemaining(remaining);
        const progress = Math.min(1, Math.max(0, 1 - remaining / config.countdownDuration));
        setCountdownProgress(progress);

        if (remaining <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setIsCountdownActive(false);
          onNext();
        }
      }, 100);
    }
  }, [config.countdownDuration, hasNext, onNext]);

  // Manual Trigger: "Lire maintenant" (or shortcut 'N')
  const triggerNextImmediately = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setIsCountdownActive(false);
    hasTriggeredTransitionRef.current = true;
    onNext();
  }, [onNext]);

  // Manual Cancel: "Annuler" (or shortcut 'Escape')
  const cancelCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setIsCountdownActive(false);
    isCancelledRef.current = true;
    showToast('Enchaînement automatique annulé');
  }, [showToast]);

  // Manual Action: Skip Opening
  const skipOpening = useCallback(() => {
    if (!enableSkipOpening || !markers?.op || isSeekingRef.current) return;
    const video = videoRef.current;
    if (video && video.seeking) return;

    isSeekingRef.current = true;
    hasSkippedOpRef.current = true;
    onSeek(markers.op.end);
    setIsOpButtonVisible(false);
    showToast('Opening passé');

    if (video) {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        isSeekingRef.current = false;
      };
      video.addEventListener('seeked', onSeeked, { once: true });
      setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        isSeekingRef.current = false;
      }, 1200);
    } else {
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 500);
    }
  }, [enableSkipOpening, markers?.op, onSeek, showToast, videoRef]);

  // Toggle Marathon Mode enabled
  const toggleMarathon = useCallback(() => {
    const updated: MarathonConfig = {
      ...config,
      enabled: !config.enabled,
    };
    onUpdateConfig?.(updated);
    showToast(updated.enabled ? 'Mode Marathon activé' : 'Mode Marathon désactivé');
  }, [config, onUpdateConfig, showToast]);

  // Listen for native 'ended' event on video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (config.enabled && hasNext && !hasTriggeredTransitionRef.current && !isCancelledRef.current) {
        startTransition();
      }
    };

    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoRef, config.enabled, hasNext, startTransition]);

  // Time Progression Inspector: Handles OP auto-skip, ED transition, preloading
  useEffect(() => {
    if (!track || !isTrackVideo(track)) return;

    // Reset guards if user rewinds back
    if (markers?.ed && currentTime < markers.ed.start - 8) {
      if (hasSkippedEdRef.current) hasSkippedEdRef.current = false;
      if (isCancelledRef.current) isCancelledRef.current = false;
      if (hasTriggeredTransitionRef.current && !isCountdownActive) {
        hasTriggeredTransitionRef.current = false;
      }
    } else if (duration > 0 && currentTime < duration - 15) {
      if (isCancelledRef.current) isCancelledRef.current = false;
      if (hasTriggeredTransitionRef.current && !isCountdownActive) {
        hasTriggeredTransitionRef.current = false;
      }
    }

    if (markers?.op && currentTime < markers.op.start - 5) {
      if (hasSkippedOpRef.current) hasSkippedOpRef.current = false;
    }

    // 1. Preload Next Episode in background (Rule 3)
    if (hasNext && nextTrack && !hasPreloadedRef.current) {
      const edStart = markers?.ed?.start;
      const preloadThreshold =
        typeof edStart === 'number' && edStart > 0
          ? Math.max(0, edStart - 12)
          : duration > 0
          ? duration * 0.9
          : 0;

      if (preloadThreshold > 0 && currentTime >= preloadThreshold) {
        hasPreloadedRef.current = true;
        preloadNextTrack(nextTrack);
      }
    }

    // 2. Auto-Skip OP (Garde-fous stricts : jamais d'auto-skip en heuristique ou si drift détecté)
    if (enableSkipOpening && markers?.op) {
      const { start: opStart, end: opEnd, source: opSource } = markers.op;
      const isInsideOp = currentTime >= opStart && currentTime < opEnd;

      if (isInsideOp) {
        const isFirstEpisode = episodeNumber === 1;
        // Configuration utilisateur autorisant le saut automatique de l'opening (Skip OP)
        const isConfiguredToAutoSkip =
          !!autoSkipOpening && (!config.enabled || !isFirstEpisode || config.skipFirstEpisodeOp);

        // Règle stricte :
        // - Interdiction d'auto-skip sans confirmation si source === 'heuristic'
        // - Interdiction d'auto-skip sans confirmation si l'OP lui-même signale une dérive (drift sur l'intervalle)
        const canAutoSkipOp =
          isConfiguredToAutoSkip &&
          opSource !== 'heuristic' &&
          opSource !== 'ai' &&
          !markers.op?.drift;

        if (canAutoSkipOp) {
          if (!isSeekingRef.current && !hasSkippedOpRef.current) {
            const video = videoRef.current;
            // Ne pas déclencher le saut tant que le décodeur n'est pas prêt (readyState < 3)
            // ou si un seek est en cours, afin de préserver la synchronisation labiale exacte
            if (video && (video.readyState < 3 || video.seeking)) {
              return;
            }

            isSeekingRef.current = true;
            hasSkippedOpRef.current = true;
            onSeek(opEnd);
            setIsOpButtonVisible(false);
            showToast('Opening passé automatiquement');

            if (video) {
              const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                isSeekingRef.current = false;
              };
              video.addEventListener('seeked', onSeeked, { once: true });
              setTimeout(() => {
                video.removeEventListener('seeked', onSeeked);
                isSeekingRef.current = false;
              }, 1200);
            } else {
              setTimeout(() => {
                isSeekingRef.current = false;
              }, 500);
            }
          }
        } else {
          // Dans tous les cas d'incertitude (heuristique, drift) ou premier épisode manuel :
          // forcer l'affichage du bouton manuel même si autoSkipOpening: true
          setIsOpButtonVisible(true);
        }
      } else {
        setIsOpButtonVisible(false);
      }
    } else if (!enableSkipOpening && isOpButtonVisible) {
      setIsOpButtonVisible(false);
    }

    // 3. Ending & Auto-Chain Transitions (Rule 2)
    if (
      config.enabled &&
      hasNext &&
      !hasTriggeredTransitionRef.current &&
      !isCancelledRef.current &&
      !isCountdownActive
    ) {
      if (markers?.ed) {
        const { start: edStart, end: edEnd } = markers.ed;
        const isInsideEd = currentTime >= edStart && currentTime < edEnd;

        if (markers.hasPostCredits) {
          // Cas B : Présence d'un teaser ou scène post-crédits
          if (config.playPostCreditsScene) {
            // Sauter l'ED pour aller directement au teaser
            if (config.skipEnding && isInsideEd && !hasSkippedEdRef.current && !isSeekingRef.current) {
              const video = videoRef.current;
              if (video && (video.readyState < 3 || video.seeking)) {
                return;
              }

              isSeekingRef.current = true;
              hasSkippedEdRef.current = true;
              onSeek(edEnd);
              showToast('Ending passé (Lecture du teaser / scène post-crédits)');

              if (video) {
                const onSeeked = () => {
                  video.removeEventListener('seeked', onSeeked);
                  isSeekingRef.current = false;
                };
                video.addEventListener('seeked', onSeeked, { once: true });
                setTimeout(() => {
                  video.removeEventListener('seeked', onSeeked);
                  isSeekingRef.current = false;
                }, 1200);
              } else {
                setTimeout(() => {
                  isSeekingRef.current = false;
                }, 500);
              }
            }
            // Transition dès la fin du teaser / fin de la vidéo
            const isNearPostCreditsEnd =
              duration > 0 && currentTime >= Math.max(edEnd + 4, duration - 2.5);
            if (isNearPostCreditsEnd) {
              startTransition();
            }
          } else {
            // Pas de teaser souhaité : comportement du Cas A
            if (config.skipEnding) {
              if (currentTime >= edStart) {
                startTransition();
              }
            } else if (duration > 0 && currentTime >= duration - 2.5) {
              startTransition();
            }
          }
        } else {
          // Cas A : Absence de scène post-générique
          if (config.skipEnding) {
            if (currentTime >= edStart) {
              startTransition();
            }
          } else if (duration > 0 && currentTime >= duration - 2.5) {
            startTransition();
          }
        }
      } else {
        // Fallback sans marqueur ED : enchaînement à la fin de la vidéo
        if (duration > 0 && currentTime >= duration - 2.5) {
          startTransition();
        }
      }
    }
  }, [
    track,
    currentTime,
    duration,
    markers,
    episodeNumber,
    config,
    hasNext,
    nextTrack,
    autoSkipOpening,
    isCountdownActive,
    onSeek,
    preloadNextTrack,
    showToast,
    startTransition,
  ]);

  return {
    markers,
    isDetecting,
    episodeNumber,
    isCountdownActive,
    countdownRemaining,
    countdownTotal,
    countdownProgress,
    nextTrack,
    nextEpisodeNumber,
    triggerNextImmediately,
    cancelCountdown,
    toggleMarathon,
    marathonToast,
    opInterval: enableSkipOpening ? (markers?.op || null) : null,
    isOpButtonVisible: enableSkipOpening ? isOpButtonVisible : false,
    skipOpening,
  };
}

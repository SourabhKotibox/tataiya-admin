import { useState, useEffect, useRef, useCallback } from 'react';

export type AdPhase = 'idle' | 'playing' | 'completed';
export type AdType = 'preroll' | 'midroll' | 'between-episode';

interface AdConfig {
  duration: number;
  skippableAfter: number;
  mediaUrl?: string;
  label?: string;
}

interface UseAdPlaybackOptions {
  onAdComplete?: () => void;
  onAdSkip?: () => void;
}

export function useAdPlayback(options: UseAdPlaybackOptions = {}) {
  const [phase, setPhase] = useState<AdPhase>('idle');
  const [timer, setTimer] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [config, setConfig] = useState<AdConfig | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const remainingRef = useRef(5);

  // Keep options in a ref to prevent startAd/skipAd identity changes on every render
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const startAd = useCallback((type: AdType = 'preroll', adConfig?: Partial<AdConfig>) => {
    clearTimer();
    const duration = adConfig?.duration ?? 5;
    const fullConfig: AdConfig = {
      duration,
      skippableAfter: 0,
      label: type === 'preroll' ? 'Advertisement' : type === 'midroll' ? 'Ad Break' : 'Up Next',
      ...adConfig,
    };
    setConfig(fullConfig);
    setPhase('playing');
    setTimer(duration);
    setCanSkip(false);
    remainingRef.current = duration;

    timerRef.current = setInterval(() => {
      remainingRef.current -= 1;
      const nextRemaining = Math.max(0, remainingRef.current);
      setTimer(nextRemaining);

      if (nextRemaining <= 0) {
        clearTimer();
        setCanSkip(true);
      }
    }, 1000);
  }, [clearTimer]);

  const skipAd = useCallback(() => {
    clearTimer();
    setPhase('completed');
    if (optionsRef.current.onAdSkip) {
      optionsRef.current.onAdSkip();
    } else if (optionsRef.current.onAdComplete) {
      optionsRef.current.onAdComplete();
    }
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setPhase('idle');
    setTimer(0);
    setCanSkip(false);
    setConfig(null);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return {
    phase,
    timer,
    canSkip,
    startAd,
    skipAd,
    reset,
    config,
    isActive: phase === 'playing',
  };
}

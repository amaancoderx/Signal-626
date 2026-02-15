'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { DEFAULT_YEAR, MIN_YEAR, MAX_YEAR, PLAYBACK_INTERVAL_MS } from '@/lib/constants';
import type { PlaybackSpeed } from '@/lib/types';

interface TimelineHookState {
  year: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
}

export function useTimeline() {
  const [state, setState] = useState<TimelineHookState>({
    year: DEFAULT_YEAR,
    isPlaying: false,
    speed: 1,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setYear = useCallback((year: number) => {
    setState((prev) => ({ ...prev, year: Math.max(MIN_YEAR, Math.min(MAX_YEAR, year)) }));
  }, []);

  const play = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlay = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const setSpeed = useCallback((speed: PlaybackSpeed) => {
    setState((prev) => ({ ...prev, speed }));
  }, []);

  // Step forward one year (works anytime)
  const stepForward = useCallback(() => {
    setState((prev) => {
      const next = prev.year + 1;
      return { ...prev, year: next > MAX_YEAR ? MIN_YEAR : next };
    });
  }, []);

  // Step backward one year (works anytime)
  const stepBackward = useCallback(() => {
    setState((prev) => {
      const next = prev.year - 1;
      return { ...prev, year: next < MIN_YEAR ? MAX_YEAR : next };
    });
  }, []);

  // Auto-play: always forward, loops at end
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (state.isPlaying) {
      const interval = PLAYBACK_INTERVAL_MS / state.speed;
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          const nextYear = prev.year + 1;
          if (nextYear > MAX_YEAR) {
            return { ...prev, year: MIN_YEAR };
          }
          return { ...prev, year: nextYear };
        });
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isPlaying, state.speed]);

  return {
    ...state,
    setYear,
    play,
    pause,
    togglePlay,
    setSpeed,
    stepForward,
    stepBackward,
  };
}

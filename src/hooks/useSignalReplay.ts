'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { SIGNAL_BATCH_SIZE, SIGNAL_BASE_DELAY_MS } from '@/lib/constants';
import type { MapPoint, PlaybackSpeed } from '@/lib/types';

export interface SignalReplayState {
  visiblePoints: MapPoint[];
  currentMonth: number; // 0-11
  currentDay: number; // 1-31
  currentTime: string; // "HH:MM" or ""
  eventsShown: number;
  totalEvents: number;
  isComplete: boolean;
}

interface UseSignalReplayOptions {
  points: MapPoint[];
  year: number;
  speed: PlaybackSpeed;
  isPlaying: boolean;
  enabled: boolean; // only active when timelineMode === 'signal'
  onYearComplete?: () => void;
}

/**
 * Groups sightings by month and sorts chronologically within each month.
 * Returns array of 12 arrays (index 0 = January, 11 = December).
 */
function groupSightingsByMonthAndTime(
  points: MapPoint[],
): MapPoint[][] {
  const months: MapPoint[][] = Array.from({ length: 12 }, () => []);

  for (const p of points) {
    if (!p.occurred) {
      // No date — put in January as fallback
      months[0].push(p);
      continue;
    }
    try {
      const d = new Date(p.occurred);
      const m = d.getMonth(); // 0-11
      if (m >= 0 && m < 12) {
        months[m].push(p);
      } else {
        months[0].push(p);
      }
    } catch {
      months[0].push(p);
    }
  }

  // Sort each month chronologically by occurred timestamp
  for (const monthArr of months) {
    monthArr.sort((a, b) => {
      const ta = a.occurred ? new Date(a.occurred).getTime() : 0;
      const tb = b.occurred ? new Date(b.occurred).getTime() : 0;
      return ta - tb;
    });
  }

  return months;
}

export function useSignalReplay({
  points,
  year,
  speed,
  isPlaying,
  enabled,
  onYearComplete,
}: UseSignalReplayOptions): SignalReplayState & {
  play: () => void;
  pause: () => void;
  reset: () => void;
} {
  // Grouped data: recomputed when points change
  const monthlyData = useMemo(
    () => (enabled ? groupSightingsByMonthAndTime(points) : []),
    [points, enabled]
  );

  const totalEvents = useMemo(
    () => monthlyData.reduce((sum, m) => sum + m.length, 0),
    [monthlyData]
  );

  // Replay state
  const [currentMonth, setCurrentMonth] = useState(0);
  const [currentDay, setCurrentDay] = useState(1);
  const [currentTime, setCurrentTime] = useState('');
  const [eventIndex, setEventIndex] = useState(0); // index within current month
  const [visiblePoints, setVisiblePoints] = useState<MapPoint[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Refs for the animation loop
  const rafRef = useRef(0);
  const lastTickRef = useRef(0);
  const monthRef = useRef(0);
  const eventIndexRef = useRef(0);
  const visibleRef = useRef<MapPoint[]>([]);
  const completeRef = useRef(false);
  const onYearCompleteRef = useRef(onYearComplete);
  onYearCompleteRef.current = onYearComplete;

  // Reset when year/points/enabled changes
  useEffect(() => {
    monthRef.current = 0;
    eventIndexRef.current = 0;
    visibleRef.current = [];
    completeRef.current = false;
    setCurrentMonth(0);
    setCurrentDay(1);
    setCurrentTime('');
    setEventIndex(0);
    setVisiblePoints([]);
    setIsComplete(false);
  }, [year, points, enabled]);

  // Compute delay between batches
  const delayMs = SIGNAL_BASE_DELAY_MS / speed;

  // Compute dynamic batch size: scale up gently for very large months to avoid
  // taking forever, but keep it small enough to follow the date/time progression
  const getBatchSize = useCallback((monthEvents: number) => {
    if (monthEvents > 2000) return Math.max(SIGNAL_BATCH_SIZE, Math.ceil(monthEvents / 80));
    if (monthEvents > 1000) return Math.max(SIGNAL_BATCH_SIZE, Math.ceil(monthEvents / 100));
    if (monthEvents > 500) return Math.max(SIGNAL_BATCH_SIZE, Math.ceil(monthEvents / 120));
    return SIGNAL_BATCH_SIZE;
  }, []);

  // Animation loop
  useEffect(() => {
    if (!enabled || !isPlaying || completeRef.current || monthlyData.length === 0) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = (now: number) => {
      if (!lastTickRef.current) lastTickRef.current = now;

      const elapsed = now - lastTickRef.current;
      if (elapsed < delayMs) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTickRef.current = now;

      let month = monthRef.current;
      let idx = eventIndexRef.current;

      // Skip empty months
      while (month < 12 && monthlyData[month].length === 0) {
        month++;
      }

      if (month >= 12) {
        // All months done
        completeRef.current = true;
        setIsComplete(true);
        setCurrentMonth(11);
        onYearCompleteRef.current?.();
        return;
      }

      const monthEvents = monthlyData[month];
      const batchSize = getBatchSize(monthEvents.length);
      const end = Math.min(idx + batchSize, monthEvents.length);
      const batch = monthEvents.slice(idx, end);

      if (batch.length > 0) {
        visibleRef.current = [...visibleRef.current, ...batch];
        setVisiblePoints(visibleRef.current);

        // Extract day/time from the last event in this batch
        const lastEvent = batch[batch.length - 1];
        if (lastEvent.occurred) {
          try {
            const d = new Date(lastEvent.occurred);
            setCurrentDay(d.getDate());
            const h = d.getHours().toString().padStart(2, '0');
            const m = d.getMinutes().toString().padStart(2, '0');
            setCurrentTime(`${h}:${m}`);
          } catch {
            // skip
          }
        }
      }

      idx = end;
      eventIndexRef.current = idx;
      setEventIndex(idx);

      if (idx >= monthEvents.length) {
        // Month complete — advance
        month++;
        monthRef.current = month;
        eventIndexRef.current = 0;
        idx = 0;

        if (month < 12) {
          setCurrentMonth(month);
        } else {
          completeRef.current = true;
          setIsComplete(true);
          setCurrentMonth(11);
          onYearCompleteRef.current?.();
          return;
        }
      } else {
        setCurrentMonth(month);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    lastTickRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, isPlaying, monthlyData, delayMs, getBatchSize]);

  const eventsShown = visiblePoints.length;

  const play = useCallback(() => {
    // External play — handled via isPlaying prop from parent
  }, []);

  const pause = useCallback(() => {
    // External pause — handled via isPlaying prop from parent
  }, []);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    monthRef.current = 0;
    eventIndexRef.current = 0;
    visibleRef.current = [];
    completeRef.current = false;
    lastTickRef.current = 0;
    setCurrentMonth(0);
    setCurrentDay(1);
    setCurrentTime('');
    setEventIndex(0);
    setVisiblePoints([]);
    setIsComplete(false);
  }, []);

  return {
    visiblePoints,
    currentMonth,
    currentDay,
    currentTime,
    eventsShown,
    totalEvents,
    isComplete,
    play,
    pause,
    reset,
  };
}

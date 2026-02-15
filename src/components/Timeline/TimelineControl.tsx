'use client';

import { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber } from '@/lib/utils';
import type { PlaybackSpeed, YearCount } from '@/lib/types';

interface TimelineControlProps {
  year: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  yearCount: number;
  yearCounts: YearCount[];
  onYearChange: (year: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onStepForward: () => void;
  onStepBackward: () => void;
}

const QUICK_YEARS = [1400, 1800, 1900, 1950, 1970, 1990, 2000, 2010, 2020, 2026];
const QUICK_YEARS_MOBILE = [1400, 1900, 1970, 2000, 2020, 2026];
const NUM_SEGMENTS = QUICK_YEARS.length - 1; // 9 segments

// Non-linear mapping: each segment between quick-select years gets equal slider space
function yearToProgress(year: number): number {
  if (year <= QUICK_YEARS[0]) return 0;
  if (year >= QUICK_YEARS[QUICK_YEARS.length - 1]) return 100;

  for (let i = 1; i < QUICK_YEARS.length; i++) {
    if (year <= QUICK_YEARS[i]) {
      const segStart = ((i - 1) / NUM_SEGMENTS) * 100;
      const segEnd = (i / NUM_SEGMENTS) * 100;
      const t = (year - QUICK_YEARS[i - 1]) / (QUICK_YEARS[i] - QUICK_YEARS[i - 1]);
      return segStart + t * (segEnd - segStart);
    }
  }
  return 100;
}

function progressToYear(progress: number): number {
  if (progress <= 0) return QUICK_YEARS[0];
  if (progress >= 100) return QUICK_YEARS[QUICK_YEARS.length - 1];

  const segIndex = (progress / 100) * NUM_SEGMENTS;
  const i = Math.floor(segIndex);
  const t = segIndex - i;

  if (i >= NUM_SEGMENTS) return QUICK_YEARS[QUICK_YEARS.length - 1];
  return Math.round(QUICK_YEARS[i] + t * (QUICK_YEARS[i + 1] - QUICK_YEARS[i]));
}

// Range input uses 0-10000 for fine precision
const SLIDER_MAX = 10000;

export default function TimelineControl({
  year,
  isPlaying,
  speed,
  yearCount,
  yearCounts,
  onYearChange,
  onTogglePlay,
  onSpeedChange,
  onStepForward,
  onStepBackward,
}: TimelineControlProps) {
  const progress = yearToProgress(year);
  const sliderValue = Math.round((progress / 100) * SLIDER_MAX);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleSliderClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onYearChange(progressToYear(pct * 100));
  }, [onYearChange]);

  const handleRangeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const pct = (val / SLIDER_MAX) * 100;
    onYearChange(progressToYear(pct));
  }, [onYearChange]);


  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative"
    >
      {/* Top line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 70%, transparent)',
        }}
      />

      <div
        className="rounded-t-lg px-3 sm:px-4 md:px-6 pt-2 sm:pt-3 pb-2 sm:pb-3"
        style={{
          background: 'rgba(5, 7, 9, 0.92)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Main row: Reverse + Play + Forward + Year + Reports */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3">
          {/* Step backward */}
          <button
            onClick={onStepBackward}
            className="group w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 flex-shrink-0"
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(10,14,18,0.6)',
            }}
            aria-label="Step backward"
            title="Step back"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" className="transition-colors text-white/50 group-hover:text-white/80 sm:w-[14px] sm:h-[14px]">
              <polygon points="8,1 1,7 8,13" fill="currentColor" />
              <rect x="10" y="2" width="2" height="10" fill="currentColor" rx="0.5" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="group w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 flex-shrink-0"
            style={{
              border: '1px solid rgba(255,255,255,0.15)',
              background: isPlaying ? 'rgba(255,255,255,0.1)' : 'rgba(10,14,18,0.6)',
              boxShadow: isPlaying ? '0 0 16px rgba(255,255,255,0.1)' : 'none',
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <AnimatePresence mode="wait">
              {isPlaying ? (
                <motion.svg key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} width="14" height="14" viewBox="0 0 14 14" className="text-white sm:w-[16px] sm:h-[16px]">
                  <rect x="2" y="1" width="3.5" height="12" fill="currentColor" rx="1" />
                  <rect x="8.5" y="1" width="3.5" height="12" fill="currentColor" rx="1" />
                </motion.svg>
              ) : (
                <motion.svg key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} width="14" height="14" viewBox="0 0 14 14" className="text-white sm:w-[16px] sm:h-[16px]">
                  <polygon points="3,1 13,7 3,13" fill="currentColor" />
                </motion.svg>
              )}
            </AnimatePresence>
          </button>

          {/* Step forward */}
          <button
            onClick={onStepForward}
            className="group w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 flex-shrink-0"
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(10,14,18,0.6)',
            }}
            aria-label="Step forward"
            title="Step forward"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" className="transition-colors text-white/50 group-hover:text-white/80 sm:w-[14px] sm:h-[14px]">
              <rect x="2" y="2" width="2" height="10" fill="currentColor" rx="0.5" />
              <polygon points="6,1 13,7 6,13" fill="currentColor" />
            </svg>
          </button>

          {/* Center: Year display */}
          <div className="flex-1 text-center min-w-0">
            <div className="flex items-center justify-center gap-1.5">
              <motion.div
                key={year}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white glow-text-white tracking-[0.15em] sm:tracking-[0.2em] font-bold"
              >
                {year}
              </motion.div>
            </div>
          </div>

          {/* Right: Report count */}
          <div className="text-right flex-shrink-0 min-w-[60px] sm:min-w-[80px]">
            <div className="text-[8px] sm:text-[9px] text-signal-muted font-display tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-0.5">
              Reports
            </div>
            <motion.div
              key={yearCount}
              initial={{ y: 4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="font-display text-lg sm:text-xl md:text-2xl text-white glow-text-white font-bold"
            >
              {formatNumber(yearCount)}
            </motion.div>
          </div>
        </div>

        {/* Slider track */}
        <div className="relative mb-1.5 sm:mb-2">
          <div
            ref={sliderRef}
            className="absolute top-1/2 left-0 w-full h-[3px] -translate-y-1/2 rounded-full cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.1)' }}
            onClick={handleSliderClick}
          >
            {/* Progress fill */}
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.7))',
                boxShadow: '0 0 10px rgba(255,255,255,0.25)',
              }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={SLIDER_MAX}
            value={sliderValue}
            onChange={handleRangeChange}
            className="timeline-slider relative z-10"
          />
        </div>

        {/* Quick-select year buttons — fewer on mobile */}
        <div className="flex justify-between items-center mb-1.5 sm:mb-2.5">
          {/* Mobile: show fewer years */}
          <div className="flex sm:hidden justify-between w-full">
            {QUICK_YEARS_MOBILE.map((y) => (
              <button
                key={y}
                onClick={() => onYearChange(y)}
                className={`text-[9px] font-display tracking-wider font-bold px-1 py-0.5 rounded transition-all duration-200 ${
                  y === year
                    ? 'text-white bg-white/15 shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                    : 'text-signal-muted hover:text-white hover:bg-white/5'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
          {/* Tablet/Desktop: show all years */}
          <div className="hidden sm:flex justify-between w-full">
            {QUICK_YEARS.map((y) => (
              <button
                key={y}
                onClick={() => onYearChange(y)}
                className={`text-[10px] md:text-[11px] font-display tracking-wider font-bold px-1.5 py-0.5 rounded transition-all duration-200 ${
                  y === year
                    ? 'text-white bg-white/15 shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                    : 'text-signal-muted hover:text-white hover:bg-white/5'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Speed controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="text-[8px] sm:text-[9px] text-signal-muted font-display tracking-[0.15em] uppercase mr-0.5 sm:mr-1">Speed</span>
          {([1, 2, 5] as PlaybackSpeed[]).map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-display tracking-wider font-bold transition-all duration-200 active:scale-95 ${
                speed === s
                  ? 'text-white'
                  : 'text-signal-muted hover:text-signal-bright'
              }`}
              style={{
                border: speed === s ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
                background: speed === s ? 'rgba(255,255,255,0.08)' : 'transparent',
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

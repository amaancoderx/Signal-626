'use client';

import { useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber } from '@/lib/utils';
import { MONTH_NAMES } from '@/lib/constants';
import type { PlaybackSpeed, YearCount, TimelineMode } from '@/lib/types';
import SignalModeToggle from './SignalModeToggle';

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
  // Signal mode props
  timelineMode: TimelineMode;
  onModeChange: (mode: TimelineMode) => void;
  signalMonth?: number; // 0-11
  signalDay?: number; // 1-31
  signalTime?: string; // "HH:MM"
  signalEventsShown?: number;
  signalTotalEvents?: number;
  signalIsComplete?: boolean;
}

const QUICK_YEARS = [1400, 1800, 1900, 1950, 1970, 1990, 2000, 2010, 2020, 2026];
const QUICK_YEARS_MOBILE = [1400, 1900, 1970, 2000, 2020, 2026];
const NUM_SEGMENTS = QUICK_YEARS.length - 1;

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

const SLIDER_MAX = 10000;
const NUM_SPARKLINE_BARS = 50;

export default function TimelineControl({
  year, isPlaying, speed, yearCount, yearCounts,
  onYearChange, onTogglePlay, onSpeedChange, onStepForward, onStepBackward,
  timelineMode, onModeChange,
  signalMonth = 0, signalDay = 1, signalTime = '', signalEventsShown = 0, signalTotalEvents = 0, signalIsComplete = false,
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

  const sparklineData = useMemo(() => {
    if (!yearCounts.length) return [];
    const barValues: number[] = [];
    const barYearRanges: [number, number][] = [];
    for (let i = 0; i < NUM_SPARKLINE_BARS; i++) {
      const yearStart = progressToYear((i / NUM_SPARKLINE_BARS) * 100);
      const yearEnd = progressToYear(((i + 1) / NUM_SPARKLINE_BARS) * 100);
      barYearRanges.push([yearStart, yearEnd]);
      const rangeCount = yearCounts
        .filter(yc => Number(yc.year) >= yearStart && Number(yc.year) < yearEnd)
        .reduce((sum, yc) => sum + Number(yc.count), 0);
      barValues.push(rangeCount);
    }
    // Use sqrt scale so smaller values remain visible against peaks
    const sqrtValues = barValues.map(v => Math.sqrt(v));
    const maxSqrt = Math.max(...sqrtValues, 1);
    return sqrtValues.map((sv, i) => ({
      height: Math.max((sv / maxSqrt) * 100, barValues[i] > 0 ? 4 : 0),
      isActive: year >= barYearRanges[i][0] && year <= barYearRanges[i][1],
    }));
  }, [yearCounts, year]);

  // Status text
  const isSignal = timelineMode === 'signal';
  const statusText = isSignal
    ? (isPlaying ? 'SIGNAL REPLAY ACTIVE' : (signalIsComplete ? 'SIGNAL REPLAY COMPLETE' : 'SIGNAL REPLAY MODE'))
    : (isPlaying ? 'TEMPORAL SCAN ACTIVE' : 'HISTORICAL REPLAY MODE');
  const signalProgressPct = signalTotalEvents > 0 ? (signalEventsShown / signalTotalEvents) * 100 : 0;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative"
    >
      {/* Top neon line */}
      <div className="neon-line absolute top-0 left-0 right-0" />
      <div className="neon-line-glow absolute -top-px left-0 right-0" />

      <div
        className="px-3 sm:px-4 md:px-6 pt-2 sm:pt-2.5 pb-2 sm:pb-2.5"
        // iOS safe area handled via extra padding below
        style={{
          background: 'linear-gradient(0deg, rgba(5,10,20,0.95) 0%, rgba(5,10,20,0.90) 100%)',
          backdropFilter: 'blur(32px)',
          borderTop: '1px solid rgba(0,229,255,0.08)',
        }}
      >
        {/* ── Mode toggle + status label ── */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1.5">
          <SignalModeToggle mode={timelineMode} onModeChange={onModeChange} />
          <span
            className="text-[7px] sm:text-[9px] font-display tracking-[0.2em] sm:tracking-[0.3em] font-bold animate-glow-breathe truncate max-w-[140px] sm:max-w-none"
            style={{ color: isSignal ? 'rgba(0,255,156,0.4)' : 'rgba(0,229,255,0.4)' }}
          >
            {statusText}
          </span>
        </div>

        {/* ── Signal replay progress bar ── */}
        {isSignal && (
          <div className="mb-2">
            {/* Top row: title + event counter */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-display tracking-[0.2em] font-bold" style={{ color: '#00FF9C', textShadow: '0 0 6px rgba(0,255,156,0.4)' }}>
                SIGNAL REPLAY — YEAR {year}
              </span>
              <span className="text-[9px] font-mono text-signal-muted">
                {formatNumber(signalEventsShown)} / {formatNumber(signalTotalEvents)}
              </span>
            </div>
            {/* Progress bar row */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,255,156,0.08)' }}>
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${signalProgressPct}%` }}
                  transition={{ duration: 0.3, ease: 'linear' }}
                  style={{
                    background: 'linear-gradient(90deg, rgba(0,255,156,0.4), rgba(0,255,156,0.9))',
                    boxShadow: '0 0 8px rgba(0,255,156,0.4)',
                  }}
                />
              </div>
              <span className="text-[9px] font-mono text-signal-muted">
                {String(signalMonth + 1).padStart(2, '0')}/12
              </span>
            </div>
            {/* Date/time row: MONTH DAY, TIME */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2">
                <motion.span
                  key={signalMonth}
                  initial={{ y: 4, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-[10px] font-display tracking-[0.15em] font-bold"
                  style={{ color: '#00FF9C', textShadow: '0 0 6px rgba(0,255,156,0.4)' }}
                >
                  {MONTH_NAMES[signalMonth]}
                </motion.span>
                <motion.span
                  key={`${signalMonth}-${signalDay}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[10px] font-mono font-bold text-signal-cyan"
                >
                  {String(signalDay).padStart(2, '0')}
                </motion.span>
                {signalTime && (
                  <>
                    <span className="text-[8px] text-signal-muted/40 mx-0.5">|</span>
                    <motion.span
                      key={signalTime}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] font-mono text-signal-cyan/70"
                    >
                      {signalTime}
                    </motion.span>
                  </>
                )}
              </div>
              <span className="text-[8px] font-display tracking-[0.2em] text-signal-muted/40 uppercase">
                {signalIsComplete ? 'COMPLETE' : isPlaying ? 'REPLAYING' : 'PAUSED'}
              </span>
            </div>
          </div>
        )}

        {/* ── Row 1: Controls + Year + Report Count ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-1.5 sm:mb-2">
          {/* Step backward */}
          <button onClick={onStepBackward}
            className="group w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 flex-shrink-0"
            style={{ border: '1px solid rgba(0,229,255,0.12)', background: 'rgba(13,21,48,0.5)' }}
            aria-label="Step backward">
            <svg width="12" height="12" viewBox="0 0 14 14" className="transition-colors text-signal-muted group-hover:text-signal-cyan sm:w-[14px] sm:h-[14px]">
              <polygon points="8,1 1,7 8,13" fill="currentColor" />
              <rect x="10" y="2" width="2" height="10" fill="currentColor" rx="0.5" />
            </svg>
          </button>

          {/* Play/Pause — circular glowing button */}
          <button onClick={onTogglePlay}
            className="relative group w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 flex-shrink-0"
            style={{
              border: isPlaying ? '2px solid rgba(0,229,255,0.5)' : '2px solid rgba(0,229,255,0.15)',
              background: isPlaying ? 'rgba(0,229,255,0.08)' : 'rgba(13,21,48,0.5)',
              boxShadow: isPlaying ? '0 0 24px rgba(0,229,255,0.2), inset 0 0 12px rgba(0,229,255,0.05)' : 'none',
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}>
            {/* Radar ripple when pressed */}
            {isPlaying && <div className="absolute inset-0 rounded-full border border-signal-cyan/20 animate-ping" style={{ animationDuration: '2s' }} />}
            <AnimatePresence mode="wait">
              {isPlaying ? (
                <motion.svg key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} width="14" height="14" viewBox="0 0 14 14" className="text-signal-cyan sm:w-[16px] sm:h-[16px] relative z-10">
                  <rect x="2" y="1" width="3.5" height="12" fill="currentColor" rx="1" />
                  <rect x="8.5" y="1" width="3.5" height="12" fill="currentColor" rx="1" />
                </motion.svg>
              ) : (
                <motion.svg key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} width="14" height="14" viewBox="0 0 14 14" className="text-signal-cyan sm:w-[16px] sm:h-[16px] relative z-10">
                  <polygon points="3,1 13,7 3,13" fill="currentColor" />
                </motion.svg>
              )}
            </AnimatePresence>
          </button>

          {/* Step forward */}
          <button onClick={onStepForward}
            className="group w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 flex-shrink-0"
            style={{ border: '1px solid rgba(0,229,255,0.12)', background: 'rgba(13,21,48,0.5)' }}
            aria-label="Step forward">
            <svg width="12" height="12" viewBox="0 0 14 14" className="transition-colors text-signal-muted group-hover:text-signal-cyan sm:w-[14px] sm:h-[14px]">
              <rect x="2" y="2" width="2" height="10" fill="currentColor" rx="0.5" />
              <polygon points="6,1 13,7 6,13" fill="currentColor" />
            </svg>
          </button>

          {/* Center: Large glowing year display */}
          <div className="flex-1 text-center min-w-0 pl-6 sm:pl-12 md:pl-20">
            <motion.div
              key={year}
              initial={{ y: 8, opacity: 0, filter: 'blur(4px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0)' }}
              transition={{ duration: 0.2 }}
              className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-signal-cyan tracking-[0.15em] sm:tracking-[0.2em] font-bold"
              style={{ textShadow: '0 0 20px rgba(0,229,255,0.6), 0 0 40px rgba(0,229,255,0.3), 0 0 80px rgba(0,229,255,0.1)' }}
            >
              {year}
            </motion.div>
          </div>

          {/* Right: Speed + Report count */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Speed controls — holographic chips */}
            <div className="hidden sm:flex items-center gap-1">
              {([1, 2, 5] as PlaybackSpeed[]).map((s) => (
                <button key={s} onClick={() => onSpeedChange(s)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-display tracking-wider font-bold transition-all duration-200 active:scale-95 ${
                    speed === s ? 'text-signal-cyan' : 'text-signal-muted hover:text-signal-cyan/70'
                  }`}
                  style={{
                    border: speed === s ? '1px solid rgba(0,229,255,0.3)' : '1px solid rgba(0,229,255,0.08)',
                    background: speed === s ? 'rgba(0,229,255,0.08)' : 'transparent',
                    boxShadow: speed === s ? '0 0 10px rgba(0,229,255,0.1), inset 0 0 8px rgba(0,229,255,0.03)' : 'none',
                  }}>
                  {s}x
                </button>
              ))}
            </div>

            <div className="hidden sm:block w-px h-8 bg-gradient-to-b from-transparent via-signal-cyan/20 to-transparent" />

            {/* Report count */}
            <div className="text-right min-w-[50px] sm:min-w-[70px]">
              <div className="text-[8px] sm:text-[9px] text-signal-cyan/40 font-display tracking-[0.15em] uppercase">Reports</div>
              <motion.div key={yearCount} initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.15 }} className="hud-value text-base sm:text-lg md:text-xl">
                {formatNumber(yearCount)}
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── Sparkline histogram ── */}
        {sparklineData.length > 0 && (
          <div className="relative h-10 sm:h-12 mb-0.5 flex items-end gap-px opacity-90">
            {sparklineData.map((bar, i) => (
              <div key={i}
                className={`sparkline-bar ${bar.isActive ? 'sparkline-bar-active' : 'sparkline-bar-inactive'}`}
                style={{ height: `${bar.height}%` }}
              />
            ))}
          </div>
        )}

        {/* ── Slider track — neon glowing ── */}
        <div className="relative mb-1 sm:mb-1.5">
          <div ref={sliderRef}
            className="absolute top-1/2 left-0 w-full h-[3px] -translate-y-1/2 rounded-full cursor-pointer"
            style={{ background: 'rgba(0,229,255,0.08)' }}
            onClick={handleSliderClick}>
            <div className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, rgba(0,229,255,0.1), rgba(0,229,255,0.6))',
                boxShadow: '0 0 8px rgba(0,229,255,0.3)',
              }} />
            {/* Animated pulse on track */}
            <div className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full pointer-events-none"
              style={{
                left: `${progress}%`,
                width: '40px',
                marginLeft: '-20px',
                background: 'radial-gradient(circle, rgba(0,229,255,0.4) 0%, transparent 70%)',
                animation: 'pulseTrack 2s ease-in-out infinite',
              }} />
          </div>
          <input type="range" min={0} max={SLIDER_MAX} value={sliderValue}
            onChange={handleRangeChange} className="timeline-slider relative z-10" />
        </div>

        {/* ── Quick-select year labels ── */}
        <div className="flex justify-between items-center mb-0.5 sm:mb-1">
          <div className="flex sm:hidden justify-between w-full">
            {QUICK_YEARS_MOBILE.map((y) => (
              <button key={y} onClick={() => onYearChange(y)}
                className={`text-[9px] font-display tracking-wider font-bold px-1.5 py-1.5 rounded transition-all duration-200 min-h-[28px] ${
                  y === year ? 'text-signal-cyan glow-text-cyan' : 'text-signal-muted hover:text-signal-cyan/70'
                }`}
                style={y === year ? { background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)' } : { border: '1px solid transparent' }}>
                {y}
              </button>
            ))}
          </div>
          <div className="hidden sm:flex justify-between w-full">
            {QUICK_YEARS.map((y) => (
              <button key={y} onClick={() => onYearChange(y)}
                className={`text-[10px] md:text-[11px] font-display tracking-wider font-bold px-1.5 py-0.5 rounded transition-all duration-200 ${
                  y === year ? 'text-signal-cyan glow-text-cyan' : 'text-signal-muted hover:text-signal-cyan/70'
                }`}
                style={y === year ? { background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)' } : { border: '1px solid transparent' }}>
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* ── Mobile speed controls ── */}
        <div className="flex sm:hidden items-center gap-1.5 mt-0.5">
          <span className="text-[8px] text-signal-cyan/40 font-display tracking-[0.15em] uppercase mr-1">Speed</span>
          {([1, 2, 5] as PlaybackSpeed[]).map((s) => (
            <button key={s} onClick={() => onSpeedChange(s)}
              className={`px-3 py-1.5 rounded text-[10px] font-display tracking-wider font-bold transition-all min-w-[36px] min-h-[32px] ${
                speed === s ? 'text-signal-cyan' : 'text-signal-muted'
              }`}
              style={{
                border: speed === s ? '1px solid rgba(0,229,255,0.25)' : '1px solid transparent',
                background: speed === s ? 'rgba(0,229,255,0.06)' : 'transparent',
              }}>
              {s}x
            </button>
          ))}
        </div>

        {/* iOS safe area spacer */}
        <div className="pb-safe" />
      </div>
    </motion.div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { formatNumber } from '@/lib/utils';
import Image from 'next/image';

interface StatsHUDProps {
  totalReports: number;
  currentYear: number;
  yearReports: number;
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlay?: () => void;
}

export default function StatsHUD({
  totalReports,
  currentYear,
  isPlaying,
  isLoading,
  onTogglePlay,
}: StatsHUDProps) {
  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, type: 'spring', damping: 20 }}
      className="relative"
    >
      <div
        className="px-3 sm:px-4 md:px-8 py-2.5 sm:py-3 md:py-4 overflow-visible"
        style={{
          background: 'rgba(5, 7, 9, 0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="flex items-center justify-between">
          {/* Left stats */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-8">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-[8px] sm:text-[9px] font-display tracking-[0.15em] sm:tracking-[0.2em] text-signal-muted uppercase">
                Reports
              </span>
              <span className="font-display text-sm sm:text-base md:text-lg font-bold text-white glow-text-white tracking-wider">
                {formatNumber(totalReports)}
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-[8px] sm:text-[9px] font-display tracking-[0.15em] sm:tracking-[0.2em] text-signal-muted uppercase">
                Year
              </span>
              <span className="font-display text-sm sm:text-base md:text-lg font-bold text-white glow-text-white tracking-wider">
                {currentYear}
              </span>
            </div>
          </div>

          {/* Center - Logo with decorative lines — hidden on very narrow screens */}
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center z-10 hidden min-[400px]:flex">
            {/* Decorative line left */}
            <div
              className="hidden md:block w-16 h-px mr-3"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3))' }}
            />
            <div className="relative w-[44px] h-[44px] sm:w-[60px] sm:h-[60px] md:w-[88px] md:h-[88px] flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Signal 626"
                fill
                className="object-contain"
                style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.4)) brightness(1.2)' }}
                priority
              />
            </div>
            {/* Decorative line right */}
            <div
              className="hidden md:block w-16 h-px ml-3"
              style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.3), transparent)' }}
            />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
            {/* Title text - tablet and desktop only */}
            <div className="hidden lg:flex flex-col items-center">
              <span
                className="font-display text-base md:text-lg font-bold tracking-wider"
                style={{ color: '#F0F4F8', textShadow: '0 0 10px rgba(255,255,255,0.35), 0 0 30px rgba(255,255,255,0.12)' }}
              >
                Reported UFO Sightings
              </span>
              <span
                className="font-display text-sm font-bold tracking-wider"
                style={{ color: '#D8E2EC', textShadow: '0 0 8px rgba(255,255,255,0.25)' }}
              >
                1400 - 2026
              </span>
            </div>
            {/* Pause/Play */}
            {onTogglePlay && (
              <button
                onClick={onTogglePlay}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center
                           hover:bg-white/10 transition-all border border-transparent hover:border-white/15
                           active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg width="12" height="12" viewBox="0 0 14 14" className="text-white sm:w-[14px] sm:h-[14px]">
                    <rect x="2" y="1" width="3.5" height="12" fill="currentColor" rx="1" />
                    <rect x="8.5" y="1" width="3.5" height="12" fill="currentColor" rx="1" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 14 14" className="text-signal-muted sm:w-[14px] sm:h-[14px]">
                    <polygon points="2,1 13,7 2,13" fill="currentColor" />
                  </svg>
                )}
              </button>
            )}

            {/* Status dot */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                  isLoading
                    ? 'bg-signal-amber animate-pulse'
                    : isPlaying
                    ? 'bg-white animate-pulse'
                    : 'bg-white/30'
                }`}
                style={{
                  boxShadow: isPlaying
                    ? '0 0 8px rgba(255,255,255,0.6)'
                    : isLoading
                    ? '0 0 8px rgba(255,184,0,0.6)'
                    : 'none',
                }}
              />
              <span
                className={`text-[9px] sm:text-[10px] font-display tracking-wider font-bold ${
                  isLoading
                    ? 'text-signal-amber'
                    : isPlaying
                    ? 'text-white'
                    : 'text-signal-muted'
                }`}
              >
                {isLoading ? 'SCAN' : isPlaying ? 'LIVE' : 'IDLE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom line with subtle glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18) 25%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.18) 75%, transparent)',
        }}
      />
      <div
        className="absolute -bottom-px left-0 right-0 h-[3px]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%, transparent)',
          filter: 'blur(2px)',
        }}
      />
    </motion.div>
  );
}

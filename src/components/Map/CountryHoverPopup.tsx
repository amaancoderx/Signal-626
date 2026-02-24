'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber } from '@/lib/utils';
import type { AnomalyLevel } from '@/lib/intelligence';

export interface CountryHoverData {
  code: string;
  name: string;
  x: number;
  y: number;
}

interface CountryHoverPopupProps {
  hover: CountryHoverData | null;
  totalReports: number;
  anomalyScore: number;
  anomalyLevel: AnomalyLevel;
  onOpenIntelligence: (code: string) => void;
}

const LEVEL_COLORS: Record<AnomalyLevel, string> = {
  LOW: '#00E5FF',
  MEDIUM: '#FFB300',
  HIGH: '#00ff9c',
  CRITICAL: '#FF3355',
};

export default function CountryHoverPopup({
  hover,
  totalReports,
  anomalyScore,
  anomalyLevel,
  onOpenIntelligence,
}: CountryHoverPopupProps) {
  const color = LEVEL_COLORS[anomalyLevel];

  // Position: offset from cursor, clamped to viewport
  const popupWidth = 260;
  const popupHeight = 180;
  const offsetX = 18;
  const offsetY = -20;

  let left = (hover?.x ?? 0) + offsetX;
  let top = (hover?.y ?? 0) + offsetY;

  // Clamp to viewport bounds
  if (typeof window !== 'undefined' && hover) {
    if (left + popupWidth > window.innerWidth - 12) {
      left = hover.x - popupWidth - offsetX;
    }
    if (top + popupHeight > window.innerHeight - 12) {
      top = window.innerHeight - popupHeight - 12;
    }
    if (top < 12) top = 12;
    if (left < 12) left = 12;
  }

  return (
    <AnimatePresence>
      {hover && (
        <motion.div
          key={hover.code}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed z-[2500] pointer-events-auto"
          style={{ left, top, width: popupWidth }}
          onMouseLeave={(e) => {
            // Allow pointer events for the CTA button but prevent flicker
            e.stopPropagation();
          }}
        >
          {/* Outer glow */}
          <div
            className="absolute -inset-[1px] rounded-xl opacity-60"
            style={{
              background: `linear-gradient(135deg, ${color}30, rgba(0,229,255,0.15), ${color}20)`,
              filter: 'blur(8px)',
            }}
          />

          {/* Main card */}
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(8,14,32,0.96), rgba(5,10,24,0.98))',
              border: `1px solid ${color}35`,
              backdropFilter: 'blur(24px)',
              boxShadow: `0 4px 30px rgba(0,0,0,0.6), 0 0 20px ${color}15, inset 0 1px 0 rgba(0,229,255,0.08)`,
            }}
          >
            {/* Scanline */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,229,255,0.01) 3px, rgba(0,229,255,0.01) 4px)',
              }}
            />

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-3 h-3 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-px" style={{ background: color }} />
              <div className="absolute top-0 left-0 h-full w-px" style={{ background: color }} />
            </div>
            <div className="absolute top-0 right-0 w-3 h-3 pointer-events-none">
              <div className="absolute top-0 right-0 w-full h-px" style={{ background: color }} />
              <div className="absolute top-0 right-0 h-full w-px" style={{ background: color }} />
            </div>
            <div className="absolute bottom-0 left-0 w-3 h-3 pointer-events-none">
              <div className="absolute bottom-0 left-0 w-full h-px" style={{ background: color }} />
              <div className="absolute bottom-0 left-0 h-full w-px" style={{ background: color }} />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none">
              <div className="absolute bottom-0 right-0 w-full h-px" style={{ background: color }} />
              <div className="absolute bottom-0 right-0 h-full w-px" style={{ background: color }} />
            </div>

            <div className="relative p-3.5">
              {/* Header: classified label + country name */}
              <div className="flex items-center gap-2 mb-2.5">
                <div className="relative w-2.5 h-2.5 flex-shrink-0">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                  />
                  <div
                    className="absolute -inset-1 rounded-full border animate-ping"
                    style={{ borderColor: `${color}40`, animationDuration: '2s' }}
                  />
                </div>
                <span
                  className="text-[8px] font-display tracking-[0.3em] font-bold uppercase"
                  style={{ color: `${color}90` }}
                >
                  INTEL PREVIEW
                </span>
              </div>

              {/* Country name */}
              <h3
                className="font-display text-base font-bold tracking-[0.1em] text-signal-bright mb-3 leading-tight"
                style={{ textShadow: '0 0 12px rgba(0,229,255,0.2)' }}
              >
                {hover.name.toUpperCase()}
              </h3>

              {/* Stats row */}
              <div className="flex items-center gap-3 mb-3">
                {/* Reports */}
                <div className="flex-1">
                  <div className="text-[7px] font-display tracking-[0.2em] text-signal-cyan/40 uppercase mb-0.5">
                    REPORTS
                  </div>
                  <div className="font-display text-lg font-bold text-signal-cyan" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>
                    {formatNumber(totalReports)}
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-gradient-to-b from-transparent via-signal-cyan/20 to-transparent" />

                {/* Risk Index */}
                <div className="flex-1">
                  <div className="text-[7px] font-display tracking-[0.2em] text-signal-cyan/40 uppercase mb-0.5">
                    RISK INDEX
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-lg font-bold" style={{ color, textShadow: `0 0 10px ${color}60` }}>
                      {anomalyScore}
                    </span>
                    <span
                      className="text-[8px] font-display tracking-[0.15em] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color,
                        background: `${color}12`,
                        border: `1px solid ${color}25`,
                      }}
                    >
                      {anomalyLevel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk gauge bar */}
              <div className="h-1 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(0,229,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, anomalyScore)}%`,
                    background: `linear-gradient(90deg, ${color}60, ${color})`,
                    boxShadow: `0 0 6px ${color}60`,
                  }}
                />
              </div>

              {/* CTA button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenIntelligence(hover.code);
                }}
                className="w-full py-2 rounded-lg font-display text-[9px] tracking-[0.25em] font-bold uppercase transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  color: '#00E5FF',
                  background: 'rgba(0,229,255,0.06)',
                  border: '1px solid rgba(0,229,255,0.2)',
                  boxShadow: '0 0 12px rgba(0,229,255,0.08), inset 0 1px 0 rgba(0,229,255,0.06)',
                  textShadow: '0 0 8px rgba(0,229,255,0.5)',
                }}
              >
                OPEN INTELLIGENCE PANEL
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

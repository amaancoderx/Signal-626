'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber } from '@/lib/utils';
import { getShapeColor } from '@/lib/constants';
import { getCountryByCode } from '@/lib/countries';
import type { MapPoint } from '@/lib/types';

interface StatsPanelProps {
  points: MapPoint[];
  yearCount: number;
  year: number;
  selectedCountry: string;
  isLoading: boolean;
}

export default function StatsPanel({
  points,
  yearCount,
  year,
  selectedCountry,
  isLoading,
}: StatsPanelProps) {
  // Compute top shapes from current points
  const topShapes = useMemo(() => {
    if (!points.length) return [];
    const counts: Record<string, number> = {};
    for (const p of points) {
      const shape = p.shape || 'Unknown';
      counts[shape] = (counts[shape] || 0) + 1;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
      .map(([shape, count]) => ({
        shape,
        count,
        pct: Math.round((count / points.length) * 100),
      }));
  }, [points]);

  const maxShapeCount = topShapes.length > 0 ? topShapes[0].count : 1;
  const countryName = getCountryByCode(selectedCountry)?.name?.toUpperCase() || selectedCountry;

  return (
    <AnimatePresence>
      {selectedCountry !== 'World' && (
        <motion.div
          initial={{ x: 60, opacity: 0, scale: 0.95 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 60, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="stats-panel p-4 sm:p-5 w-56 sm:w-64"
        >
          {/* Header */}
          <div className="bracket-header mb-1">REGION INTEL</div>
          <div className="neon-line mb-4" />

          {/* Country name */}
          <div className="text-xs font-display tracking-[0.15em] text-signal-cyan/50 mb-1">
            {countryName}
          </div>

          {/* Big sighting count */}
          <div className="mb-4">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-signal-cyan/20 border-t-signal-cyan rounded-full animate-spin" />
                <span className="text-xs text-signal-muted">Scanning...</span>
              </div>
            ) : (
              <>
                <motion.div
                  key={yearCount}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="hud-value text-2xl sm:text-3xl"
                >
                  {formatNumber(yearCount)}
                </motion.div>
                <div className="text-[10px] text-signal-muted mt-1 font-display tracking-wider">
                  SIGHTINGS IN {year}
                </div>
              </>
            )}
          </div>

          <div className="neon-line mb-4" />

          {/* Top shapes */}
          <div className="bracket-header mb-3">TOP SHAPES</div>

          {topShapes.length === 0 && !isLoading && (
            <div className="text-xs text-signal-muted">No data available</div>
          )}

          <div className="space-y-2.5">
            {topShapes.map(({ shape, count, pct }) => {
              const color = getShapeColor(shape);
              return (
                <div key={shape}>
                  {/* Shape row */}
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: color,
                        boxShadow: `0 0 6px ${color}`,
                      }}
                    />
                    <span className="text-xs text-signal-bright flex-1 truncate">{shape}</span>
                    <span className="text-[10px] text-signal-cyan font-mono">{formatNumber(count)}</span>
                    <span className="text-[9px] text-signal-muted w-7 text-right">{pct}%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="stats-bar ml-4">
                    <div
                      className="stats-bar-fill"
                      style={{
                        width: `${(count / maxShapeCount) * 100}%`,
                        background: color,
                        boxShadow: `0 0 4px ${color}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total points indicator */}
          {points.length > 0 && (
            <>
              <div className="neon-line mt-4 mb-3" />
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-signal-muted font-display tracking-wider">DATA POINTS</span>
                <span className="text-xs text-signal-cyan font-mono">{formatNumber(points.length)}</span>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber } from '@/lib/utils';
import { getShapeColor } from '@/lib/constants';
import { getCountryByCode } from '@/lib/countries';
import { buildIntelligenceReport } from '@/lib/intelligence';
import type { IntelligenceReport, AnomalyLevel } from '@/lib/intelligence';
import type { MapPoint, YearCount } from '@/lib/types';

interface IntelligencePanelProps {
  points: MapPoint[];
  yearCount: number;
  year: number;
  selectedCountry: string;
  yearCounts: YearCount[];
  isLoading: boolean;
  onClose: () => void;
}

/* ═══════════════════════ ANIMATED COUNTER ═══════════════════════ */
function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    const duration = 600;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        ref.current = value;
      }
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <span className={className}>{formatNumber(display)}</span>;
}

/* ═══════════════════════ TREND LINE CHART ═══════════════════════ */
function TrendChart({ data }: { data: { year: number; count: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const cw = w / 2;
    const ch = h / 2;

    ctx.clearRect(0, 0, cw, ch);

    // Only show last ~60 years for readability
    const recent = data.filter(d => d.year >= 1960);
    if (recent.length < 2) return;

    const maxCount = Math.max(...recent.map(d => d.count), 1);
    const padding = { top: 8, bottom: 16, left: 4, right: 4 };
    const plotW = cw - padding.left - padding.right;
    const plotH = ch - padding.top - padding.bottom;

    const getX = (i: number) => padding.left + (i / (recent.length - 1)) * plotW;
    const getY = (count: number) => padding.top + plotH - (count / maxCount) * plotH;

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, ch);
    gradient.addColorStop(0, 'rgba(0, 229, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 229, 255, 0.0)');

    ctx.beginPath();
    ctx.moveTo(getX(0), ch - padding.bottom);
    for (let i = 0; i < recent.length; i++) {
      ctx.lineTo(getX(i), getY(recent[i].count));
    }
    ctx.lineTo(getX(recent.length - 1), ch - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(recent[0].count));
    for (let i = 1; i < recent.length; i++) {
      ctx.lineTo(getX(i), getY(recent[i].count));
    }
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0, 229, 255, 0.5)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Year labels
    ctx.fillStyle = 'rgba(74, 106, 138, 0.8)';
    ctx.font = '8px Rajdhani';
    ctx.textAlign = 'center';
    const labelInterval = Math.ceil(recent.length / 5);
    for (let i = 0; i < recent.length; i += labelInterval) {
      ctx.fillText(String(recent[i].year), getX(i), ch - 2);
    }
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: '80px' }}
    />
  );
}

/* ═══════════════════════ MONTHLY RADIAL CHART ═══════════════════════ */
function MonthlyRadialChart({ data }: { data: { label: string; count: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = Math.min(canvas.offsetWidth, canvas.offsetHeight);
    canvas.width = size * 2;
    canvas.height = size * 2;
    ctx.scale(2, 2);
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2 - 20;
    const minR = maxR * 0.3;

    ctx.clearRect(0, 0, size, size);

    const maxCount = Math.max(...data.map(d => d.count), 1);
    const sliceAngle = (Math.PI * 2) / 12;

    // Draw arcs
    for (let i = 0; i < 12; i++) {
      const startAngle = i * sliceAngle - Math.PI / 2;
      const endAngle = startAngle + sliceAngle - 0.02;
      const ratio = data[i].count / maxCount;
      const r = minR + ratio * (maxR - minR);

      const gradient = ctx.createRadialGradient(cx, cy, minR, cx, cy, r);
      gradient.addColorStop(0, 'rgba(0, 229, 255, 0.05)');
      gradient.addColorStop(1, `rgba(0, 229, 255, ${0.1 + ratio * 0.4})`);

      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.arc(cx, cy, minR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.strokeStyle = `rgba(0, 229, 255, ${0.2 + ratio * 0.5})`;
      ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(0, 229, 255, 0.3)';
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Month label
      const labelAngle = startAngle + sliceAngle / 2;
      const labelR = maxR + 12;
      const lx = cx + Math.cos(labelAngle) * labelR;
      const ly = cy + Math.sin(labelAngle) * labelR;
      ctx.fillStyle = ratio > 0.5 ? 'rgba(0, 229, 255, 0.8)' : 'rgba(74, 106, 138, 0.7)';
      ctx.font = '7px Rajdhani';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data[i].label, lx, ly);
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, minR - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5, 10, 20, 0.8)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full aspect-square max-w-[160px] mx-auto"
    />
  );
}

/* ═══════════════════════ ANOMALY GAUGE ═══════════════════════ */
function AnomalyGauge({ level, score }: { level: AnomalyLevel; score: number }) {
  const colors: Record<AnomalyLevel, string> = {
    LOW: '#00E5FF',
    MEDIUM: '#FFB300',
    HIGH: '#00ff9c',
    CRITICAL: '#FF3355',
  };
  const color = colors[level];
  const clampedScore = Math.min(100, Math.max(0, score));

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Gauge bar */}
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,229,255,0.08)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedScore}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{
            background: color,
            boxShadow: `0 0 8px ${color}, 0 0 20px ${color}40`,
          }}
        />
      </div>
      {/* Label */}
      <div className="flex items-center justify-between w-full">
        <span
          className="text-xs font-display tracking-[0.15em] font-bold"
          style={{ color, textShadow: `0 0 8px ${color}60` }}
        >
          {level}
        </span>
        <span className="text-[10px] text-signal-muted font-mono">{clampedScore}%</span>
      </div>
    </div>
  );
}

/* ═══════════════════════ HOTSPOT BAR ═══════════════════════ */
function HotspotBar({ name, count, percentage, maxCount, index }: {
  name: string;
  count: number;
  percentage: number;
  maxCount: number;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-signal-bright truncate flex-1 mr-2">{name}</span>
        <span className="text-[10px] text-signal-cyan font-mono">{count}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,229,255,0.08)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(count / maxCount) * 100}%` }}
          transition={{ duration: 0.8, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, rgba(0,229,255,0.4), rgba(0,229,255,0.8))',
            boxShadow: `0 0 6px rgba(0,229,255,${0.2 + (count / maxCount) * 0.4})`,
          }}
        />
      </div>
    </motion.div>
  );
}

/* ═══════════════════════ SECTION DIVIDER ═══════════════════════ */
function SectionDivider() {
  return (
    <div className="my-4">
      <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.3), transparent)' }} />
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-display tracking-[0.25em] text-signal-cyan/50 uppercase mb-2 flex items-center gap-2">
      <span className="text-signal-cyan/30">[</span>
      {children}
      <span className="text-signal-cyan/30">]</span>
    </div>
  );
}

/* ═══════════════════════ MAIN PANEL ═══════════════════════ */
export default function IntelligencePanel({
  points,
  yearCount,
  year,
  selectedCountry,
  yearCounts,
  isLoading,
  onClose,
}: IntelligencePanelProps) {
  const country = getCountryByCode(selectedCountry);

  const report = useMemo<IntelligenceReport | null>(() => {
    if (!country || selectedCountry === 'World') return null;
    return buildIntelligenceReport(
      country.code,
      country.name,
      year,
      points,
      yearCounts,
      country.bounds
    );
  }, [country, selectedCountry, year, points, yearCounts]);

  // Use country-filtered shapes from the report (not global points)
  const topShapes = report?.topShapes ?? [];

  const hasData = report && report.totalYear > 0;
  const maxShapeCount = topShapes.length > 0 ? topShapes[0].count : 1;

  return (
    <AnimatePresence>
      {selectedCountry !== 'World' && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed top-0 right-0 h-full w-full sm:w-[380px] md:w-[400px] z-[1800] overflow-y-auto overscroll-contain"
          style={{
            background: 'linear-gradient(180deg, rgba(8,14,28,0.96) 0%, rgba(5,10,20,0.98) 100%)',
            backdropFilter: 'blur(32px)',
            borderLeft: '1px solid rgba(0,229,255,0.12)',
            boxShadow: '-10px 0 60px rgba(0,0,0,0.6), -5px 0 30px rgba(0,229,255,0.04)',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all z-10 group active:scale-95"
            style={{ border: '1px solid rgba(0,229,255,0.15)', background: 'rgba(13,21,48,0.6)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-signal-muted group-hover:text-signal-red transition-colors">
              <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <div className="p-5 pt-14 sm:p-6 sm:pt-14 pb-safe">
            {/* ═══════ SECTION 1: HEADER ═══════ */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                {/* Radar pulse icon */}
                <div className="relative w-5 h-5 flex-shrink-0">
                  <div className="absolute inset-0 rounded-full border border-signal-cyan/40 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-1 rounded-full bg-signal-cyan/30" />
                  <div className="absolute inset-[6px] rounded-full bg-signal-cyan" style={{ boxShadow: '0 0 6px rgba(0,229,255,0.8)' }} />
                </div>
                <span className="text-[10px] font-display tracking-[0.25em] text-signal-cyan glow-text-cyan font-bold">
                  INTELLIGENCE REPORT
                </span>
              </div>

              {/* Country name - large glowing */}
              <h2
                className="font-display text-2xl sm:text-3xl font-bold tracking-[0.1em] text-signal-bright mb-2"
                style={{ textShadow: '0 0 20px rgba(0,229,255,0.3), 0 0 40px rgba(0,229,255,0.1)' }}
              >
                {country?.name?.toUpperCase() || selectedCountry}
              </h2>

              {/* Year label */}
              <span className="text-xs font-display tracking-[0.2em] text-signal-cyan/50">
                YEAR {year}
              </span>

              {/* Big animated count */}
              <div className="mt-3">
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-signal-cyan/20 border-t-signal-cyan rounded-full animate-spin" />
                    <span className="text-xs text-signal-muted font-display tracking-widest">SCANNING...</span>
                  </div>
                ) : (
                  <div>
                    <AnimatedCounter
                      value={report?.totalYear ?? 0}
                      className="font-display text-4xl sm:text-5xl font-bold text-signal-green"
                    />
                    <div
                      className="text-[10px] text-signal-muted mt-1 font-display tracking-[0.15em]"
                      style={{ textShadow: '0 0 4px rgba(0,255,156,0.2)' }}
                    >
                      SIGHTINGS DETECTED
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* NO SIGNAL state */}
            {!isLoading && !hasData && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div
                  className="font-display text-2xl text-signal-red/80 tracking-[0.2em] mb-3 animate-pulse"
                  style={{ textShadow: '0 0 20px rgba(255,51,85,0.4)' }}
                >
                  NO SIGNAL DETECTED
                </div>
                <p className="text-sm text-signal-muted">No sightings recorded in {year} for this region</p>
              </motion.div>
            )}

            {/* Data sections - only show if we have data */}
            {!isLoading && hasData && report && (
              <>
                {/* ═══════ SECTION 2: ACTIVITY TREND ═══════ */}
                {report.yearlyTrend.length > 2 && (
                  <>
                    <SectionDivider />
                    <SectionHeader>GLOBAL ACTIVITY TREND</SectionHeader>
                    <TrendChart data={report.yearlyTrend} />
                    <div className="text-[8px] text-signal-muted/50 font-mono mt-1 tracking-wider">WORLDWIDE SIGHTING ACTIVITY (1960–PRESENT)</div>
                  </>
                )}

                {/* ═══════ SECTION 3: MONTHLY DISTRIBUTION ═══════ */}
                {report.monthlyDistribution.some(m => m.count > 0) && (
                  <>
                    <SectionDivider />
                    <SectionHeader>MONTHLY DISTRIBUTION</SectionHeader>
                    <div className="flex items-start gap-4">
                      <MonthlyRadialChart data={report.monthlyDistribution} />
                      {report.peakMonth && (
                        <div className="flex-1 pt-4">
                          <div className="text-[9px] text-signal-muted font-display tracking-widest mb-1">PEAK MONTH</div>
                          <div className="text-lg font-display text-signal-cyan font-bold tracking-wider glow-text-cyan">
                            {report.peakMonth.toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ═══════ TOP SHAPES ═══════ */}
                {topShapes.length > 0 && (
                  <>
                    <SectionDivider />
                    <SectionHeader>TOP SHAPES</SectionHeader>
                    <div className="space-y-2">
                      {topShapes.map(({ shape, count, pct }) => {
                        const color = getShapeColor(shape);
                        return (
                          <div key={shape}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                              />
                              <span className="text-xs text-signal-bright flex-1 truncate">{shape}</span>
                              <span className="text-[10px] text-signal-cyan font-mono">{formatNumber(count)}</span>
                              <span className="text-[9px] text-signal-muted w-7 text-right">{pct}%</span>
                            </div>
                            <div className="h-1 rounded-full overflow-hidden ml-4" style={{ background: 'rgba(0,229,255,0.06)' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(count / maxShapeCount) * 100}%` }}
                                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                className="h-full rounded-full"
                                style={{ background: color, boxShadow: `0 0 4px ${color}` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ═══════ SECTION 4: HOTSPOT RANKING ═══════ */}
                {report.hotspotRegions.length > 0 && (
                  <>
                    <SectionDivider />
                    <SectionHeader>HOTSPOT RANKING</SectionHeader>
                    <div className="space-y-2.5">
                      {report.hotspotRegions.slice(0, 6).map((h, i) => (
                        <HotspotBar
                          key={h.name}
                          name={h.name}
                          count={h.count}
                          percentage={h.percentage}
                          maxCount={report.hotspotRegions[0].count}
                          index={i}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* ═══════ SECTION 5: ANOMALY LEVEL ═══════ */}
                <SectionDivider />
                <SectionHeader>ANOMALY LEVEL</SectionHeader>
                <AnomalyGauge level={report.anomalyLevel} score={report.anomalyScore} />
                <div className="text-[8px] text-signal-muted/50 font-mono mt-1 tracking-wider">COUNTRY VS GLOBAL BASELINE</div>

                {/* Footer info */}
                <SectionDivider />
                <div className="flex items-center justify-between text-[9px] text-signal-muted">
                  <span className="font-display tracking-wider">DATA POINTS</span>
                  <span className="font-mono text-signal-cyan">{formatNumber(report.totalYear)}</span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-signal-muted mt-1">
                  <span className="font-display tracking-wider">GLOBAL ALL-TIME TOTAL</span>
                  <span className="font-mono text-signal-cyan/60">{formatNumber(report.totalAllTime)}</span>
                </div>
              </>
            )}
          </div>

          {/* Bottom gradient fade */}
          <div className="sticky bottom-0 h-8 bg-gradient-to-t from-signal-darker to-transparent pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber, parseLocation } from '@/lib/utils';
import { getShapeColor, MONTH_NAMES } from '@/lib/constants';
import { getCountryByCode, COUNTRIES } from '@/lib/countries';
import { buildIntelligenceReport, filterByCountryBounds } from '@/lib/intelligence';
import { computeAnomalyIndex } from '@/lib/anomalyIndex';
import type { IntelligenceReport } from '@/lib/intelligence';
import type { MapPoint, YearCount } from '@/lib/types';

interface RightPanelProps {
  points: MapPoint[];
  yearCount: number;
  year: number;
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  yearCounts: YearCount[];
  isLoading: boolean;
}

const ANOMALY_COLORS: Record<string, string> = {
  LOW: '#00E5FF', ELEVATED: '#FFB300', HIGH: '#00ff9c', CRITICAL: '#FF3355',
};

const FADE_IN = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };
const stagger = (i: number) => ({ ...FADE_IN, transition: { duration: 0.25, delay: i * 0.04 } });

/* ═══════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════ */
function Counter({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    const duration = 500;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * eased));
      if (p < 1) requestAnimationFrame(step);
      else ref.current = value;
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span className={className}>{formatNumber(display)}</span>;
}

/* ═══════════════════════════════════════════
   TREND CHART (canvas line + gradient)
   ═══════════════════════════════════════════ */
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
    const cw = w / 2, ch = h / 2;
    ctx.clearRect(0, 0, cw, ch);

    const recent = data.filter(d => d.year >= 1960);
    if (recent.length < 2) return;

    const maxCount = Math.max(...recent.map(d => d.count), 1);
    const pad = { top: 6, bottom: 14, left: 2, right: 2 };
    const plotW = cw - pad.left - pad.right;
    const plotH = ch - pad.top - pad.bottom;
    const getX = (i: number) => pad.left + (i / (recent.length - 1)) * plotW;
    const getY = (c: number) => pad.top + plotH - (c / maxCount) * plotH;

    const grad = ctx.createLinearGradient(0, pad.top, 0, ch);
    grad.addColorStop(0, 'rgba(0, 229, 255, 0.1)');
    grad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');
    ctx.beginPath();
    ctx.moveTo(getX(0), ch - pad.bottom);
    for (let i = 0; i < recent.length; i++) ctx.lineTo(getX(i), getY(recent[i].count));
    ctx.lineTo(getX(recent.length - 1), ch - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(recent[0].count));
    for (let i = 1; i < recent.length; i++) ctx.lineTo(getX(i), getY(recent[i].count));
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
    ctx.font = '7px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const interval = Math.ceil(recent.length / 4);
    for (let i = 0; i < recent.length; i += interval) {
      ctx.fillText(String(recent[i].year), getX(i), ch - 2);
    }
  }, [data]);
  return <canvas ref={canvasRef} className="w-full" style={{ height: '60px' }} />;
}

/* ═══════════════════════════════════════════
   MONTHLY RADIAL CHART (canvas polar)
   ═══════════════════════════════════════════ */
function MonthlyRadialChart({ data, size = 130 }: { data: { label: string; count: number }[]; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size * 2;
    canvas.height = size * 2;
    ctx.scale(2, 2);
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2 - 18;
    const minR = maxR * 0.3;
    ctx.clearRect(0, 0, size, size);

    const maxCount = Math.max(...data.map(d => d.count), 1);
    const sliceAngle = (Math.PI * 2) / 12;

    // Ring guides
    for (let r = 0; r < 3; r++) {
      const radius = minR + ((r + 1) / 3) * (maxR - minR);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    for (let i = 0; i < 12; i++) {
      const startAngle = i * sliceAngle - Math.PI / 2;
      const endAngle = startAngle + sliceAngle - 0.03;
      const ratio = data[i].count / maxCount;
      const r = minR + ratio * (maxR - minR);

      // Filled slice
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.arc(cx, cy, minR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = `rgba(0, 229, 255, ${0.05 + ratio * 0.35})`;
      ctx.fill();

      // Outer edge
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.strokeStyle = `rgba(0, 229, 255, ${0.15 + ratio * 0.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Month label
      const labelAngle = startAngle + sliceAngle / 2;
      const labelR = maxR + 11;
      ctx.fillStyle = ratio > 0.5 ? 'rgba(0, 229, 255, 0.8)' : 'rgba(100, 116, 139, 0.5)';
      ctx.font = '6.5px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data[i].label, cx + Math.cos(labelAngle) * labelR, cy + Math.sin(labelAngle) * labelR);
    }

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, minR - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 16, 32, 0.9)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.fill();
  }, [data, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}

/* ═══════════════════════════════════════════
   MONTHLY BARS (mini 12-bar chart)
   ═══════════════════════════════════════════ */
function MonthlyBars({ distribution }: { distribution: { month: number; label: string; count: number }[] }) {
  const maxCount = Math.max(...distribution.map(d => d.count), 1);
  return (
    <div>
      <div className="flex items-end gap-[2px]" style={{ height: '44px' }}>
        {distribution.map((d) => {
          const pct = (d.count / maxCount) * 100;
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(pct, 3)}%` }}
                transition={{ duration: 0.4, delay: d.month * 0.025 }}
                className="w-full rounded-t-sm"
                style={{ background: d.count > 0 ? `rgba(0, 229, 255, ${0.15 + (pct / 100) * 0.5})` : 'rgba(255,255,255,0.03)' }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-[2px] mt-1">
        {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((l, i) => (
          <div key={i} className="flex-1 text-center text-[6px] text-slate-600">{l}</div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TEMPORAL HEATMAP (canvas 7×12 grid)
   ═══════════════════════════════════════════ */
function TemporalHeatmap({ matrix }: { matrix: number[][] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxVal = Math.max(...matrix.flat(), 1);
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellW = 18, cellH = 10, padL = 14, padT = 12, gap = 1.5;
    const totalW = padL + 12 * (cellW + gap);
    const totalH = padT + 7 * (cellH + gap);
    canvas.width = totalW * 2;
    canvas.height = totalH * 2;
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, totalW, totalH);

    // Month labels
    ctx.fillStyle = 'rgba(100, 116, 139, 0.5)';
    ctx.font = '6px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (let m = 0; m < 12; m++) {
      ctx.fillText(monthLabels[m], padL + m * (cellW + gap) + cellW / 2, 8);
    }

    // Day labels
    ctx.textAlign = 'right';
    for (let d = 0; d < 7; d++) {
      ctx.fillText(dayLabels[d], padL - 3, padT + d * (cellH + gap) + cellH / 2 + 2);
    }

    // Cells
    for (let d = 0; d < 7; d++) {
      for (let m = 0; m < 12; m++) {
        const val = matrix[d][m];
        const intensity = val / maxVal;
        const x = padL + m * (cellW + gap);
        const y = padT + d * (cellH + gap);

        ctx.fillStyle = val > 0
          ? `rgba(0, 229, 255, ${0.04 + intensity * 0.55})`
          : 'rgba(255, 255, 255, 0.02)';

        // Rounded rect
        const r = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + cellW - r, y);
        ctx.quadraticCurveTo(x + cellW, y, x + cellW, y + r);
        ctx.lineTo(x + cellW, y + cellH - r);
        ctx.quadraticCurveTo(x + cellW, y + cellH, x + cellW - r, y + cellH);
        ctx.lineTo(x + r, y + cellH);
        ctx.quadraticCurveTo(x, y + cellH, x, y + cellH - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }, [matrix, maxVal]);

  return <canvas ref={canvasRef} className="w-full" style={{ height: '95px' }} />;
}

/* ═══════════════════════════════════════════
   CITY BREAKDOWN (ranked list with shape info)
   ═══════════════════════════════════════════ */
function CityBreakdown({ cities }: { cities: { city: string; count: number; pct: number; topShape: string; shapeColor: string }[] }) {
  const maxCount = cities.length > 0 ? cities[0].count : 1;
  return (
    <div className="space-y-1">
      {cities.map((c, i) => (
        <motion.div
          key={c.city}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: i * 0.03 }}
          className="rounded-md p-1.5"
          style={{ background: i === 0 ? 'rgba(0, 229, 255, 0.03)' : 'transparent' }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-slate-600 font-mono w-3 text-right">{i + 1}</span>
            <span className="text-[10px] text-slate-200 flex-1 truncate font-medium">{c.city}</span>
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.shapeColor }} />
            <span className="text-[8px] text-slate-500 truncate max-w-[50px]">{c.topShape}</span>
            <span className="text-[9px] text-cyan-400 font-mono ml-1">{c.count}</span>
          </div>
          <div className="ml-4 h-[3px] rounded-full overflow-hidden mt-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(c.count / maxCount) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.03 }}
              className="h-full rounded-full"
              style={{ background: `rgba(0, 229, 255, ${0.2 + (c.count / maxCount) * 0.45})` }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SHAPE DONUT CHART (canvas ring)
   ═══════════════════════════════════════════ */
function ShapeDonut({ shapes, size = 100 }: { shapes: { shape: string; count: number; pct: number }[]; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !shapes.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size * 2;
    canvas.height = size * 2;
    ctx.scale(2, 2);
    const cx = size / 2, cy = size / 2;
    const outerR = size / 2 - 4;
    const innerR = outerR * 0.62;
    ctx.clearRect(0, 0, size, size);

    const total = shapes.reduce((s, sh) => s + sh.count, 0) || 1;
    let angle = -Math.PI / 2;

    for (const sh of shapes) {
      const sliceAngle = (sh.count / total) * Math.PI * 2;
      const color = getShapeColor(sh.shape);

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, angle, angle + sliceAngle);
      ctx.arc(cx, cy, innerR, angle + sliceAngle, angle, true);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Slice border
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, angle, angle + sliceAngle);
      ctx.strokeStyle = 'rgba(10, 16, 32, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();

      angle += sliceAngle;
    }

    // Center fill
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2);
    ctx.fillStyle = '#0A1020';
    ctx.fill();

    // Center text
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(shapes.length), cx, cy - 4);
    ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
    ctx.font = '6px Inter, system-ui, sans-serif';
    ctx.fillText('types', cx, cy + 6);
  }, [shapes, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}

/* ═══════════════════════════════════════════
   MINI SPARKLINE (tiny inline chart)
   ═══════════════════════════════════════════ */
function MiniSparkline({ data, color = '#00E5FF' }: { data: number[]; color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width = 120;
    const h = canvas.height = 24;
    ctx.clearRect(0, 0, w, h);
    const max = Math.max(...data, 1);
    const step = w / (data.length - 1 || 1);

    // Area fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color + '20');
    grad.addColorStop(1, color + '00');
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i < data.length; i++) ctx.lineTo(i * step, h - (data[i] / max) * (h - 2));
    ctx.lineTo((data.length - 1) * step, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(0, h - (data[0] / max) * (h - 2));
    for (let i = 1; i < data.length; i++) ctx.lineTo(i * step, h - (data[i] / max) * (h - 2));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [data, color]);
  return <canvas ref={canvasRef} style={{ width: '60px', height: '12px' }} />;
}

/* ═══════════════════════════════════════════
   SECTION HEADER + DIVIDER
   ═══════════════════════════════════════════ */
function SectionLabel({ children }: { children: string }) {
  return <div className="text-[8px] tracking-[0.15em] text-slate-500 uppercase mb-2">{children}</div>;
}

function Divider() {
  return <div className="h-px my-3" style={{ background: 'rgba(255,255,255,0.05)' }} />;
}

/* ═══════════════════════════════════════════
   STAT ROW
   ═══════════════════════════════════════════ */
function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.025)' }}>
      <span className="text-[9px] text-slate-500">{label}</span>
      <span className="text-[10px] font-mono" style={{ color: color || '#cbd5e1' }}>{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   COUNTRY SELECTOR
   ═══════════════════════════════════════════ */
function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  const label = value === 'World' ? 'Global' : COUNTRIES.find(c => c.code === value)?.name || value;
  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="text-white font-medium">{label}</span>
        <svg width="8" height="8" viewBox="0 0 10 10" className="text-slate-500">
          <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute top-full mt-1 left-0 w-52 z-50 rounded-lg overflow-hidden"
          style={{ background: '#0e1628', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="p-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              ref={inputRef}
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none px-2 py-1.5 rounded"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            <button
              onClick={() => { onChange('World'); setOpen(false); setSearch(''); }}
              className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${value === 'World' ? 'text-cyan-400 bg-cyan-400/10' : 'text-slate-300 hover:bg-white/5'}`}
            >Global</button>
            {filtered.map((c) => (
              <button key={c.code}
                onClick={() => { onChange(c.code); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${value === c.code ? 'text-cyan-400 bg-cyan-400/10' : 'text-slate-300 hover:bg-white/5'}`}
              >{c.name}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN RIGHT PANEL
   ═══════════════════════════════════════════ */
export default function RightPanel({
  points, yearCount, year, selectedCountry, onCountryChange, yearCounts, isLoading,
}: RightPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const country = getCountryByCode(selectedCountry);
  const isCountryView = selectedCountry !== 'World' && !!country;

  // Scroll to top on country change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedCountry]);

  // ── Core data ──
  const report = useMemo<IntelligenceReport | null>(() => {
    if (!country || selectedCountry === 'World') return null;
    return buildIntelligenceReport(country.code, country.name, year, points, yearCounts, country.bounds);
  }, [country, selectedCountry, year, points, yearCounts]);

  const anomaly = useMemo(
    () => computeAnomalyIndex(year, yearCount, yearCounts, points),
    [year, yearCount, yearCounts, points]
  );

  // ── Filtered points for country ──
  const filteredPoints = useMemo(() => {
    if (!isCountryView || !country) return points;
    return filterByCountryBounds(points, country.bounds, country.name);
  }, [points, isCountryView, country]);

  // ── Monthly distribution ──
  const globalMonthly = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i, label: (MONTH_NAMES[i] || '').substring(0, 3).toUpperCase(), count: 0,
    }));
    const src = isCountryView ? filteredPoints : points;
    for (const p of src) {
      if (p.occurred) {
        const m = new Date(p.occurred).getMonth();
        if (m >= 0 && m < 12) months[m].count++;
      }
    }
    return months;
  }, [points, filteredPoints, isCountryView]);

  const monthlyData = isCountryView && report ? report.monthlyDistribution : globalMonthly;

  // ── Shape distribution ──
  const globalShapes = useMemo(() => {
    const src = isCountryView ? filteredPoints : points;
    const counts = new Map<string, number>();
    for (const p of src) {
      const s = p.shape || 'Unknown';
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    const total = src.length || 1;
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, isCountryView ? 10 : 7)
      .map(([shape, count]) => ({ shape, count, pct: Math.round((count / total) * 100) }));
  }, [points, filteredPoints, isCountryView]);

  const topShapes = isCountryView ? (report?.topShapes ?? globalShapes) : globalShapes;
  const maxShapeCount = topShapes.length > 0 ? topShapes[0].count : 1;

  // ── City breakdown (with per-city top shape) ──
  const cityBreakdown = useMemo(() => {
    const src = isCountryView ? filteredPoints : points;
    const cityData = new Map<string, { count: number; shapes: Map<string, number> }>();
    for (const p of src) {
      const { city } = parseLocation(p.location);
      const key = city || 'Unknown';
      if (!cityData.has(key)) cityData.set(key, { count: 0, shapes: new Map() });
      const entry = cityData.get(key)!;
      entry.count++;
      const shape = p.shape || 'Unknown';
      entry.shapes.set(shape, (entry.shapes.get(shape) || 0) + 1);
    }
    const total = src.length || 1;
    return Array.from(cityData.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15)
      .map(([city, data]) => {
        const topShape = Array.from(data.shapes.entries()).sort((a, b) => b[1] - a[1])[0];
        return {
          city,
          count: data.count,
          pct: Math.round((data.count / total) * 100),
          topShape: topShape ? topShape[0] : 'Unknown',
          shapeColor: getShapeColor(topShape ? topShape[0] : null),
        };
      });
  }, [points, filteredPoints, isCountryView]);

  // ── Shape diversity + concentration ──
  const shapeStats = useMemo(() => {
    const src = isCountryView ? filteredPoints : points;
    const shapeCounts = new Map<string, number>();
    for (const p of src) shapeCounts.set(p.shape || 'Unknown', (shapeCounts.get(p.shape || 'Unknown') || 0) + 1);
    const uniqueShapes = shapeCounts.size;
    // Shannon diversity index
    const total = src.length || 1;
    let entropy = 0;
    Array.from(shapeCounts.values()).forEach(count => {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    });
    const maxEntropy = uniqueShapes > 1 ? Math.log2(uniqueShapes) : 1;
    const diversity = Math.round((entropy / maxEntropy) * 100);
    return { uniqueShapes, diversity };
  }, [points, filteredPoints, isCountryView]);

  // ── Recent 5 year mini trend ──
  const recentTrend = useMemo(() => {
    const data: number[] = [];
    for (let y = year - 4; y <= year; y++) {
      const yc = yearCounts.find(c => Number(c.year) === y);
      data.push(yc ? Number(yc.count) : 0);
    }
    return data;
  }, [yearCounts, year]);

  // ── Temporal heatmap (7 days × 12 months) ──
  const temporalMatrix = useMemo(() => {
    const matrix = Array.from({ length: 7 }, () => new Array(12).fill(0));
    const src = isCountryView ? filteredPoints : points;
    for (const p of src) {
      if (!p.occurred) continue;
      const d = new Date(p.occurred);
      if (isNaN(d.getTime())) continue;
      matrix[d.getDay()][d.getMonth()]++;
    }
    return matrix;
  }, [points, filteredPoints, isCountryView]);

  // ── Computed stats ──
  const yoyDelta = useMemo(() => {
    if (yearCounts.length < 2) return null;
    const prevYc = yearCounts.find(yc => Number(yc.year) === year - 1);
    const prevCount = prevYc ? Number(prevYc.count) : 0;
    if (prevCount === 0) return yearCount > 0 ? 100 : 0;
    return Math.round(((yearCount - prevCount) / prevCount) * 100);
  }, [yearCounts, year, yearCount]);

  const peakMonth = useMemo(() => {
    const peak = monthlyData.reduce((max, m) => m.count > max.count ? m : max, monthlyData[0]);
    return peak && peak.count > 0 ? peak : null;
  }, [monthlyData]);

  const historicalMedian = useMemo(() => {
    if (!yearCounts.length) return 0;
    const counts = yearCounts.map(yc => Number(yc.count)).sort((a, b) => a - b);
    const mid = Math.floor(counts.length / 2);
    return counts.length % 2 === 0 ? Math.round((counts[mid - 1] + counts[mid]) / 2) : counts[mid];
  }, [yearCounts]);

  const countryShare = isCountryView && report
    ? Math.round((report.totalYear / Math.max(yearCount, 1)) * 100) : 100;

  const dailyAvg = (isCountryView ? (report?.totalYear ?? 0) : yearCount) / 365;
  const sightingCount = isCountryView ? (report?.totalYear ?? 0) : yearCount;
  const hasData = sightingCount > 0;

  return (
    <div
      ref={scrollRef}
      className="hidden md:flex flex-col w-[340px] lg:w-[380px] xl:w-[420px] flex-shrink-0 overflow-y-auto"
      style={{ background: '#0A1020', borderLeft: '1px solid rgba(0, 229, 255, 0.08)' }}
    >
      <div className="p-4 lg:p-5">

        {/* ═══ SELECTOR ═══ */}
        <div className="flex items-center justify-between mb-3">
          <CountrySelect value={selectedCountry} onChange={onCountryChange} />
          {isCountryView && (
            <button
              onClick={() => onCountryChange('World')}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <svg width="8" height="8" viewBox="0 0 10 10">
                <path d="M2 2L8 8M2 8L8 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* ═══ HEADER ═══ */}
        <AnimatePresence mode="wait">
          <motion.div key={selectedCountry} {...FADE_IN} transition={{ duration: 0.2 }} className="mb-4">
            <div className="text-[8px] tracking-[0.2em] text-slate-500 uppercase mb-0.5">
              {isCountryView ? 'Intelligence Report' : 'Global Overview'}
            </div>
            <h2 className="font-display text-lg font-bold text-white tracking-wide">
              {isCountryView ? country?.name?.toUpperCase() : 'WORLDWIDE'}
            </h2>
            <div className="text-[9px] text-slate-500 font-mono mt-0.5">{year}</div>
          </motion.div>
        </AnimatePresence>

        {/* ═══ PRIMARY STATS (2 rows of 3) ═══ */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <motion.div layoutId="stat-sightings" className="rounded-lg p-2" style={{ background: 'rgba(0, 229, 255, 0.04)', border: '1px solid rgba(0, 229, 255, 0.08)' }}>
            <div className="text-[7px] tracking-[0.1em] text-slate-500 uppercase mb-1">Sightings</div>
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
            ) : (
              <Counter value={sightingCount} className="font-display text-base font-bold text-cyan-400" />
            )}
          </motion.div>
          <motion.div layoutId="stat-anomaly" className="rounded-lg p-2" style={{ background: 'rgba(255, 179, 0, 0.03)', border: '1px solid rgba(255, 179, 0, 0.06)' }}>
            <div className="text-[7px] tracking-[0.1em] text-slate-500 uppercase mb-1">Anomaly</div>
            <span className="font-display text-base font-bold" style={{ color: ANOMALY_COLORS[anomaly.status] }}>
              {anomaly.index.toFixed(1)}
            </span>
          </motion.div>
          <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="text-[7px] tracking-[0.1em] text-slate-500 uppercase mb-1">YoY</div>
            <span className={`font-display text-base font-bold ${yoyDelta !== null && yoyDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {yoyDelta !== null ? `${yoyDelta > 0 ? '+' : ''}${yoyDelta}%` : '—'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div className="text-[7px] tracking-[0.1em] text-slate-500 uppercase mb-1">Types</div>
            <span className="font-display text-base font-bold text-slate-200">{shapeStats.uniqueShapes}</span>
          </div>
          <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div className="text-[7px] tracking-[0.1em] text-slate-500 uppercase mb-1">Diversity</div>
            <span className="font-display text-base font-bold text-purple-400">{shapeStats.diversity}%</span>
          </div>
          <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div className="text-[7px] tracking-[0.1em] text-slate-500 uppercase mb-1">Daily Avg</div>
            <span className="font-display text-base font-bold text-slate-200">{dailyAvg.toFixed(1)}</span>
          </div>
        </div>

        {/* ═══ 5-YEAR SPARKLINE + KEY METRICS ═══ */}
        <div className="rounded-lg p-2.5 mb-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[8px] tracking-[0.1em] text-slate-500 uppercase">5-Year Trend</span>
            <MiniSparkline data={recentTrend} />
          </div>
          <StatRow label="Status" value={anomaly.status} color={ANOMALY_COLORS[anomaly.status]} />
          <StatRow label="Historical Median" value={formatNumber(historicalMedian)} />
          <StatRow label="Peak Month" value={peakMonth ? `${peakMonth.label} (${peakMonth.count})` : '—'} color="#00E5FF" />
          <StatRow
            label="vs Median"
            value={historicalMedian > 0 ? `${sightingCount >= historicalMedian ? '+' : ''}${Math.round(((sightingCount - historicalMedian) / historicalMedian) * 100)}%` : '—'}
            color={sightingCount >= historicalMedian ? '#00ff9c' : '#FF3355'}
          />
          {isCountryView && <StatRow label="Global Share" value={`${countryShare}%`} color="#00E5FF" />}
          {anomaly.hotspot && (
            <StatRow
              label="Hotspot Center"
              value={`${anomaly.hotspot[0].toFixed(1)}°, ${anomaly.hotspot[1].toFixed(1)}°`}
              color="rgba(0, 229, 255, 0.6)"
            />
          )}
        </div>

        <Divider />

        {/* ═══ VIEW-SPECIFIC CONTENT ═══ */}
        <AnimatePresence mode="wait">
          <motion.div key={`content-${selectedCountry}`} {...FADE_IN} transition={{ duration: 0.25 }}>

            {/* ── CITY BREAKDOWN (country view showpiece) ── */}
            {isCountryView && hasData && cityBreakdown.length > 0 && (
              <motion.div {...stagger(0)} className="mb-3">
                <SectionLabel>Top Cities</SectionLabel>
                <CityBreakdown cities={cityBreakdown} />
              </motion.div>
            )}

            {/* ── MONTHLY: Radial + Bars side by side ── */}
            {hasData && (
              <motion.div {...stagger(1)} className="mb-3">
                <SectionLabel>Monthly Distribution</SectionLabel>
                <div className="flex items-center gap-3">
                  <MonthlyRadialChart data={monthlyData} size={120} />
                  <div className="flex-1 min-w-0">
                    <MonthlyBars distribution={monthlyData} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── TEMPORAL HEATMAP ── */}
            {hasData && (
              <motion.div {...stagger(2)} className="mb-3">
                <SectionLabel>Temporal Pattern (Day × Month)</SectionLabel>
                <TemporalHeatmap matrix={temporalMatrix} />
              </motion.div>
            )}

            <Divider />

            {/* ── ACTIVITY TREND ── */}
            {yearCounts.length > 2 && (
              <motion.div {...stagger(3)} className="mb-3">
                <SectionLabel>{isCountryView ? 'Global Activity Trend' : 'Activity Trend'}</SectionLabel>
                <TrendChart data={isCountryView && report ? report.yearlyTrend : yearCounts.map(yc => ({ year: Number(yc.year), count: Number(yc.count) }))} />
              </motion.div>
            )}

            {/* ── SHAPE ANALYSIS: Donut + Bars ── */}
            {topShapes.length > 0 && hasData && (
              <motion.div {...stagger(4)} className="mb-3">
                <SectionLabel>Shape Analysis</SectionLabel>
                <div className="flex gap-3 items-start">
                  <ShapeDonut shapes={topShapes} size={90} />
                  <div className="flex-1 min-w-0 space-y-1">
                    {topShapes.slice(0, 6).map(({ shape, count, pct }) => {
                      const color = getShapeColor(shape);
                      return (
                        <div key={shape}>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className="text-[9px] text-slate-300 flex-1 truncate">{shape}</span>
                            <span className="text-[8px] text-cyan-400 font-mono">{count}</span>
                            <span className="text-[7px] text-slate-600 w-5 text-right">{pct}%</span>
                          </div>
                          <div className="h-[2px] rounded-full overflow-hidden ml-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(count / maxShapeCount) * 100}%` }}
                              transition={{ duration: 0.5 }}
                              className="h-full rounded-full"
                              style={{ background: color, opacity: 0.6 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── HOTSPOT RANKING (country view) ── */}
            {isCountryView && report && report.hotspotRegions.length > 0 && (
              <motion.div {...stagger(5)} className="mb-3">
                <Divider />
                <SectionLabel>Regional Hotspots</SectionLabel>
                <div className="space-y-1.5">
                  {report.hotspotRegions.slice(0, 6).map((h, i) => (
                    <div key={h.name}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] text-slate-600 font-mono w-3 text-right">{i + 1}</span>
                        <span className="text-[10px] text-slate-300 flex-1 truncate">{h.name}</span>
                        <span className="text-[9px] text-cyan-400 font-mono">{h.count}</span>
                      </div>
                      <div className="h-[2px] rounded-full overflow-hidden ml-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(h.count / report.hotspotRegions[0].count) * 100}%` }}
                          transition={{ duration: 0.5, delay: i * 0.03 }}
                          className="h-full rounded-full bg-cyan-400/40"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <Divider />

            {/* ── ANOMALY GAUGE ── */}
            <motion.div layoutId="anomaly-gauge" className="mb-3">
              <SectionLabel>Anomaly Level</SectionLabel>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, isCountryView && report ? report.anomalyScore : anomaly.index)}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full"
                  style={{ background: ANOMALY_COLORS[isCountryView && report ? report.anomalyLevel : anomaly.status] || '#00E5FF' }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] font-semibold" style={{ color: ANOMALY_COLORS[isCountryView && report ? report.anomalyLevel : anomaly.status] }}>
                  {isCountryView && report ? report.anomalyLevel : anomaly.status}
                </span>
                <span className="text-[8px] text-slate-500 font-mono">
                  {isCountryView && report ? `${report.anomalyScore}%` : anomaly.index.toFixed(1)}
                </span>
              </div>
            </motion.div>

            {/* ── ANOMALY EXPLANATION (always visible) ── */}
            <div className="rounded-lg p-2.5 mb-3" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div className="text-[7px] tracking-[0.1em] text-slate-500 uppercase mb-1">What is Anomaly?</div>
              <p className="text-[9px] text-slate-400 leading-relaxed">
                Measures unusual sighting activity vs historical averages. Factors: YoY growth (35%), count vs median (40%), geographic clustering (25%).
              </p>
            </div>

            {/* ── DATA FOOTER ── */}
            {isCountryView && report && (
              <div className="space-y-0.5 mb-2">
                <div className="flex justify-between text-[8px] text-slate-600">
                  <span>Data Points</span>
                  <span className="text-cyan-400/60 font-mono">{formatNumber(report.totalYear)}</span>
                </div>
                <div className="flex justify-between text-[8px] text-slate-600">
                  <span>Global All-Time</span>
                  <span className="font-mono">{formatNumber(report.totalAllTime)}</span>
                </div>
              </div>
            )}

            {/* ── NO DATA ── */}
            {!hasData && !isLoading && (
              <div className="text-center py-6">
                <div className="text-xs text-slate-500 mb-1">No data</div>
                <div className="text-[9px] text-slate-600">No sightings recorded for {year}{isCountryView ? ` in ${country?.name}` : ''}</div>
              </div>
            )}

            {/* ── GLOBAL CTA ── */}
            {!isCountryView && (
              <div className="text-center py-2">
                <div className="text-[9px] text-slate-500">Click a country on the map for detailed intelligence</div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

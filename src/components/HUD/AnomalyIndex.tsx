'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { computeAnomalyIndex, type AnomalyStatus } from '@/lib/anomalyIndex';
import type { YearCount, MapPoint } from '@/lib/types';

interface AnomalyIndexProps {
  year: number;
  yearCount: number;
  yearCounts: YearCount[];
  points: MapPoint[];
}

/* ─── Status theme ─── */
const STATUS_THEME: Record<AnomalyStatus, {
  label: string;
  color: string;
  glow: string;
  border: string;
  bg: string;
  gradient: string;
  dotPulse: boolean;
}> = {
  LOW: {
    label: 'LOW',
    color: '#00E5FF',
    glow: 'rgba(0,229,255,0.15)',
    border: 'rgba(0,255,156,0.18)',
    bg: 'rgba(0,255,156,0.04)',
    gradient: 'linear-gradient(135deg, #00E5FF 0%, #00FF9C 100%)',
    dotPulse: false,
  },
  ELEVATED: {
    label: 'ELEVATED',
    color: '#FFB300',
    glow: 'rgba(255,179,0,0.15)',
    border: 'rgba(255,179,0,0.22)',
    bg: 'rgba(255,179,0,0.04)',
    gradient: 'linear-gradient(135deg, #00E5FF 0%, #FFB300 100%)',
    dotPulse: false,
  },
  HIGH: {
    label: 'HIGH',
    color: '#00FF9C',
    glow: 'rgba(0,255,156,0.2)',
    border: 'rgba(0,255,156,0.3)',
    bg: 'rgba(0,255,156,0.05)',
    gradient: 'linear-gradient(135deg, #00E5FF 0%, #00FF9C 100%)',
    dotPulse: true,
  },
  CRITICAL: {
    label: 'CRITICAL',
    color: '#FF3355',
    glow: 'rgba(255,51,85,0.2)',
    border: 'rgba(255,51,85,0.3)',
    bg: 'rgba(255,51,85,0.05)',
    gradient: 'linear-gradient(135deg, #FF3355 0%, #FF6644 100%)',
    dotPulse: true,
  },
};

/* ─── Smooth animated counter ─── */
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const diff = value - start;
    if (Math.abs(diff) < 0.05) {
      setDisplay(value);
      prev.current = value;
      return;
    }

    const duration = 500;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      const current = Math.round((start + diff * eased) * 10) / 10;
      setDisplay(current);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        prev.current = value;
        setDisplay(value);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{display.toFixed(1)}</>;
}

/* ─── Signal waveform canvas ─── */
function SignalWave({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    let offset = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const barW = 2;
      const gap = 3;
      const total = Math.ceil(w / (barW + gap));

      for (let i = 0; i < total; i++) {
        const x = i * (barW + gap);
        const t = (i + offset * 0.25) * 0.18;
        const barH = (Math.sin(t) * 0.35 + 0.5) * h * 0.75;
        const y = (h - barH) / 2;

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.05 + Math.sin(t + offset * 0.015) * 0.03;
        ctx.fillRect(x, y, barW, barH);
      }
      ctx.globalAlpha = 1;
      offset++;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={60}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}

/* ─── Floating particles ─── */
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Init particles once
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 12; i++) {
        particlesRef.current.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.2,
          size: Math.random() * 1.2 + 0.4,
          alpha: Math.random() * 0.3 + 0.1,
        });
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 255, ${p.alpha})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={160}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.5 }}
    />
  );
}

/* ─── Corner bracket decoration ─── */
function CornerBrackets({ color }: { color: string }) {
  const style = { background: color };
  return (
    <>
      {/* Top-left */}
      <div className="absolute top-[5px] left-[5px] w-3 h-3 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-px" style={style} />
        <div className="absolute top-0 left-0 h-full w-px" style={style} />
      </div>
      {/* Top-right */}
      <div className="absolute top-[5px] right-[5px] w-3 h-3 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-px" style={style} />
        <div className="absolute top-0 right-0 h-full w-px" style={style} />
      </div>
      {/* Bottom-left */}
      <div className="absolute bottom-[5px] left-[5px] w-3 h-3 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-full h-px" style={style} />
        <div className="absolute bottom-0 left-0 h-full w-px" style={style} />
      </div>
      {/* Bottom-right */}
      <div className="absolute bottom-[5px] right-[5px] w-3 h-3 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-full h-px" style={style} />
        <div className="absolute bottom-0 right-0 h-full w-px" style={style} />
      </div>
    </>
  );
}

/* ═══════════ MAIN COMPONENT ═══════════ */
export default function AnomalyIndex({ year, yearCount, yearCounts, points }: AnomalyIndexProps) {
  const anomaly = useMemo(
    () => computeAnomalyIndex(year, yearCount, yearCounts, points),
    [year, yearCount, yearCounts, points]
  );

  const theme = STATUS_THEME[anomaly.status];
  const isCritical = anomaly.status === 'CRITICAL';
  const [showScanFlash, setShowScanFlash] = useState(false);
  const prevYear = useRef(year);

  // Trigger scan flash on year change
  useEffect(() => {
    if (prevYear.current !== year) {
      prevYear.current = year;
      setShowScanFlash(true);
      const t = setTimeout(() => setShowScanFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [year]);

  return (
    <motion.div
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="anomaly-hud-panel group relative overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(5,14,30,0.94) 0%, rgba(2,8,18,0.97) 50%, rgba(5,12,25,0.95) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: `1px solid ${theme.border}`,
        borderRadius: '16px',
        padding: '10px 12px 8px',
        width: 'clamp(130px, 38vw, 170px)',
        boxShadow: `
          0 8px 40px rgba(0,0,0,0.6),
          0 0 25px ${theme.glow},
          0 0 50px rgba(0,0,0,0.3),
          inset 0 1px 0 rgba(0,229,255,0.08),
          inset 0 -1px 0 rgba(0,0,0,0.3)
        `,
        transition: 'border-color 0.6s ease, box-shadow 0.6s ease',
      }}
    >
      {/* ── Grid overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          borderRadius: '16px',
          opacity: 0.6,
        }}
      />

      {/* ── Floating particles ── */}
      <Particles />

      {/* ── Scanline shimmer ── */}
      <div className="anomaly-scanline absolute inset-0 pointer-events-none" style={{ borderRadius: '16px', overflow: 'hidden' }} />

      {/* ── Year-change scan flash ── */}
      <AnimatePresence>
        {showScanFlash && (
          <motion.div
            initial={{ top: '-10%', opacity: 0.5 }}
            animate={{ top: '110%', opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute left-0 right-0 h-[2px] pointer-events-none z-20"
            style={{
              background: `linear-gradient(90deg, transparent 5%, ${theme.color} 50%, transparent 95%)`,
              boxShadow: `0 0 12px ${theme.color}, 0 0 30px ${theme.glow}`,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Critical pulsing border overlay ── */}
      {isCritical && (
        <div
          className="absolute inset-0 pointer-events-none animate-pulse"
          style={{
            border: '1px solid rgba(255,51,85,0.2)',
            borderRadius: '16px',
            animationDuration: '2s',
          }}
        />
      )}

      {/* ── Corner brackets ── */}
      <CornerBrackets color={`${theme.color}40`} />

      {/* ── Header ── */}
      <div className="relative z-10 text-center mb-0.5">
        <span className="font-display text-[7px] sm:text-[7.5px] tracking-[0.25em] font-bold text-signal-cyan/50 uppercase">
          Global Anomaly
        </span>
      </div>

      {/* ── Sub-header ── */}
      <div className="relative z-10 text-center mb-1">
        <span
          className="font-display text-[8px] tracking-[0.3em] font-bold uppercase"
          style={{ color: `${theme.color}80` }}
        >
          Index
        </span>
      </div>

      {/* ── Main number ── */}
      <div className="relative z-10 text-center my-2">
        {/* Signal wave behind number */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <SignalWave color={theme.color} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={Math.round(anomaly.index * 10)}
            initial={{ scale: 0.92, opacity: 0.4, filter: 'blur(2px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="anomaly-number-display font-display text-[28px] sm:text-[38px] md:text-[42px] font-black tracking-wider leading-none"
            style={{
              background: theme.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: `drop-shadow(0 0 10px ${theme.glow})`,
            }}
          >
            <AnimatedNumber value={anomaly.index} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Status badge ── */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 mt-0.5">
        {/* Status dot */}
        <div
          className={`w-[6px] h-[6px] rounded-full ${theme.dotPulse ? 'anomaly-dot-pulse' : ''}`}
          style={{
            background: theme.color,
            boxShadow: `0 0 6px ${theme.color}, 0 0 12px ${theme.glow}`,
          }}
        />
        {/* Status text */}
        <span
          className="font-display text-[9px] tracking-[0.2em] font-bold uppercase"
          style={{
            color: theme.color,
            textShadow: `0 0 8px ${theme.glow}`,
          }}
        >
          {theme.label}
        </span>
      </div>

      {/* ── Year-over-Year delta ── */}
      {anomaly.delta !== 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="relative z-10 text-center mt-1.5"
        >
          <span
            className="font-mono text-[8px] tracking-wider"
            style={{
              color: anomaly.delta > 0 ? '#00E5FF' : '#FF3355',
              opacity: 0.7,
              textShadow: anomaly.delta > 0
                ? '0 0 6px rgba(0,229,255,0.3)'
                : '0 0 6px rgba(255,51,85,0.3)',
            }}
          >
            {anomaly.delta > 0 ? '+' : ''}{anomaly.delta}% YoY
          </span>
        </motion.div>
      )}

      {/* ── Ambient shadow beneath ── */}
      <div
        className="absolute -bottom-3 left-3 right-3 h-4 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${theme.glow} 0%, transparent 70%)`,
          filter: 'blur(6px)',
          opacity: 0.5,
        }}
      />
    </motion.div>
  );
}

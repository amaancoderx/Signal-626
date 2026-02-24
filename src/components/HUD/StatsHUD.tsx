'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber } from '@/lib/utils';
import Image from 'next/image';
import { COUNTRIES } from '@/lib/countries';

interface StatsHUDProps {
  totalReports: number;
  currentYear: number;
  yearReports: number;
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlay?: () => void;
  selectedCountry: string;
  onCountryChange: (country: string) => void;
}

/* ─── Animated number counter ─── */
function CounterValue({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const start = prev.current;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 500;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * eased));
      if (p < 1) requestAnimationFrame(step);
      else prev.current = value;
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span className={className}>{formatNumber(display)}</span>;
}

/* ─── Custom country dropdown ─── */
function CountryDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const selectedLabel = value === 'World' ? 'GLOBAL' : COUNTRIES.find(c => c.code === value)?.name?.toUpperCase() || value;
  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all duration-200 group"
        style={{
          border: '1px solid rgba(0,229,255,0.15)',
          background: open ? 'rgba(0,229,255,0.08)' : 'rgba(0,229,255,0.03)',
          boxShadow: open ? '0 0 12px rgba(0,229,255,0.1)' : 'none',
        }}
      >
        <span className="text-xs font-display tracking-wider font-bold transition-colors"
          style={{ color: value === 'World' ? '#CFFFFF' : '#00E5FF', textShadow: value !== 'World' ? '0 0 8px rgba(0,229,255,0.4)' : 'none' }}>
          {selectedLabel}
        </span>
        <svg width="8" height="8" viewBox="0 0 8 8" className="text-signal-muted group-hover:text-signal-cyan transition-colors">
          <path d="M1 3L4 6L7 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-1 right-0 sm:left-0 sm:right-auto w-56 z-50 rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(10,22,40,0.97) 0%, rgba(5,12,25,0.98) 100%)',
              border: '1px solid rgba(0,229,255,0.2)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 20px rgba(0,229,255,0.06)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <div className="p-2 border-b border-signal-cyan/10">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search regions..."
                className="w-full bg-transparent text-xs text-signal-bright placeholder-signal-muted/50 outline-none font-body px-2 py-1.5 rounded-md"
                style={{ border: '1px solid rgba(0,229,255,0.1)' }}
              />
            </div>
            <div className="max-h-60 overflow-y-auto p-1.5">
              <button
                onClick={() => { onChange('World'); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-display tracking-wider transition-all ${
                  value === 'World' ? 'text-signal-cyan' : 'text-signal-muted hover:text-signal-bright hover:bg-signal-cyan/5'
                }`}
                style={value === 'World' ? { background: 'rgba(0,229,255,0.1)' } : undefined}
              >
                GLOBAL
              </button>
              {filtered.map((c) => (
                <button
                  key={c.code}
                  onClick={() => { onChange(c.code); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                    value === c.code ? 'text-signal-cyan font-display tracking-wider' : 'text-signal-bright/80 hover:text-signal-bright hover:bg-signal-cyan/5'
                  }`}
                  style={value === c.code ? { background: 'rgba(0,229,255,0.1)' } : undefined}
                >
                  {c.name.toUpperCase()}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StatsHUD({
  totalReports, currentYear, yearReports, isPlaying, isLoading, onTogglePlay, selectedCountry, onCountryChange,
}: StatsHUDProps) {
  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, type: 'spring', damping: 20 }}
      className="relative"
    >
      <div className="overflow-visible"
        style={{
          background: 'linear-gradient(180deg, rgba(5,10,20,0.92) 0%, rgba(5,10,20,0.88) 100%)',
          backdropFilter: 'blur(32px)',
          borderBottom: '1px solid rgba(0,229,255,0.1)',
        }}>
        <div className="flex items-stretch min-h-[48px] sm:min-h-[56px] md:min-h-[64px]">

          {/* Logo */}
          <div className="hud-section flex-row !flex-row items-center gap-2 sm:gap-3 pl-3 sm:pl-4 md:pl-6">
            <div className="relative w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] md:w-[52px] md:h-[52px] flex-shrink-0 logo-breathe">
              <Image src="/logo.png" alt="Signal 626" fill className="object-contain" priority unoptimized />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-[10px] sm:text-xs md:text-sm lg:text-base font-bold tracking-[0.12em] sm:tracking-[0.15em] text-signal-bright"
                style={{ textShadow: '0 0 15px rgba(0,229,255,0.4)' }}>
                SIGNAL 626
              </span>
              <span className="hidden sm:block font-display text-[6px] md:text-[7px] lg:text-[8px] tracking-[0.14em] md:tracking-[0.18em] font-semibold"
                style={{ color: 'rgba(0,229,255,0.4)' }}>
                GLOBAL ANOMALY INTELLIGENCE NETWORK
              </span>
            </div>
          </div>

          <div className="hud-divider" />

          {/* Total Reports */}
          <div className="hud-section">
            <span className="hud-label">TOTAL REPORTS</span>
            <CounterValue value={totalReports} className="hud-value text-sm sm:text-base md:text-lg" />
          </div>

          <div className="hud-divider" />

          {/* Active Year */}
          <div className="hud-section">
            <span className="hud-label">ACTIVE YEAR</span>
            <motion.span key={currentYear} initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.15 }} className="hud-value-white text-sm sm:text-base md:text-lg">
              {currentYear}
            </motion.span>
          </div>

          <div className="hud-divider" />

          {/* Year Reports */}
          <div className="hidden sm:flex">
            <div className="hud-section">
              <span className="hud-label">YEAR COUNT</span>
              <CounterValue value={yearReports} className="hud-value text-sm sm:text-base md:text-lg" />
            </div>
          </div>

          <div className="hud-divider hidden sm:block" />

          {/* Region Selector — desktop */}
          <div className="hidden md:flex">
            <div className="hud-section">
              <span className="hud-label mb-1">REGION</span>
              <CountryDropdown value={selectedCountry} onChange={onCountryChange} />
            </div>
          </div>

          {/* Region Selector — mobile/tablet (compact) */}
          <div className="flex md:hidden">
            <div className="hud-section">
              <CountryDropdown value={selectedCountry} onChange={onCountryChange} />
            </div>
          </div>

          <div className="flex-1 min-w-0" />

          {/* Title */}
          <div className="hidden lg:flex flex-col items-end justify-center px-4">
            <span className="font-display text-xs font-bold tracking-[0.2em] text-signal-bright/80"
              style={{ textShadow: '0 0 8px rgba(0,229,255,0.2)' }}>
              REPORTED UFO SIGHTINGS
            </span>
            <span className="font-display text-[10px] tracking-[0.25em] text-signal-cyan/40 font-semibold">
              1400 &mdash; 2026
            </span>
          </div>

          <div className="hud-divider hidden lg:block" />

          {/* Controls */}
          <div className="hud-section !flex-row items-center gap-2 sm:gap-3 pr-3 sm:pr-4 md:pr-6">
            {onTogglePlay && (
              <button onClick={onTogglePlay}
                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all active:scale-95 group"
                style={{
                  border: isPlaying ? '1px solid rgba(0,229,255,0.5)' : '1px solid rgba(0,229,255,0.15)',
                  background: isPlaying ? 'rgba(0,229,255,0.1)' : 'rgba(13,21,48,0.6)',
                  boxShadow: isPlaying ? '0 0 16px rgba(0,229,255,0.25)' : 'none',
                }}
                title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying && <div className="absolute inset-0 rounded-full border border-signal-cyan/30 animate-ping" style={{ animationDuration: '2s' }} />}
                {isPlaying ? (
                  <svg width="12" height="12" viewBox="0 0 14 14" className="text-signal-cyan relative z-10">
                    <rect x="2" y="1" width="3.5" height="12" fill="currentColor" rx="1" />
                    <rect x="8.5" y="1" width="3.5" height="12" fill="currentColor" rx="1" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 14 14" className="text-signal-muted group-hover:text-signal-cyan transition-colors relative z-10">
                    <polygon points="3,1 13,7 3,13" fill="currentColor" />
                  </svg>
                )}
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-signal-amber animate-pulse' : isPlaying ? 'bg-signal-cyan animate-pulse' : 'bg-signal-muted/30'}`}
                style={{ boxShadow: isPlaying ? '0 0 8px rgba(0,229,255,0.6)' : isLoading ? '0 0 8px rgba(255,170,0,0.6)' : 'none' }} />
              <span className={`text-[9px] sm:text-[10px] font-display tracking-[0.15em] font-bold ${isLoading ? 'text-signal-amber' : isPlaying ? 'text-signal-cyan' : 'text-signal-muted'}`}>
                {isLoading ? 'SCAN' : isPlaying ? 'LIVE' : 'IDLE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom neon line */}
      <div className="absolute bottom-0 left-0 right-0 h-px animated-border" />
      <div className="neon-line-glow absolute -bottom-px left-0 right-0" />

      {/* Scanning line effect */}
      <div className="absolute bottom-0 left-0 h-px pointer-events-none"
        style={{ width: '120px', background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.6), transparent)', animation: 'headerScan 4s linear infinite' }} />
    </motion.div>
  );
}

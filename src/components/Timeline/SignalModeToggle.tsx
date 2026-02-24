'use client';

import type { TimelineMode } from '@/lib/types';

interface SignalModeToggleProps {
  mode: TimelineMode;
  onModeChange: (mode: TimelineMode) => void;
}

export default function SignalModeToggle({ mode, onModeChange }: SignalModeToggleProps) {
  return (
    <div
      className="flex items-center rounded-lg overflow-hidden"
      style={{
        background: 'rgba(5, 12, 28, 0.85)',
        border: '1px solid rgba(0, 229, 255, 0.15)',
        boxShadow: '0 0 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,229,255,0.06)',
      }}
    >
      <button
        onClick={() => onModeChange('year')}
        className="relative px-3 py-1.5 text-[9px] sm:text-[10px] font-display tracking-[0.2em] font-bold uppercase transition-all duration-300"
        style={{
          color: mode === 'year' ? '#00E5FF' : 'rgba(74, 106, 138, 0.6)',
          background: mode === 'year' ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
          textShadow: mode === 'year' ? '0 0 8px rgba(0,229,255,0.6)' : 'none',
        }}
      >
        {mode === 'year' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 12px rgba(0,229,255,0.1)',
              borderRight: '1px solid rgba(0,229,255,0.2)',
            }}
          />
        )}
        YEAR
      </button>
      <div className="w-px h-4" style={{ background: 'rgba(0, 229, 255, 0.15)' }} />
      <button
        onClick={() => onModeChange('signal')}
        className="relative px-3 py-1.5 text-[9px] sm:text-[10px] font-display tracking-[0.2em] font-bold uppercase transition-all duration-300"
        style={{
          color: mode === 'signal' ? '#00FF9C' : 'rgba(74, 106, 138, 0.6)',
          background: mode === 'signal' ? 'rgba(0, 255, 156, 0.08)' : 'transparent',
          textShadow: mode === 'signal' ? '0 0 8px rgba(0,255,156,0.6)' : 'none',
        }}
      >
        {mode === 'signal' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 12px rgba(0,255,156,0.1)',
              borderLeft: '1px solid rgba(0,255,156,0.2)',
            }}
          />
        )}
        SIGNAL
      </button>
    </div>
  );
}

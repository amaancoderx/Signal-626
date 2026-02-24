'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HeatmapMode } from '@/lib/types';

interface FilterBarProps {
  shapes: string[];
  selectedShape: string;
  onShapeChange: (shape: string) => void;
  heatmapEnabled: boolean;
  onHeatmapToggle: () => void;
  heatmapMode: HeatmapMode;
  onHeatmapModeChange: (mode: HeatmapMode) => void;
  onExportYear: () => void;
  onFullscreen: () => void;
}

const HEATMAP_MODES: { key: HeatmapMode; label: string; desc: string }[] = [
  { key: 'density', label: 'DENSITY', desc: 'Standard concentration view' },
  { key: 'clusters', label: 'CLUSTERS', desc: 'Macro hotspot patterns' },
  { key: 'precision', label: 'PRECISION', desc: 'Exact location detail' },
];

const btnBase = `w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center
  transition-all duration-200 group active:scale-95 relative`;

const btnStyle = {
  background: 'rgba(5, 12, 28, 0.92)',
  border: '1px solid rgba(0, 229, 255, 0.2)',
  boxShadow: '0 0 20px rgba(0,0,0,0.5), 0 0 8px rgba(0,229,255,0.06), inset 0 1px 0 rgba(0,229,255,0.08)',
  backdropFilter: 'blur(16px)',
};

const iconClass = `text-signal-cyan/70 group-hover:text-signal-cyan transition-all duration-200
  group-hover:drop-shadow-[0_0_6px_rgba(0,229,255,0.6)]`;

export default function FilterBar({
  shapes,
  selectedShape,
  onShapeChange,
  heatmapEnabled,
  onHeatmapToggle,
  heatmapMode,
  onHeatmapModeChange,
  onExportYear,
  onFullscreen,
}: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [heatmapMenuOpen, setHeatmapMenuOpen] = useState(false);

  return (
    <motion.div
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="absolute left-2 sm:left-3 top-[56px] sm:top-[72px] md:top-[84px] z-[1000] flex flex-col gap-2 sm:gap-2.5"
    >
      {/* Toggle filters */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={btnBase}
        style={{
          ...btnStyle,
          borderColor: isOpen ? 'rgba(0,229,255,0.4)' : btnStyle.border?.toString().match(/rgba[^)]+\)/)?.[0],
          boxShadow: isOpen
            ? '0 0 20px rgba(0,0,0,0.5), 0 0 14px rgba(0,229,255,0.15), inset 0 1px 0 rgba(0,229,255,0.1)'
            : (btnStyle.boxShadow as string),
        }}
        title="Filters"
      >
        <svg width="18" height="18" viewBox="0 0 16 16" className={iconClass}>
          <path d="M1 3h14M4 8h8M6 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Heatmap toggle */}
      <div className="relative">
        <button
          onClick={onHeatmapToggle}
          onContextMenu={(e) => { e.preventDefault(); if (heatmapEnabled) setHeatmapMenuOpen(!heatmapMenuOpen); }}
          className={btnBase}
          style={{
            ...btnStyle,
            borderColor: heatmapEnabled ? 'rgba(0,229,255,0.45)' : undefined,
            background: heatmapEnabled ? 'rgba(0,229,255,0.1)' : btnStyle.background,
            boxShadow: heatmapEnabled
              ? '0 0 20px rgba(0,0,0,0.5), 0 0 18px rgba(0,229,255,0.2), inset 0 0 10px rgba(0,229,255,0.04)'
              : (btnStyle.boxShadow as string),
          }}
          title={heatmapEnabled ? 'Heatmap ON (right-click for modes)' : 'Toggle Heatmap'}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" className={`transition-all duration-200 ${heatmapEnabled ? 'text-signal-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.7)]' : iconClass}`}>
            <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.5" />
          </svg>
          {heatmapEnabled && (
            <div className="absolute inset-0 rounded-xl border border-signal-cyan/20 animate-ping" style={{ animationDuration: '3s' }} />
          )}
        </button>

        {/* Heatmap indicator dot */}
        {heatmapEnabled && (
          <button
            onClick={() => setHeatmapMenuOpen(!heatmapMenuOpen)}
            className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full bg-signal-cyan border-2 border-signal-darker
                       cursor-pointer hover:scale-125 transition-transform"
            style={{ boxShadow: '0 0 10px rgba(0,229,255,0.7)' }}
            title="Change heatmap mode"
          />
        )}

        {/* Mode selector dropdown */}
        <AnimatePresence>
          {heatmapMenuOpen && heatmapEnabled && (
            <motion.div
              initial={{ x: -20, opacity: 0, scale: 0.9 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: -20, opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute left-12 sm:left-[52px] top-0 w-44 sm:w-52 glass-panel-cyan rounded-lg p-2"
            >
              <div className="text-[9px] font-display tracking-[0.3em] text-signal-cyan/60 px-2 py-1 mb-1">
                HEATMAP MODE
              </div>
              {HEATMAP_MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => { onHeatmapModeChange(m.key); setHeatmapMenuOpen(false); }}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                    heatmapMode === m.key
                      ? 'text-signal-cyan'
                      : 'text-signal-muted hover:text-signal-bright hover:bg-signal-cyan/5'
                  }`}
                  style={heatmapMode === m.key ? {
                    background: 'rgba(0,212,255,0.1)',
                    border: '1px solid rgba(0,212,255,0.2)',
                  } : { border: '1px solid transparent' }}
                >
                  <div className="font-display tracking-wider font-bold">{m.label}</div>
                  <div className="text-[10px] opacity-60">{m.desc}</div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Export */}
      <button
        onClick={onExportYear}
        className={btnBase}
        style={btnStyle}
        title="Export Year Data"
      >
        <svg width="18" height="18" viewBox="0 0 16 16" className={iconClass}>
          <path d="M8 2v8M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Fullscreen */}
      <button
        onClick={onFullscreen}
        className={btnBase}
        style={btnStyle}
        title="Fullscreen"
      >
        <svg width="18" height="18" viewBox="0 0 16 16" className={iconClass}>
          <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Shape filter dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -20, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -20, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute left-12 sm:left-[52px] top-0 w-40 sm:w-48 glass-panel-cyan rounded-lg p-2 max-h-60 sm:max-h-72 overflow-y-auto"
          >
            <div className="text-[9px] font-display tracking-[0.3em] text-signal-cyan/60 px-2 py-1 mb-1">
              SHAPE FILTER
            </div>
            <button
              onClick={() => { onShapeChange('All'); setIsOpen(false); }}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all
                ${selectedShape === 'All' ? 'text-signal-cyan' : 'text-signal-muted hover:text-signal-bright hover:bg-signal-cyan/5'}`}
              style={selectedShape === 'All' ? {
                background: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.2)',
              } : { border: '1px solid transparent' }}
            >
              All Shapes
            </button>
            {shapes.map((shape) => (
              <button
                key={shape}
                onClick={() => { onShapeChange(shape); setIsOpen(false); }}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all
                  ${selectedShape === shape ? 'text-signal-cyan' : 'text-signal-muted hover:text-signal-bright hover:bg-signal-cyan/5'}`}
                style={selectedShape === shape ? {
                  background: 'rgba(0,212,255,0.1)',
                  border: '1px solid rgba(0,212,255,0.2)',
                } : { border: '1px solid transparent' }}
              >
                {shape}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

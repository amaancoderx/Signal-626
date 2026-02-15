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
      className="absolute left-2 sm:left-3 top-[52px] sm:top-[68px] md:top-[80px] z-[1000] flex flex-col gap-1.5 sm:gap-2"
    >
      {/* Toggle filters */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg glass-panel flex items-center justify-center
                   hover:bg-white/10 transition-all group hover:shadow-[0_0_12px_rgba(255,255,255,0.15)] active:scale-95"
        title="Filters"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" className="text-white group-hover:text-signal-bright transition-colors group-hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]">
          <path d="M1 3h14M4 8h8M6 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Heatmap toggle */}
      <div className="relative">
        <button
          onClick={onHeatmapToggle}
          onContextMenu={(e) => { e.preventDefault(); if (heatmapEnabled) setHeatmapMenuOpen(!heatmapMenuOpen); }}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg glass-panel flex items-center justify-center transition-all group active:scale-95
            ${heatmapEnabled ? 'border-[#00FF9C]/40 bg-[#00FF9C]/10 shadow-[0_0_12px_rgba(0,255,156,0.15)]' : 'hover:shadow-[0_0_12px_rgba(0,255,156,0.12)]'}`}
          title={heatmapEnabled ? 'Heatmap ON (right-click for modes)' : 'Toggle Heatmap'}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" className={`transition-colors ${heatmapEnabled ? 'text-[#00FF9C] drop-shadow-[0_0_4px_rgba(0,255,156,0.5)]' : 'text-signal-muted group-hover:text-[#00FF9C] group-hover:drop-shadow-[0_0_4px_rgba(0,255,156,0.4)]'}`}>
            <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          </svg>
        </button>

        {/* Heatmap mode indicator dot */}
        {heatmapEnabled && (
          <button
            onClick={() => setHeatmapMenuOpen(!heatmapMenuOpen)}
            className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-[#00FF9C] border border-signal-darker
                       shadow-[0_0_6px_rgba(0,255,156,0.6)] cursor-pointer hover:scale-125 transition-transform"
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
              className="absolute left-10 sm:left-11 top-0 w-44 sm:w-52 glass-panel rounded-lg p-2"
            >
              <div className="text-[9px] font-display tracking-[0.3em] text-[#00FF9C]/70 px-2 py-1 mb-1">
                HEATMAP MODE
              </div>
              {HEATMAP_MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => { onHeatmapModeChange(m.key); setHeatmapMenuOpen(false); }}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                    heatmapMode === m.key
                      ? 'bg-[#00FF9C]/10 text-[#00FF9C]'
                      : 'text-signal-muted hover:text-white hover:bg-white/5'
                  }`}
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
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg glass-panel flex items-center justify-center
                   hover:bg-white/10 transition-all group hover:shadow-[0_0_12px_rgba(255,255,255,0.15)] active:scale-95"
        title="Export Year Data"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" className="text-signal-muted group-hover:text-white transition-colors group-hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]">
          <path d="M8 2v8M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Fullscreen */}
      <button
        onClick={onFullscreen}
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg glass-panel flex items-center justify-center
                   hover:bg-white/10 transition-all group hover:shadow-[0_0_12px_rgba(255,255,255,0.15)] active:scale-95"
        title="Fullscreen"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" className="text-signal-muted group-hover:text-white transition-colors group-hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]">
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
            className="absolute left-10 sm:left-11 top-0 w-40 sm:w-48 glass-panel rounded-lg p-2 max-h-60 sm:max-h-72 overflow-y-auto"
          >
            <div className="text-[9px] font-display tracking-[0.3em] text-signal-muted px-2 py-1 mb-1">
              SHAPE FILTER
            </div>
            <button
              onClick={() => { onShapeChange('All'); setIsOpen(false); }}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all
                ${selectedShape === 'All' ? 'bg-white/10 text-white' : 'text-signal-muted hover:text-white hover:bg-white/5'}`}
            >
              All Shapes
            </button>
            {shapes.map((shape) => (
              <button
                key={shape}
                onClick={() => { onShapeChange(shape); setIsOpen(false); }}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all
                  ${selectedShape === shape ? 'bg-white/10 text-white' : 'text-signal-muted hover:text-white hover:bg-white/5'}`}
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

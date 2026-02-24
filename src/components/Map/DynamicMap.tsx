'use client';

import dynamic from 'next/dynamic';
import type { MapPoint, HeatmapMode } from '@/lib/types';
import type { CountryHoverData } from './CountryHoverPopup';


const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-signal-darker flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 relative">
          <div className="absolute inset-0 border-2 border-signal-cyan/20 rounded-full animate-ping" />
          <div className="absolute inset-2 border border-signal-cyan/30 rounded-full animate-pulse" />
          <div className="absolute inset-4 border border-signal-cyan/60 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-signal-cyan rounded-full" style={{ boxShadow: '0 0 8px rgba(0,212,255,0.6)' }} />
          </div>
        </div>
        <div className="font-display text-signal-cyan text-sm tracking-[0.3em] loading-pulse glow-text-cyan">
          INITIALIZING MAP
        </div>
        <div className="text-signal-muted text-xs mt-1 font-mono">
          Loading tactical interface...
        </div>
      </div>
    </div>
  ),
});

interface DynamicMapProps {
  points: MapPoint[];
  onSightingClick: (id: number) => void;
  isLoading: boolean;
  noData: boolean;
  heatmapEnabled: boolean;
  heatmapMode: HeatmapMode;
  countryBounds?: [[number, number], [number, number]] | null;
  onCountryHover?: (data: CountryHoverData | null) => void;
  onCountryClick?: (code: string) => void;
}

export default function DynamicMap(props: DynamicMapProps) {
  return <MapView {...props} />;
}

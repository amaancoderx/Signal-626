'use client';

import dynamic from 'next/dynamic';
import type { MapPoint, HeatmapMode } from '@/lib/types';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-signal-darker flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 relative">
          <div className="absolute inset-0 border-2 border-white/20 rounded-full animate-ping" />
          <div className="absolute inset-2 border border-white/30 rounded-full animate-pulse" />
          <div className="absolute inset-4 border border-white/60 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>
        <div className="font-display text-white text-sm tracking-[0.3em] loading-pulse">
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
}

export default function DynamicMap(props: DynamicMapProps) {
  return <MapView {...props} />;
}

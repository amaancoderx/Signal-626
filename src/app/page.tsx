'use client';

import { useState, useCallback, useMemo } from 'react';
import DynamicMap from '@/components/Map/DynamicMap';
import TimelineControl from '@/components/Timeline/TimelineControl';
import SightingPanel from '@/components/Panel/SightingPanel';
import StatsHUD from '@/components/HUD/StatsHUD';
import FilterBar from '@/components/Filters/FilterBar';
import { useTimeline } from '@/hooks/useTimeline';
import { useSightings } from '@/hooks/useSightings';
import { useYearCounts } from '@/hooks/useYearCounts';
import { useStats } from '@/hooks/useStats';
import type { MapPoint, HeatmapMode } from '@/lib/types';

export default function HomePage() {
  const timeline = useTimeline();
  const [selectedSighting, setSelectedSighting] = useState<number | null>(null);
  const [selectedShape, setSelectedShape] = useState<string>('All');
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('density');

  // Data fetching
  const { data: sightingsData, isLoading: sightingsLoading } = useSightings(
    timeline.year,
    selectedShape
  );
  const { data: yearCountsData } = useYearCounts();
  const { data: statsData } = useStats();

  // Derived data
  const points: MapPoint[] = useMemo(
    () => sightingsData?.sightings || [],
    [sightingsData]
  );

  const yearCount = useMemo(() => {
    if (sightingsData) return sightingsData.count;
    if (yearCountsData?.yearCounts) {
      const yc = yearCountsData.yearCounts.find((y) => y.year === timeline.year);
      return yc?.count || 0;
    }
    return 0;
  }, [sightingsData, yearCountsData, timeline.year]);

  const yearCounts = useMemo(
    () => yearCountsData?.yearCounts || [],
    [yearCountsData]
  );

  const allShapes = useMemo(
    () => statsData?.allShapes || [],
    [statsData]
  );

  // Handlers
  const handleSightingClick = useCallback((id: number) => {
    setSelectedSighting(id);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedSighting(null);
  }, []);

  const handleExportYear = useCallback(() => {
    if (!sightingsData?.sightings) return;
    const blob = new Blob(
      [JSON.stringify(sightingsData.sightings, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signal626_${timeline.year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sightingsData, timeline.year]);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-signal-darker">
      {/* Stats HUD - Top */}
      <div className="absolute top-0 left-0 right-0 z-[1100]">
        <StatsHUD
          totalReports={statsData?.totalReports || 150554}
          currentYear={timeline.year}
          yearReports={yearCount}
          isPlaying={timeline.isPlaying}
          isLoading={sightingsLoading}
          onTogglePlay={timeline.togglePlay}
        />
      </div>

      {/* Map - Full screen */}
      <div className="absolute inset-0">
        <DynamicMap
          points={points}
          onSightingClick={handleSightingClick}
          isLoading={sightingsLoading}
          noData={!sightingsLoading && points.length === 0}
          heatmapEnabled={heatmapEnabled}
          heatmapMode={heatmapMode}
        />
      </div>

      {/* Filter Bar - Left side (below header) */}
      <FilterBar
        shapes={allShapes}
        selectedShape={selectedShape}
        onShapeChange={setSelectedShape}
        heatmapEnabled={heatmapEnabled}
        onHeatmapToggle={() => setHeatmapEnabled(!heatmapEnabled)}
        heatmapMode={heatmapMode}
        onHeatmapModeChange={setHeatmapMode}
        onExportYear={handleExportYear}
        onFullscreen={handleFullscreen}
      />

      {/* Sighting Detail Panel - Right side (opens on marker click) */}
      <SightingPanel sightingId={selectedSighting} onClose={handleClosePanel} />

      {/* Timeline Control - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-[1100]">
        <TimelineControl
          year={timeline.year}
          isPlaying={timeline.isPlaying}
          speed={timeline.speed}
          yearCount={yearCount}
          yearCounts={yearCounts}
          onYearChange={timeline.setYear}
          onTogglePlay={timeline.togglePlay}
          onSpeedChange={timeline.setSpeed}
          onStepForward={timeline.stepForward}
          onStepBackward={timeline.stepBackward}
        />
      </div>

      {/* Corner decorations - white accent lines */}
      <div className="absolute top-12 left-0 w-20 h-px bg-gradient-to-r from-white/15 to-transparent z-[1050]" />
      <div className="absolute top-12 right-0 w-20 h-px bg-gradient-to-l from-white/15 to-transparent z-[1050]" />
    </div>
  );
}

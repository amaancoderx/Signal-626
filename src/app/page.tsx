'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import DynamicMap from '@/components/Map/DynamicMap';
import TimelineControl from '@/components/Timeline/TimelineControl';
import SightingPanel from '@/components/Panel/SightingPanel';
import IntelligencePanel from '@/components/Panel/IntelligencePanel';
import StatsHUD from '@/components/HUD/StatsHUD';
import AnomalyIndex from '@/components/HUD/AnomalyIndex';
import FilterBar from '@/components/Filters/FilterBar';
import StarField from '@/components/StarField';
import CountryHoverPopup from '@/components/Map/CountryHoverPopup';
import type { CountryHoverData } from '@/components/Map/CountryHoverPopup';
import { useTimeline } from '@/hooks/useTimeline';
import { useSightings } from '@/hooks/useSightings';
import { useYearCounts } from '@/hooks/useYearCounts';
import { useStats } from '@/hooks/useStats';
import { useSignalReplay } from '@/hooks/useSignalReplay';
import { getCountryByCode, COUNTRIES } from '@/lib/countries';
import { MAX_YEAR, MIN_YEAR } from '@/lib/constants';
import type { MapPoint, HeatmapMode, TimelineMode } from '@/lib/types';
import { filterByCountryBounds } from '@/lib/intelligence';
import type { AnomalyLevel } from '@/lib/intelligence';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const timeline = useTimeline();
  const [selectedSighting, setSelectedSighting] = useState<number | null>(null);
  const [selectedShape, setSelectedShape] = useState<string>('All');
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('density');
  const [selectedCountry, setSelectedCountry] = useState<string>('World');
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('year');
  const [signalPlaying, setSignalPlaying] = useState(false);
  const [countryHover, setCountryHover] = useState<CountryHoverData | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Data fetching
  const { data: sightingsData, isLoading: sightingsLoading, isFetching: sightingsFetching } = useSightings(
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

  // Country bounds for map zoom
  const countryBounds = useMemo(() => {
    if (selectedCountry === 'World') return null;
    const country = getCountryByCode(selectedCountry);
    return country?.bounds ?? null;
  }, [selectedCountry]);

  // Country hover data: compute report count + anomaly for hovered country
  const hoverStats = useMemo(() => {
    if (!countryHover) return { totalReports: 0, anomalyScore: 0, anomalyLevel: 'LOW' as AnomalyLevel };

    const country = COUNTRIES.find(c => c.code === countryHover.code);
    if (!country) return { totalReports: 0, anomalyScore: 0, anomalyLevel: 'LOW' as AnomalyLevel };

    const countryPoints = filterByCountryBounds(points, country.bounds, country.name);
    const total = countryPoints.length;

    // Quick anomaly score: country density vs global average
    const globalAvg = points.length / Math.max(COUNTRIES.length, 1);
    const ratio = globalAvg > 0 ? total / globalAvg : 0;
    const score = Math.min(100, Math.round(ratio * 15));
    const level: AnomalyLevel = score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW';

    return { totalReports: total, anomalyScore: score, anomalyLevel: level };
  }, [countryHover, points]);

  // Debounced country hover handler — prevents flicker
  const handleCountryHover = useCallback((data: CountryHoverData | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (data) {
      setCountryHover(data);
    } else {
      // Small delay on leave to prevent flicker between country polygons
      hoverTimeoutRef.current = setTimeout(() => setCountryHover(null), 80);
    }
  }, []);

  // Open intelligence panel from hover popup — only if country is in our database
  const handleCountryClickFromMap = useCallback((code: string) => {
    setCountryHover(null);
    const country = getCountryByCode(code);
    if (country) {
      setSelectedCountry(code);
    }
  }, []);

  // Signal replay hook
  const signalReplay = useSignalReplay({
    points,
    year: timeline.year,
    speed: timeline.speed,
    isPlaying: signalPlaying,
    enabled: timelineMode === 'signal',
    onYearComplete: useCallback(() => {
      // Auto-advance to next year when signal replay finishes
      setSignalPlaying(false);
      const nextYear = timeline.year + 1;
      if (nextYear <= MAX_YEAR) {
        // Small delay before advancing
        setTimeout(() => {
          timeline.setYear(nextYear);
          // Auto-start replay for next year
          setTimeout(() => setSignalPlaying(true), 500);
        }, 1000);
      }
    }, [timeline]),
  });

  // Points to render on map: signal mode shows incremental, year mode shows all
  const mapPoints = timelineMode === 'signal' ? signalReplay.visiblePoints : points;

  // Handle mode change
  const handleModeChange = useCallback((mode: TimelineMode) => {
    setTimelineMode(mode);
    setSignalPlaying(false);
    if (mode === 'signal') {
      // Pause year auto-play when entering signal mode
      if (timeline.isPlaying) timeline.pause();
      signalReplay.reset();
    }
  }, [timeline, signalReplay]);

  // Override play/pause for signal mode
  const handleTogglePlay = useCallback(() => {
    if (timelineMode === 'signal') {
      if (signalReplay.isComplete) {
        signalReplay.reset();
        setSignalPlaying(true);
      } else {
        setSignalPlaying(prev => !prev);
      }
    } else {
      timeline.togglePlay();
    }
  }, [timelineMode, timeline, signalReplay]);

  // Override step for signal mode (step = change year + reset replay)
  const handleStepForward = useCallback(() => {
    if (timelineMode === 'signal') {
      setSignalPlaying(false);
      signalReplay.reset();
      const next = timeline.year + 1;
      timeline.setYear(next > MAX_YEAR ? MIN_YEAR : next);
    } else {
      timeline.stepForward();
    }
  }, [timelineMode, timeline, signalReplay]);

  const handleStepBackward = useCallback(() => {
    if (timelineMode === 'signal') {
      setSignalPlaying(false);
      signalReplay.reset();
      const prev = timeline.year - 1;
      timeline.setYear(prev < MIN_YEAR ? MAX_YEAR : prev);
    } else {
      timeline.stepBackward();
    }
  }, [timelineMode, timeline, signalReplay]);

  // When year changes in signal mode, reset replay
  const handleYearChange = useCallback((year: number) => {
    timeline.setYear(year);
    if (timelineMode === 'signal') {
      setSignalPlaying(false);
      signalReplay.reset();
    }
  }, [timeline, timelineMode, signalReplay]);

  // Handlers
  const handleSightingClick = useCallback((id: number) => {
    setSelectedSighting(id);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedSighting(null);
  }, []);

  const handleCountryChange = useCallback((country: string) => {
    setSelectedCountry(country);
  }, []);

  const handleCloseIntelligence = useCallback(() => {
    setSelectedCountry('World');
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

  if (!mounted) {
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-[#05070B] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-2 border-signal-cyan/20 rounded-full animate-ping" />
            <div className="absolute inset-2 border border-signal-cyan/30 rounded-full animate-pulse" />
            <div className="absolute inset-4 border border-signal-cyan/60 rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-signal-cyan rounded-full" style={{ boxShadow: '0 0 8px rgba(0,229,255,0.6)' }} />
            </div>
          </div>
          <div className="font-display text-signal-cyan text-sm tracking-[0.3em]" style={{ textShadow: '0 0 10px rgba(0,229,255,0.6)' }}>
            SIGNAL 626
          </div>
          <div className="text-signal-muted text-xs mt-1 font-mono">
            Initializing tactical interface...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05070B]">
      {/* Animated star field background */}
      <StarField />

      {/* Stats HUD - Top */}
      <div className="absolute top-0 left-0 right-0 z-[1100]">
        <StatsHUD
          totalReports={statsData?.totalReports || 150554}
          currentYear={timeline.year}
          yearReports={yearCount}
          isPlaying={timeline.isPlaying}
          isLoading={sightingsLoading}
          onTogglePlay={timeline.togglePlay}
          selectedCountry={selectedCountry}
          onCountryChange={handleCountryChange}
        />
      </div>

      {/* Map - Full screen */}
      <div className="absolute inset-0">
        <DynamicMap
          points={mapPoints}
          onSightingClick={handleSightingClick}
          isLoading={sightingsLoading}
          noData={!sightingsLoading && !sightingsFetching && points.length === 0}
          heatmapEnabled={heatmapEnabled}
          heatmapMode={heatmapMode}
          countryBounds={countryBounds}
          onCountryHover={handleCountryHover}
          onCountryClick={handleCountryClickFromMap}
        />
      </div>

      {/* Filter Bar - Left side */}
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

      {/* Country badge — shows when zoomed to a country */}
      {selectedCountry !== 'World' && (
        <div className="absolute top-[56px] sm:top-[72px] md:top-[84px] left-1/2 -translate-x-1/2 z-[1050]">
          <button
            onClick={() => setSelectedCountry('World')}
            className="glass-panel-cyan rounded-full px-4 py-1.5 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group"
            style={{ boxShadow: '0 0 20px rgba(0,212,255,0.15)' }}
          >
            <span className="font-display text-xs tracking-wider text-signal-cyan glow-text-cyan font-bold">
              {getCountryByCode(selectedCountry)?.name?.toUpperCase() || selectedCountry}
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-signal-muted group-hover:text-signal-red transition-colors">
              <path d="M2 2L8 8M2 8L8 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Global Anomaly Index — right side below zoom controls */}
      <div className="absolute top-[160px] sm:top-[190px] md:top-[210px] right-2 sm:right-3 z-[1050]">
        <AnomalyIndex
          year={timeline.year}
          yearCount={yearCount}
          yearCounts={yearCounts}
          points={points}
        />
      </div>

      {/* Country Hover Preview Popup */}
      <CountryHoverPopup
        hover={countryHover}
        totalReports={hoverStats.totalReports}
        anomalyScore={hoverStats.anomalyScore}
        anomalyLevel={hoverStats.anomalyLevel}
        onOpenIntelligence={handleCountryClickFromMap}
      />

      {/* Intelligence Panel — right side, replaces old StatsPanel */}
      <IntelligencePanel
        points={points}
        yearCount={yearCount}
        year={timeline.year}
        selectedCountry={selectedCountry}
        yearCounts={yearCounts}
        isLoading={sightingsLoading}
        onClose={handleCloseIntelligence}
      />

      {/* Sighting Detail Panel */}
      <SightingPanel sightingId={selectedSighting} onClose={handleClosePanel} />

      {/* Timeline Control - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-[1100]">
        <TimelineControl
          year={timeline.year}
          isPlaying={timelineMode === 'signal' ? signalPlaying : timeline.isPlaying}
          speed={timeline.speed}
          yearCount={yearCount}
          yearCounts={yearCounts}
          onYearChange={handleYearChange}
          onTogglePlay={handleTogglePlay}
          onSpeedChange={timeline.setSpeed}
          onStepForward={handleStepForward}
          onStepBackward={handleStepBackward}
          timelineMode={timelineMode}
          onModeChange={handleModeChange}
          signalMonth={signalReplay.currentMonth}
          signalDay={signalReplay.currentDay}
          signalTime={signalReplay.currentTime}
          signalEventsShown={signalReplay.eventsShown}
          signalTotalEvents={signalReplay.totalEvents}
          signalIsComplete={signalReplay.isComplete}
        />
      </div>

      {/* Corner neon decorations */}
      <div className="absolute top-12 left-0 w-24 h-px z-[1050]" style={{ background: 'linear-gradient(90deg, rgba(0,212,255,0.2), transparent)' }} />
      <div className="absolute top-12 right-0 w-24 h-px z-[1050]" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.2))' }} />
      {/* Corner brackets */}
      <div className="absolute top-3 left-3 w-5 h-5 z-[1050] pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-px" style={{ background: 'rgba(0,212,255,0.2)' }} />
        <div className="absolute top-0 left-0 h-full w-px" style={{ background: 'rgba(0,212,255,0.2)' }} />
      </div>
      <div className="absolute top-3 right-3 w-5 h-5 z-[1050] pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-px" style={{ background: 'rgba(0,212,255,0.2)' }} />
        <div className="absolute top-0 right-0 h-full w-px" style={{ background: 'rgba(0,212,255,0.2)' }} />
      </div>
      <div className="absolute bottom-3 left-3 w-5 h-5 z-[1050] pointer-events-none">
        <div className="absolute bottom-0 left-0 w-full h-px" style={{ background: 'rgba(0,212,255,0.2)' }} />
        <div className="absolute bottom-0 left-0 h-full w-px" style={{ background: 'rgba(0,212,255,0.2)' }} />
      </div>
      <div className="absolute bottom-3 right-3 w-5 h-5 z-[1050] pointer-events-none">
        <div className="absolute bottom-0 right-0 w-full h-px" style={{ background: 'rgba(0,212,255,0.2)' }} />
        <div className="absolute bottom-0 right-0 h-full w-px" style={{ background: 'rgba(0,212,255,0.2)' }} />
      </div>
    </div>
  );
}

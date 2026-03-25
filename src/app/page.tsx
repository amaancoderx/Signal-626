'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import DynamicMap from '@/components/Map/DynamicMap';
import TimelineControl from '@/components/Timeline/TimelineControl';
import SightingPanel from '@/components/Panel/SightingPanel';
import RightPanel from '@/components/Panel/RightPanel';
import FilterBar from '@/components/Filters/FilterBar';
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

  const { data: sightingsData, isLoading: sightingsLoading, isFetching: sightingsFetching } = useSightings(
    timeline.year, selectedShape
  );
  const { data: yearCountsData } = useYearCounts();
  const { data: statsData } = useStats();

  const points: MapPoint[] = useMemo(() => sightingsData?.sightings || [], [sightingsData]);

  const yearCount = useMemo(() => {
    if (sightingsData) return sightingsData.count;
    if (yearCountsData?.yearCounts) {
      const yc = yearCountsData.yearCounts.find((y) => y.year === timeline.year);
      return yc?.count || 0;
    }
    return 0;
  }, [sightingsData, yearCountsData, timeline.year]);

  const yearCounts = useMemo(() => yearCountsData?.yearCounts || [], [yearCountsData]);
  const allShapes = useMemo(() => statsData?.allShapes || [], [statsData]);

  const countryBounds = useMemo(() => {
    if (selectedCountry === 'World') return null;
    const country = getCountryByCode(selectedCountry);
    return country?.bounds ?? null;
  }, [selectedCountry]);

  const hoverStats = useMemo(() => {
    if (!countryHover) return { totalReports: 0, anomalyScore: 0, anomalyLevel: 'LOW' as AnomalyLevel };
    const country = COUNTRIES.find(c => c.code === countryHover.code);
    if (!country) return { totalReports: 0, anomalyScore: 0, anomalyLevel: 'LOW' as AnomalyLevel };
    const countryPoints = filterByCountryBounds(points, country.bounds, country.name);
    const total = countryPoints.length;
    const globalAvg = points.length / Math.max(COUNTRIES.length, 1);
    const ratio = globalAvg > 0 ? total / globalAvg : 0;
    const score = Math.min(100, Math.round(ratio * 15));
    const level: AnomalyLevel = score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW';
    return { totalReports: total, anomalyScore: score, anomalyLevel: level };
  }, [countryHover, points]);

  const handleCountryHover = useCallback((data: CountryHoverData | null) => {
    if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }
    if (data) { setCountryHover(data); }
    else { hoverTimeoutRef.current = setTimeout(() => setCountryHover(null), 80); }
  }, []);

  const handleCountryClickFromMap = useCallback((code: string) => {
    setCountryHover(null);
    setSelectedSighting(null);
    const country = getCountryByCode(code);
    if (country) setSelectedCountry(code);
  }, []);

  const signalReplay = useSignalReplay({
    points, year: timeline.year, speed: timeline.speed,
    isPlaying: signalPlaying, enabled: timelineMode === 'signal',
    onYearComplete: useCallback(() => {
      setSignalPlaying(false);
      const nextYear = timeline.year + 1;
      if (nextYear <= MAX_YEAR) {
        setTimeout(() => { timeline.setYear(nextYear); setTimeout(() => setSignalPlaying(true), 500); }, 1000);
      }
    }, [timeline]),
  });

  const mapPoints = timelineMode === 'signal' ? signalReplay.visiblePoints : points;

  const handleModeChange = useCallback((mode: TimelineMode) => {
    setTimelineMode(mode); setSignalPlaying(false);
    if (mode === 'signal') { if (timeline.isPlaying) timeline.pause(); signalReplay.reset(); }
  }, [timeline, signalReplay]);

  const handleTogglePlay = useCallback(() => {
    if (timelineMode === 'signal') {
      if (signalReplay.isComplete) { signalReplay.reset(); setSignalPlaying(true); }
      else { setSignalPlaying(prev => !prev); }
    } else { timeline.togglePlay(); }
  }, [timelineMode, timeline, signalReplay]);

  const handleStepForward = useCallback(() => {
    if (timelineMode === 'signal') {
      setSignalPlaying(false); signalReplay.reset();
      const next = timeline.year + 1;
      timeline.setYear(next > MAX_YEAR ? MIN_YEAR : next);
    } else { timeline.stepForward(); }
  }, [timelineMode, timeline, signalReplay]);

  const handleStepBackward = useCallback(() => {
    if (timelineMode === 'signal') {
      setSignalPlaying(false); signalReplay.reset();
      const prev = timeline.year - 1;
      timeline.setYear(prev < MIN_YEAR ? MAX_YEAR : prev);
    } else { timeline.stepBackward(); }
  }, [timelineMode, timeline, signalReplay]);

  const handleYearChange = useCallback((year: number) => {
    timeline.setYear(year);
    if (timelineMode === 'signal') { setSignalPlaying(false); signalReplay.reset(); }
  }, [timeline, timelineMode, signalReplay]);

  const handleExportYear = useCallback(() => {
    if (!sightingsData?.sightings) return;
    const blob = new Blob([JSON.stringify(sightingsData.sightings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `signal626_${timeline.year}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [sightingsData, timeline.year]);

  if (!mounted) {
    return (
      <div className="w-screen h-screen flex items-center justify-center" style={{ background: '#0B1120' }}>
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          <div className="font-display text-cyan-400/80 text-sm tracking-[0.2em]">SIGNAL 626</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col" style={{ background: '#0B1120' }}>

      {/* ═══ TOP BAR ═══ */}
      <header
        className="flex items-center h-12 sm:h-14 px-4 sm:px-6 flex-shrink-0"
        style={{ background: '#0A1020', borderBottom: '1px solid rgba(0, 229, 255, 0.06)' }}
      >
        <div className="flex items-center gap-3 mr-6">
          <div className="w-7 h-7 sm:w-8 sm:h-8 relative flex-shrink-0">
            <img src="/logo.png" alt="" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="font-display text-xs sm:text-sm font-bold tracking-[0.1em] text-white">SIGNAL 626</div>
            <div className="text-[8px] tracking-[0.12em] text-slate-500 hidden sm:block">UFO INTELLIGENCE</div>
          </div>
        </div>

        <div className="h-6 w-px bg-white/6 mx-2 hidden sm:block" />

        {/* Stats */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div>
            <div className="text-[8px] sm:text-[9px] tracking-[0.1em] text-slate-500 uppercase">Reports</div>
            <div className="font-display text-sm sm:text-base font-bold text-cyan-400">
              {(statsData?.totalReports || 150554).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[8px] sm:text-[9px] tracking-[0.1em] text-slate-500 uppercase">Year</div>
            <div className="font-display text-sm sm:text-base font-bold text-white">{timeline.year}</div>
          </div>
          <div className="hidden sm:block">
            <div className="text-[8px] sm:text-[9px] tracking-[0.1em] text-slate-500 uppercase">Year Count</div>
            <div className="font-display text-sm sm:text-base font-bold text-cyan-400">{yearCount.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex-1" />

        {/* Status */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${sightingsLoading ? 'bg-amber-400 animate-pulse' : timeline.isPlaying ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className={`text-[9px] sm:text-[10px] font-display tracking-[0.1em] font-bold ${sightingsLoading ? 'text-amber-400' : timeline.isPlaying ? 'text-cyan-400' : 'text-slate-500'}`}>
            {sightingsLoading ? 'LOADING' : timeline.isPlaying ? 'LIVE' : 'IDLE'}
          </span>
        </div>
      </header>

      {/* ═══ MAIN CONTENT: Map + Right Panel ═══ */}
      <div className="flex flex-1 min-h-0">

        {/* Map area */}
        <div className="flex-1 relative min-w-0">
          <DynamicMap
            points={mapPoints}
            onSightingClick={(id) => setSelectedSighting(id)}
            isLoading={sightingsLoading}
            noData={!sightingsLoading && !sightingsFetching && points.length === 0}
            heatmapEnabled={heatmapEnabled}
            heatmapMode={heatmapMode}
            countryBounds={countryBounds}
            onCountryHover={handleCountryHover}
            onCountryClick={handleCountryClickFromMap}
          />

          {/* Filter buttons - top-left of map */}
          <FilterBar
            shapes={allShapes}
            selectedShape={selectedShape}
            onShapeChange={setSelectedShape}
            heatmapEnabled={heatmapEnabled}
            onHeatmapToggle={() => setHeatmapEnabled(!heatmapEnabled)}
            heatmapMode={heatmapMode}
            onHeatmapModeChange={setHeatmapMode}
            onExportYear={handleExportYear}
            onFullscreen={() => {
              if (!document.fullscreenElement) document.documentElement.requestFullscreen();
              else document.exitFullscreen();
            }}
          />

          {/* Country hover popup */}
          <CountryHoverPopup
            hover={countryHover}
            totalReports={hoverStats.totalReports}
            anomalyScore={hoverStats.anomalyScore}
            anomalyLevel={hoverStats.anomalyLevel}
            onOpenIntelligence={handleCountryClickFromMap}
          />
        </div>

        {/* Right Panel - solid background */}
        <RightPanel
          points={points}
          yearCount={yearCount}
          year={timeline.year}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
          yearCounts={yearCounts}
          isLoading={sightingsLoading}
        />
      </div>

      {/* ═══ BOTTOM TIMELINE BAR ═══ */}
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

      {/* Sighting detail panel - overlay */}
      <SightingPanel sightingId={selectedSighting} onClose={() => setSelectedSighting(null)} />
    </div>
  );
}

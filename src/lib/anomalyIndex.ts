import type { YearCount, MapPoint } from './types';

export type AnomalyStatus = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export interface AnomalyData {
  index: number;        // 0-100 scale
  status: AnomalyStatus;
  delta: number;        // year-over-year change %
  hotspot: [number, number] | null; // [lat, lng] of densest cluster
}

/**
 * Compute a Global Anomaly Index from year counts and current points.
 *
 * Formula factors:
 *  - Year-over-year growth rate (spike detection)
 *  - Absolute count vs historical median
 *  - Clustering density (geographic concentration)
 *
 * Result is normalized to 0-100.
 */
export function computeAnomalyIndex(
  currentYear: number,
  yearCount: number,
  yearCounts: YearCount[],
  points: MapPoint[],
): AnomalyData {
  if (!yearCounts.length || yearCount === 0) {
    return { index: 0, status: 'LOW', delta: 0, hotspot: null };
  }

  // 1. Historical median
  const sorted = yearCounts.map(y => y.count).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 1;

  // 2. Previous year count
  const prevYC = yearCounts.find(y => y.year === currentYear - 1);
  const prevCount = prevYC?.count || 0;
  const delta = prevCount > 0 ? ((yearCount - prevCount) / prevCount) * 100 : 0;

  // 3. Ratio to median (how far above/below typical)
  const medianRatio = yearCount / Math.max(median, 1);

  // 4. Geographic clustering density — grid-based
  let clusterScore = 0;
  let hotspot: [number, number] | null = null;

  if (points.length > 0) {
    const gridSize = 5; // degrees
    const grid: Record<string, { count: number; lat: number; lng: number }> = {};
    for (const p of points) {
      const key = `${Math.floor(p.latitude / gridSize)},${Math.floor(p.longitude / gridSize)}`;
      if (!grid[key]) grid[key] = { count: 0, lat: 0, lng: 0 };
      grid[key].count++;
      grid[key].lat += p.latitude;
      grid[key].lng += p.longitude;
    }

    let maxCell = 0;
    for (const cell of Object.values(grid)) {
      if (cell.count > maxCell) {
        maxCell = cell.count;
        hotspot = [cell.lat / cell.count, cell.lng / cell.count];
      }
    }

    // Concentration: how much of total is in the top cell
    clusterScore = points.length > 0 ? (maxCell / points.length) : 0;
  }

  // 5. Composite index
  // Weight: spike=35%, magnitude=40%, clustering=25%
  const spikeComponent = Math.min(Math.abs(delta) / 100, 1) * 35;
  const magnitudeComponent = Math.min(medianRatio / 3, 1) * 40;
  const clusterComponent = Math.min(clusterScore * 4, 1) * 25;

  const raw = spikeComponent + magnitudeComponent + clusterComponent;
  const index = Math.min(Math.round(raw * 10) / 10, 100);

  // 6. Status thresholds
  let status: AnomalyStatus = 'LOW';
  if (index >= 75) status = 'CRITICAL';
  else if (index >= 50) status = 'HIGH';
  else if (index >= 25) status = 'ELEVATED';

  return { index, status, delta: Math.round(delta * 10) / 10, hotspot };
}

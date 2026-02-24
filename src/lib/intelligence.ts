/**
 * Intelligence Data Processing System
 * Calculates country-level analytics from sighting data
 */
import type { MapPoint, YearCount } from './types';
import { COUNTRIES } from './countries';

export interface MonthlyData {
  month: number;
  label: string;
  count: number;
}

export interface YearlyTrend {
  year: number;
  count: number;
}

export interface HotspotRegion {
  name: string;
  count: number;
  percentage: number;
}

export interface ShapeCount {
  shape: string;
  count: number;
  pct: number;
}

export type AnomalyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IntelligenceReport {
  countryCode: string;
  countryName: string;
  year: number | 'all';
  totalYear: number;
  totalAllTime: number;
  peakMonth: string | null;
  monthlyDistribution: MonthlyData[];
  yearlyTrend: YearlyTrend[];
  hotspotRegions: HotspotRegion[];
  topShapes: ShapeCount[];
  anomalyLevel: AnomalyLevel;
  anomalyScore: number;
}

const MONTH_LABELS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * All known country names (lowercase) for location-based filtering.
 * Used to detect when a sighting's location mentions a different country.
 */
const ALL_COUNTRY_NAMES = COUNTRIES.map(c => c.name.toLowerCase());

/** Common aliases used in NUFORC location strings */
const COUNTRY_ALIASES: Record<string, string[]> = {
  'United States': ['usa', 'u.s.a', 'u.s.', 'united states'],
  'United Kingdom': ['uk', 'u.k.', 'england', 'scotland', 'wales', 'northern ireland'],
  'South Korea': ['korea'],
  'United Arab Emirates': ['uae', 'u.a.e'],
  'Dem. Rep. Congo': ['democratic republic of the congo', 'drc'],
  'Bosnia and Herzegovina': ['bosnia'],
  'Czech Republic': ['czechia'],
  'Ivory Coast': ["cote d'ivoire", 'côte d\'ivoire'],
};

/**
 * Extract country identifier from a NUFORC location string.
 * NUFORC international locations typically use formats like:
 *   "Karachi (Pakistan)", "New Delhi (India)", "London, England (UK)"
 * Returns the matched country name (lowercase) or null if no country detected.
 */
function detectCountryInLocation(location: string | null): string | null {
  if (!location) return null;
  const locLower = location.toLowerCase();

  // 1. Check parenthesized suffix: "City (Country)"
  const parenMatch = locLower.match(/\(([^)]+)\)\s*$/);
  const candidate = parenMatch
    ? parenMatch[1].trim()
    : null;

  // 2. Also check last comma-separated part: "City, Country"
  const parts = locLower.split(',');
  const lastPart = parts.length >= 2 ? parts[parts.length - 1].trim().replace(/\(.*\)/, '').trim() : null;

  // Check candidate strings against all known country names and aliases
  for (const candidates of [candidate, lastPart]) {
    if (!candidates) continue;
    // Direct country name match
    for (const name of ALL_COUNTRY_NAMES) {
      if (candidates === name || candidates.includes(name)) {
        return name;
      }
    }
    // Alias match
    for (const [countryName, aliases] of Object.entries(COUNTRY_ALIASES)) {
      for (const alias of aliases) {
        if (candidates === alias || candidates.includes(alias)) {
          return countryName.toLowerCase();
        }
      }
    }
  }

  return null;
}

export function filterByCountryBounds(
  points: MapPoint[],
  bounds: [[number, number], [number, number]],
  targetCountryName?: string
): MapPoint[] {
  const [[south, west], [north, east]] = bounds;
  const inBounds = points.filter(
    (p) => p.latitude >= south && p.latitude <= north && p.longitude >= west && p.longitude <= east
  );

  // If no country name provided, just return bounding box results
  if (!targetCountryName) return inBounds;

  const targetLower = targetCountryName.toLowerCase();

  // Also collect aliases for the target country
  const targetAliases = COUNTRY_ALIASES[targetCountryName]?.map(a => a.toLowerCase()) || [];

  // Secondary filter: use location field to exclude points that belong to a different country
  return inBounds.filter(p => {
    const detectedCountry = detectCountryInLocation(p.location);
    // No country detected in location string → keep (benefit of the doubt from bounding box)
    if (!detectedCountry) return true;
    // Location mentions the target country → definitely include
    if (detectedCountry === targetLower) return true;
    // Check aliases
    if (targetAliases.includes(detectedCountry)) return true;
    // Location mentions a DIFFERENT country → exclude
    return false;
  });
}

function calcMonthlyDistribution(points: MapPoint[]): MonthlyData[] {
  const months = new Array(12).fill(0);
  for (const p of points) {
    if (p.occurred) {
      try {
        const m = new Date(p.occurred).getMonth();
        if (m >= 0 && m < 12) months[m]++;
      } catch { /* skip */ }
    }
  }
  return months.map((count, i) => ({ month: i, label: MONTH_LABELS[i], count }));
}

function calcHotspots(points: MapPoint[], limit = 8): HotspotRegion[] {
  const regionCounts: Record<string, number> = {};
  const total = points.length;
  for (const p of points) {
    if (!p.location) continue;
    const parts = p.location.split(',').map((s) => s.trim());
    const region = parts[0] || 'Unknown';
    if (region && region.length > 1) {
      const clean = region.replace(/\s*\([^)]*\)\s*/g, '').trim();
      if (clean) regionCounts[clean] = (regionCounts[clean] || 0) + 1;
    }
  }
  return Object.entries(regionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
}

function calcTopShapes(points: MapPoint[], limit = 7): ShapeCount[] {
  if (!points.length) return [];
  const counts: Record<string, number> = {};
  for (const p of points) {
    const shape = p.shape || 'Unknown';
    counts[shape] = (counts[shape] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([shape, count]) => ({
      shape,
      count,
      pct: Math.round((count / points.length) * 100),
    }));
}

function calcAnomalyLevel(
  yearCount: number,
  yearlyTrend: YearlyTrend[]
): { level: AnomalyLevel; score: number } {
  if (yearlyTrend.length < 2) return { level: 'LOW', score: 10 };
  const counts = yearlyTrend.map((y) => y.count).filter((c) => c > 0);
  if (counts.length < 2) return { level: 'LOW', score: 10 };
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const stdDev = Math.sqrt(counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / counts.length);
  if (stdDev === 0) return { level: 'LOW', score: 15 };
  const zScore = Math.abs((yearCount - mean) / stdDev);
  const score = Math.min(100, Math.round(zScore * 25));
  if (zScore < 0.5) return { level: 'LOW', score: Math.max(score, 5) };
  if (zScore < 1.5) return { level: 'MEDIUM', score };
  if (zScore < 2.5) return { level: 'HIGH', score };
  return { level: 'CRITICAL', score };
}

export function buildIntelligenceReport(
  countryCode: string,
  countryName: string,
  year: number | 'all',
  currentYearPoints: MapPoint[],
  yearCounts: YearCount[],
  countryBounds: [[number, number], [number, number]]
): IntelligenceReport {
  // Filter points to ONLY those within the country bounds + location verification
  const countryPoints = filterByCountryBounds(currentYearPoints, countryBounds, countryName);

  // Yearly trend: use GLOBAL yearCounts (we don't have per-country historical data)
  // This is clearly labeled in the UI as such
  const yearlyTrend: YearlyTrend[] = yearCounts
    .filter((yc) => Number(yc.count) > 0)
    .map((yc) => ({ year: Number(yc.year), count: Number(yc.count) }))
    .sort((a, b) => a.year - b.year);

  // Monthly distribution: from country-filtered points only
  const monthlyDistribution = calcMonthlyDistribution(countryPoints);
  const peakMonthData = monthlyDistribution.reduce(
    (max, m) => (m.count > max.count ? m : max),
    monthlyDistribution[0]
  );
  const peakMonth = peakMonthData && peakMonthData.count > 0 ? MONTH_FULL[peakMonthData.month] : null;

  // Hotspots: from country-filtered points only
  const hotspotRegions = calcHotspots(countryPoints);

  // Top shapes: from country-filtered points only
  const topShapes = calcTopShapes(countryPoints);

  // All-time total: global (we don't have historical per-country data)
  const totalAllTime = yearlyTrend.reduce((sum, y) => sum + y.count, 0);

  // Anomaly level: compare current country count against global trend
  const { level: anomalyLevel, score: anomalyScore } = calcAnomalyLevel(countryPoints.length, yearlyTrend);

  return {
    countryCode,
    countryName,
    year,
    totalYear: countryPoints.length,
    totalAllTime,
    peakMonth,
    monthlyDistribution,
    yearlyTrend,
    hotspotRegions,
    topShapes,
    anomalyLevel,
    anomalyScore,
  };
}

export interface Sighting {
  id: number;
  occurred: string | null;
  duration: string | null;
  num_observers: string | null;
  location: string | null;
  location_details: string | null;
  shape: string | null;
  color: string | null;
  estimated_size: string | null;
  viewed_from: string | null;
  direction_from_viewer: string | null;
  angle_of_elevation: string | null;
  closest_distance: string | null;
  estimated_speed: string | null;
  characteristics: string | null;
  summary: string | null;
  reported: string | null;
  url: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface MapPoint {
  id: number;
  latitude: number;
  longitude: number;
  shape: string | null;
  occurred: string | null;
  location: string | null;
}

export interface YearCount {
  year: number;
  count: number;
}

export interface StatsData {
  totalReports: number;
  yearRange: { min: number; max: number };
  topShapes: { shape: string; count: number }[];
  yearCounts: YearCount[];
}

export interface FilterState {
  year: number;
  shapes: string[];
  heatmapEnabled: boolean;
}

export type HeatmapMode = 'density' | 'clusters' | 'precision';

export type PlaybackSpeed = 1 | 2 | 5;

export type PlaybackDirection = 'forward' | 'reverse';

export interface TimelineState {
  year: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  direction: PlaybackDirection;
}

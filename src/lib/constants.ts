export const MIN_YEAR = 1400;
export const MAX_YEAR = 2026;
export const DEFAULT_YEAR = 2020;

export const MAP_CENTER: [number, number] = [30, 0];
export const MAP_ZOOM = 3;
export const MAP_MIN_ZOOM = 2;
export const MAP_MAX_ZOOM = 18;

export const CLUSTER_RADIUS = 60;
export const CLUSTER_MAX_ZOOM = 14;

export const PLAYBACK_INTERVAL_MS = 1200; // ms per year at 1x

export const SHAPE_COLORS: Record<string, string> = {
  Light: '#00E5FF',
  Circle: '#00FF9C',
  Triangle: '#FF3B3B',
  Sphere: '#FFB800',
  Fireball: '#ff6600',
  Disk: '#aa44ff',
  Oval: '#44aaff',
  Cylinder: '#ff44aa',
  Rectangle: '#88ff44',
  Diamond: '#ffff00',
  Chevron: '#ff8800',
  Formation: '#2BFFB5',
  Changing: '#ff00ff',
  Cigar: '#ccff00',
  Flash: '#ffffff',
  Cross: '#FF3B3B',
  Egg: '#ffcc88',
  Cone: '#88ccff',
  Star: '#ffffaa',
  Other: '#7A8A99',
  Unknown: '#556677',
  default: '#FFFFFF',
};

export function getShapeColor(shape: string | null): string {
  if (!shape) return SHAPE_COLORS.default;
  return SHAPE_COLORS[shape] || SHAPE_COLORS.default;
}

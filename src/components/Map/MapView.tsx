'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MAP_MAX_ZOOM,
  CLUSTER_RADIUS,
  CLUSTER_MAX_ZOOM,
  getShapeColor,
} from '@/lib/constants';
import type { MapPoint, HeatmapMode } from '@/lib/types';
import type { CountryHoverData } from './CountryHoverPopup';

const STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

function cleanLocation(location: string | null): string {
  if (!location) return '';
  const parts = location.split(',').map(s => s.trim()).filter(Boolean);
  const result: string[] = [];
  for (const part of parts) {
    const partLower = part.toLowerCase();
    const alreadyMentioned = result.some(r => r.toLowerCase().includes(partLower));
    if (!alreadyMentioned) result.push(part);
  }
  return result.join(', ');
}

function customizeStyle(map: maplibregl.Map) {
  const style = map.getStyle();
  if (!style || !style.layers) return;

  for (const layer of style.layers) {
    try {
      const id = layer.id;
      const type = layer.type;

      if (id === 'background' && type === 'background') {
        map.setPaintProperty(id, 'background-color', '#0c0e14');
      }

      if (id.includes('water') && !id.includes('label') && !id.includes('name')) {
        if (type === 'fill') map.setPaintProperty(id, 'fill-color', '#060810');
        else if (type === 'line') map.setPaintProperty(id, 'line-color', '#0a0e18');
      }

      if (id.includes('landuse') || id.includes('land')) {
        if (type === 'fill') map.setPaintProperty(id, 'fill-color', '#14161e');
      }

      if (id.includes('building') && type === 'fill') {
        map.setPaintProperty(id, 'fill-color', '#16181f');
        map.setPaintProperty(id, 'fill-opacity', 0.5);
      }

      const isBoundaryById = (id.includes('boundary') || id.includes('border') || id.includes('admin'));
      const isBoundaryBySource = ('source-layer' in layer && (layer as Record<string, unknown>)['source-layer'] === 'boundary');
      if ((isBoundaryById || isBoundaryBySource) && type === 'line') {
        if (id.includes('country')) {
          map.setPaintProperty(id, 'line-opacity', 0);
        } else if (id.includes('state') || id.includes('province')) {
          map.setPaintProperty(id, 'line-color', '#4a5568');
          map.setPaintProperty(id, 'line-opacity', 0.4);
          map.setPaintProperty(id, 'line-width', 0.6);
        } else {
          map.setPaintProperty(id, 'line-opacity', 0);
        }
      }

      if ((id.includes('road') || id.includes('highway') || id.includes('tunnel') || id.includes('bridge')) && type === 'line') {
        map.setPaintProperty(id, 'line-color', '#2a2e3a');
        map.setPaintProperty(id, 'line-opacity', 0.3);
      }

      if (type === 'symbol') {
        if (id.includes('country') || id.includes('continent')) {
          map.setPaintProperty(id, 'text-color', '#9ca3af');
          map.setPaintProperty(id, 'text-halo-color', '#0c0e14');
          map.setPaintProperty(id, 'text-halo-width', 2);
          map.setPaintProperty(id, 'text-halo-blur', 1);
        } else if (id.includes('state') || id.includes('province')) {
          map.setPaintProperty(id, 'text-color', '#6b7280');
          map.setPaintProperty(id, 'text-halo-color', '#0c0e14');
          map.setPaintProperty(id, 'text-halo-width', 2);
          map.setPaintProperty(id, 'text-halo-blur', 0.5);
        } else if (id.includes('place') || id.includes('city') || id.includes('town') || id.includes('village')) {
          map.setPaintProperty(id, 'text-color', '#6b7280');
          map.setPaintProperty(id, 'text-halo-color', '#0c0e14');
          map.setPaintProperty(id, 'text-halo-width', 1.5);
          map.setPaintProperty(id, 'text-halo-blur', 0.5);
        } else {
          map.setPaintProperty(id, 'text-color', '#4b5563');
          map.setPaintProperty(id, 'text-halo-color', '#0c0e14');
          map.setPaintProperty(id, 'text-halo-width', 1.5);
        }
      }
    } catch {
      // Skip unsupported properties
    }
  }
}

function setupNaturalEarthBorders(map: maplibregl.Map) {
  const style = map.getStyle();
  let insertBefore: string | undefined;
  if (style?.layers) {
    for (const layer of style.layers) {
      if (layer.type === 'symbol') { insertBefore = layer.id; break; }
    }
  }

  fetch('/ne_countries.geojson')
    .then(res => res.json())
    .then((data: GeoJSON.FeatureCollection) => {
      if (map.getSource('ne-countries')) return;

      map.addSource('ne-countries', { type: 'geojson', data, promoteId: 'ISO_A2' });

      map.addLayer({
        id: 'ne-country-fill',
        type: 'fill',
        source: 'ne-countries',
        paint: { 'fill-color': 'rgba(0,229,255,0.0)', 'fill-opacity': 0 },
      }, insertBefore);

      map.addLayer({
        id: 'ne-country-fill-hover',
        type: 'fill',
        source: 'ne-countries',
        paint: {
          'fill-color': 'rgba(0,229,255,0.04)',
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0],
        },
      }, insertBefore);

      map.addLayer({
        id: 'ne-country-border-hover',
        type: 'line',
        source: 'ne-countries',
        paint: {
          'line-color': '#00E5FF',
          'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 1.5, 0],
          'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.5, 0],
        },
      }, insertBefore);

      map.addLayer({
        id: 'ne-country-borders',
        type: 'line',
        source: 'ne-countries',
        paint: {
          'line-color': '#3a4050',
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.4, 4, 0.8, 8, 1.0],
          'line-opacity': 0.35,
        },
      }, insertBefore);
    })
    .catch(() => {});
}

/* Jitter co-located points */
function jitterColocated(points: MapPoint[]): { lng: number; lat: number }[] {
  const coords = points.map(p => ({ lng: p.longitude, lat: p.latitude }));
  const groups = new Map<string, number[]>();
  for (let i = 0; i < points.length; i++) {
    const key = `${points[i].latitude},${points[i].longitude}`;
    const arr = groups.get(key);
    if (arr) arr.push(i);
    else groups.set(key, [i]);
  }
  for (const indices of Array.from(groups.values())) {
    if (indices.length < 2) continue;
    const step = 0.0012;
    for (let k = 1; k < indices.length; k++) {
      const angle = (k / indices.length) * Math.PI * 2;
      const r = step * (1 + Math.floor(k / 8) * 0.5);
      coords[indices[k]] = {
        lng: coords[indices[k]].lng + Math.cos(angle) * r,
        lat: coords[indices[k]].lat + Math.sin(angle) * r,
      };
    }
  }
  return coords;
}

function updateSightingsSource(map: maplibregl.Map, points: MapPoint[]) {
  const jittered = jitterColocated(points);
  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: points.map((p, i) => ({
      type: 'Feature' as const,
      properties: {
        id: p.id,
        shape: p.shape || 'Unknown',
        location: p.location || '',
        color: getShapeColor(p.shape || null),
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [jittered[i].lng, jittered[i].lat],
      },
    })),
  };

  const source = map.getSource('sightings') as maplibregl.GeoJSONSource | undefined;
  if (source) source.setData(geojson);
}

function setupSightingsLayers(map: maplibregl.Map) {
  map.addSource('sightings', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterRadius: CLUSTER_RADIUS,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
  });

  /* Clusters — small, tight, minimal */
  map.addLayer({
    id: 'cluster-glow',
    type: 'circle',
    source: 'sightings',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': 'rgba(0, 180, 220, 0.06)',
      'circle-radius': ['step', ['get', 'point_count'], 18, 50, 22, 200, 28, 500, 34],
      'circle-blur': 0.5,
    },
  });

  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'sightings',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'interpolate', ['linear'], ['get', 'point_count'],
        10, 'rgba(0, 180, 220, 0.12)',
        100, 'rgba(0, 140, 200, 0.18)',
        1000, 'rgba(0, 120, 180, 0.22)',
      ],
      'circle-radius': ['step', ['get', 'point_count'], 14, 50, 18, 200, 22, 500, 28],
      'circle-stroke-color': 'rgba(0, 200, 240, 0.25)',
      'circle-stroke-width': 1,
    },
  });

  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'sightings',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': [
        'case',
        ['>=', ['get', 'point_count'], 1000],
        ['concat', ['to-string', ['/', ['round', ['/', ['get', 'point_count'], 100]], 10]], 'k'],
        ['to-string', ['get', 'point_count']],
      ],
      'text-size': 11,
      'text-font': ['Open Sans Bold'],
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': '#B8E8F0',
      'text-halo-color': 'rgba(6, 11, 20, 0.9)',
      'text-halo-width': 1.5,
    },
  });

  /* Sightings — small, precise dots */
  map.addLayer({
    id: 'sighting-glow',
    type: 'circle',
    source: 'sightings',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 5, 3, 7, 6, 10, 10, 14, 14, 18],
      'circle-opacity': 0.12,
      'circle-blur': 0.5,
    },
  });

  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const dotScale = isTouchDevice ? 1.6 : 1;

  map.addLayer({
    id: 'sighting-dots',
    type: 'circle',
    source: 'sightings',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 2.5 * dotScale, 3, 3.5 * dotScale, 6, 5 * dotScale, 10, 7 * dotScale, 14, 10 * dotScale],
      'circle-opacity': 0.9,
      'circle-stroke-color': 'rgba(255,255,255,0.12)',
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 1, 0.3, 6, 0.6, 10, 1],
    },
  });
}

/* Heatmap */
function setupHeatmapLayer(map: maplibregl.Map) {
  map.addSource('heatmap-source', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  const style = map.getStyle();
  let insertBefore: string | undefined;
  if (style?.layers) {
    for (const layer of style.layers) {
      if (layer.type === 'symbol') { insertBefore = layer.id; break; }
    }
  }

  map.addLayer({
    id: 'heatmap-layer',
    type: 'heatmap',
    source: 'heatmap-source',
    paint: {
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 2.5, 9, 5],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 18, 5, 35, 9, 55],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.9, 12, 0.5],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.1, 'rgba(10, 20, 80, 0.3)',
        0.2, 'rgba(20, 40, 140, 0.5)',
        0.35, '#1a3a9e',
        0.45, '#0066cc',
        0.55, '#0099FF',
        0.7, '#00C8E0',
        0.85, '#00E5FF',
        1.0, '#00E5FF',
      ],
    },
    layout: { visibility: 'none' },
  }, insertBefore);
}

const HEATMAP_PROFILES: Record<string, {
  intensity: maplibregl.ExpressionSpecification;
  radius: maplibregl.ExpressionSpecification;
  opacity: maplibregl.ExpressionSpecification;
}> = {
  density: {
    intensity: ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 2.5, 9, 5],
    radius: ['interpolate', ['linear'], ['zoom'], 0, 18, 5, 35, 9, 55],
    opacity: ['interpolate', ['linear'], ['zoom'], 5, 0.9, 12, 0.5],
  },
  clusters: {
    intensity: ['interpolate', ['linear'], ['zoom'], 0, 0.4, 5, 1.2, 9, 2],
    radius: ['interpolate', ['linear'], ['zoom'], 0, 40, 5, 75, 9, 110],
    opacity: ['interpolate', ['linear'], ['zoom'], 5, 0.8, 12, 0.4],
  },
  precision: {
    intensity: ['interpolate', ['linear'], ['zoom'], 0, 2, 5, 5, 9, 8],
    radius: ['interpolate', ['linear'], ['zoom'], 0, 5, 5, 12, 9, 20],
    opacity: ['interpolate', ['linear'], ['zoom'], 5, 0.95, 12, 0.7],
  },
};

function applyHeatmapMode(map: maplibregl.Map, mode: string) {
  const profile = HEATMAP_PROFILES[mode] || HEATMAP_PROFILES.density;
  try {
    map.setPaintProperty('heatmap-layer', 'heatmap-intensity', profile.intensity);
    map.setPaintProperty('heatmap-layer', 'heatmap-radius', profile.radius);
    map.setPaintProperty('heatmap-layer', 'heatmap-opacity', profile.opacity);
  } catch { /* layer not ready */ }
}

/* Popups — clean, simple */
function createSightingPopup(props: { shape: string; location: string; color: string }): string {
  return `<div class="holo-popup">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div style="width:8px;height:8px;border-radius:50%;background:${props.color};flex-shrink:0"></div>
      <div>
        <div style="font-size:8px;font-weight:500;color:rgba(255,255,255,0.35);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:1px">TYPE</div>
        <span style="font-size:13px;font-weight:600;color:#E2E8F0;letter-spacing:0.02em">${props.shape}</span>
      </div>
    </div>
    <div style="color:#89CFEE;font-size:11px;font-weight:400;margin-bottom:4px">${cleanLocation(props.location) || 'Unknown Location'}</div>
    <div style="color:rgba(255,255,255,0.2);font-size:8px;letter-spacing:0.1em;text-transform:uppercase">Click for details</div>
  </div>`;
}

function createClusterPopup(count: number): string {
  return `<div class="holo-popup" style="text-align:center;min-width:100px">
    <div style="font-size:18px;color:#00E5FF;font-weight:700;font-variant-numeric:tabular-nums">${count.toLocaleString()}</div>
    <div style="font-size:9px;color:rgba(255,255,255,0.35);letter-spacing:0.08em;margin-top:2px">sightings</div>
    <div style="color:rgba(255,255,255,0.2);font-size:8px;letter-spacing:0.08em;margin-top:3px">Zoom to expand</div>
  </div>`;
}

/* Overlay */
function MapOverlay({ isLoading, noData }: { isLoading: boolean; noData: boolean }) {
  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3 px-5 py-3 rounded-lg" style={{ background: 'rgba(8,16,32,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-4 h-4 border-2 border-signal-cyan/20 border-t-signal-cyan rounded-full animate-spin" />
            <span className="font-display text-sm text-signal-cyan/80 tracking-wider">Loading...</span>
          </div>
        </div>
      )}
      {noData && !isLoading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
          <div className="px-5 py-3 rounded-lg text-center" style={{ background: 'rgba(8,16,32,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="font-display text-sm text-signal-muted tracking-wider mb-1">No Data</div>
            <div className="text-xs text-signal-muted/60">No sightings for this year</div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══ MAIN MAP VIEW ═══ */
interface MapViewProps {
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

export default function MapView({
  points, onSightingClick, isLoading, noData,
  heatmapEnabled, heatmapMode, countryBounds,
  onCountryHover, onCountryClick,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const prevBoundsRef = useRef<string | null>(null);
  const hoveredCountryRef = useRef<string | null>(null);
  const countryHoverRef = useRef(onCountryHover);
  const countryClickRef = useRef(onCountryClick);
  const [webglFailed, setWebglFailed] = useState(false);
  countryHoverRef.current = onCountryHover;
  countryClickRef.current = onCountryClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) { setWebglFailed(true); return; }
    } catch { setWebglFailed(true); return; }

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: [0, 20],
        zoom: 1.8,
        minZoom: 1.5,
        maxZoom: MAP_MAX_ZOOM,
        attributionControl: false,
        fadeDuration: 0,
      });
    } catch { setWebglFailed(true); return; }

    map.on('error', (e) => {
      if (e.error?.message?.includes('WebGL') || e.error?.message?.includes('context')) {
        setWebglFailed(true);
      }
    });

    map.on('load', () => {
      readyRef.current = true;
      customizeStyle(map);
      setupNaturalEarthBorders(map);
      setupSightingsLayers(map);
      setupHeatmapLayer(map);
      if (points.length > 0) updateSightingsSource(map, points);
    });

    // Click cluster → zoom
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features.length) return;
      const clusterId = features[0].properties?.cluster_id;
      const source = map.getSource('sightings') as maplibregl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId).then(zoom => {
        const geom = features[0].geometry;
        if (geom.type === 'Point') {
          map.flyTo({ center: geom.coordinates as [number, number], zoom, duration: 600 });
        }
      });
    });

    // Click sighting → detail (expanded touch area on mobile)
    map.on('click', 'sighting-dots', (e) => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const tolerance = isTouchDevice ? 15 : 3;
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - tolerance, e.point.y - tolerance],
        [e.point.x + tolerance, e.point.y + tolerance],
      ];
      const features = map.queryRenderedFeatures(bbox, { layers: ['sighting-dots'] });
      if (!features.length) return;
      const id = features[0].properties?.id;
      if (id) onSightingClick(id);
    });

    // Hover cluster
    map.on('mouseenter', 'clusters', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features.length) return;
      const count = features[0].properties?.point_count || 0;
      const geom = features[0].geometry;
      if (geom.type === 'Point') {
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 20, className: 'signal626-popup' })
          .setLngLat(geom.coordinates as [number, number])
          .setHTML(createClusterPopup(count))
          .addTo(map);
      }
    });
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; popupRef.current?.remove(); });

    // Hover sighting
    map.on('mouseenter', 'sighting-dots', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const features = map.queryRenderedFeatures(e.point, { layers: ['sighting-dots'] });
      if (!features.length) return;
      const props = features[0].properties!;
      const geom = features[0].geometry;
      if (geom.type === 'Point') {
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14, className: 'signal626-popup' })
          .setLngLat(geom.coordinates as [number, number])
          .setHTML(createSightingPopup({ shape: props.shape || 'Unknown', location: props.location || '', color: props.color || '#00E5FF' }))
          .addTo(map);
      }
    });
    map.on('mouseleave', 'sighting-dots', () => { map.getCanvas().style.cursor = ''; popupRef.current?.remove(); });

    // Country hover
    map.on('mousemove', 'ne-country-fill', (e) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const iso = feature.properties?.ISO_A2 as string | undefined;
      const name = (feature.properties?.NAME as string) || '';
      if (!iso || iso === '-99') return;

      const sightingFeatures = map.queryRenderedFeatures(e.point, { layers: ['sighting-dots', 'clusters'] });
      if (sightingFeatures.length > 0) {
        if (hoveredCountryRef.current) {
          map.setFeatureState({ source: 'ne-countries', id: hoveredCountryRef.current }, { hover: false });
          hoveredCountryRef.current = null;
          countryHoverRef.current?.(null);
        }
        return;
      }

      if (hoveredCountryRef.current && hoveredCountryRef.current !== iso) {
        map.setFeatureState({ source: 'ne-countries', id: hoveredCountryRef.current }, { hover: false });
      }
      hoveredCountryRef.current = iso;
      map.setFeatureState({ source: 'ne-countries', id: iso }, { hover: true });
      countryHoverRef.current?.({ code: iso, name, x: e.originalEvent.clientX, y: e.originalEvent.clientY });
    });

    map.on('mouseleave', 'ne-country-fill', () => {
      if (hoveredCountryRef.current) {
        map.setFeatureState({ source: 'ne-countries', id: hoveredCountryRef.current }, { hover: false });
        hoveredCountryRef.current = null;
      }
      countryHoverRef.current?.(null);
    });

    // Click country → intelligence panel (wider sighting check on mobile to prioritize dots)
    map.on('click', 'ne-country-fill', (e) => {
      if (!e.features?.length) return;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const tolerance = isTouchDevice ? 20 : 3;
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - tolerance, e.point.y - tolerance],
        [e.point.x + tolerance, e.point.y + tolerance],
      ];
      const sightingFeatures = map.queryRenderedFeatures(bbox, { layers: ['sighting-dots', 'clusters'] });
      if (sightingFeatures.length > 0) return;
      const iso = e.features[0].properties?.ISO_A2 as string | undefined;
      if (iso && iso !== '-99') countryClickRef.current?.(iso);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update data
  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return;
    updateSightingsSource(mapRef.current, points);
  }, [points]);

  // Toggle heatmap
  useEffect(() => {
    const map = mapRef.current;
    if (!readyRef.current || !map) return;

    const showHeat = heatmapEnabled;
    const layers = ['heatmap-layer'];
    const dotLayers = ['clusters', 'cluster-count', 'cluster-glow', 'sighting-dots', 'sighting-glow'];

    for (const l of layers) {
      try { map.setLayoutProperty(l, 'visibility', showHeat ? 'visible' : 'none'); } catch {}
    }
    for (const l of dotLayers) {
      try { map.setLayoutProperty(l, 'visibility', showHeat ? 'none' : 'visible'); } catch {}
    }

    const style = map.getStyle();
    if (style?.layers) {
      for (const layer of style.layers) {
        if (layer.type === 'symbol' && (layer.id.includes('country') || layer.id.includes('continent') || layer.id.includes('state') || layer.id.includes('place'))) {
          try {
            if (showHeat) {
              map.setPaintProperty(layer.id, 'text-halo-width', 4);
              map.setPaintProperty(layer.id, 'text-halo-color', '#000000');
              map.setPaintProperty(layer.id, 'text-color', '#ffffff');
            } else {
              if (layer.id.includes('country') || layer.id.includes('continent')) {
                map.setPaintProperty(layer.id, 'text-color', '#e8f4ff');
                map.setPaintProperty(layer.id, 'text-halo-color', '#020810');
                map.setPaintProperty(layer.id, 'text-halo-width', 3);
              } else if (layer.id.includes('state') || layer.id.includes('province')) {
                map.setPaintProperty(layer.id, 'text-color', '#d8ecff');
                map.setPaintProperty(layer.id, 'text-halo-color', '#020810');
                map.setPaintProperty(layer.id, 'text-halo-width', 2.5);
              } else {
                map.setPaintProperty(layer.id, 'text-color', '#c8e4ff');
                map.setPaintProperty(layer.id, 'text-halo-color', '#020810');
                map.setPaintProperty(layer.id, 'text-halo-width', 2);
              }
            }
          } catch {}
        }
      }
    }

    if (showHeat && points.length > 0) {
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: points.map(p => ({
          type: 'Feature' as const,
          properties: {},
          geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
        })),
      };
      const source = map.getSource('heatmap-source') as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(geojson);
    }

    if (showHeat) applyHeatmapMode(map, heatmapMode);
  }, [heatmapEnabled, points, heatmapMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!readyRef.current || !map || !heatmapEnabled) return;
    applyHeatmapMode(map, heatmapMode);
  }, [heatmapMode, heatmapEnabled]);

  // Fly to country
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const boundsKey = countryBounds ? JSON.stringify(countryBounds) : null;
    if (boundsKey === prevBoundsRef.current) return;
    prevBoundsRef.current = boundsKey;

    if (countryBounds) {
      map.fitBounds(
        [[countryBounds[0][1], countryBounds[0][0]], [countryBounds[1][1], countryBounds[1][0]]],
        { duration: 1200, padding: 40 }
      );
    } else {
      map.flyTo({ center: [0, 20], zoom: 1.8, duration: 1200 });
    }
  }, [countryBounds]);

  const handleZoomIn = () => mapRef.current?.zoomIn({ duration: 300 });
  const handleZoomOut = () => mapRef.current?.zoomOut({ duration: 300 });

  if (webglFailed) {
    return (
      <div className="relative w-full h-full flex items-center justify-center" style={{ background: '#0c0e14' }}>
        <div className="text-center px-6 max-w-md">
          <div className="font-display text-lg text-signal-red/80 tracking-[0.1em] mb-3">WEBGL UNAVAILABLE</div>
          <p className="text-sm text-signal-muted leading-relaxed mb-3">
            This device or browser does not support WebGL, which is required for the interactive map.
          </p>
          <p className="text-xs text-signal-muted/60">
            Try using a desktop browser (Chrome, Firefox, Edge) or enable hardware acceleration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <MapOverlay isLoading={isLoading} noData={noData} />

      {/* Zoom Controls */}
      <div className="absolute top-3 right-3 z-[100] flex flex-col rounded-md overflow-hidden"
        style={{ background: 'rgba(15, 23, 41, 0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <button onClick={handleZoomIn}
          className="w-8 h-8 flex items-center justify-center transition-colors group"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-slate-400 group-hover:text-cyan-400 transition-colors">
            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <button onClick={handleZoomOut}
          className="w-8 h-8 flex items-center justify-center transition-colors group"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-slate-400 group-hover:text-cyan-400 transition-colors">
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

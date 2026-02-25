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

/* ═══════════════════════════════════════════════════════════════
   CARTO dark-matter vector tiles — free, no auth
   ═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   STYLE — Futuristic sci-fi map: clear countries, readable labels

   - Dark background with clearly visible blue-tinted land
   - Clean crisp country borders
   - Readable labels at all zoom levels
   - Subtle roads/internal borders for detail
   ═══════════════════════════════════════════════════════════════ */
function customizeStyle(map: maplibregl.Map) {
  const style = map.getStyle();
  if (!style || !style.layers) return;

  for (const layer of style.layers) {
    try {
      const id = layer.id;
      const type = layer.type;

      // ── Background = LAND color (CARTO has no land fill layer) ──
      if (id === 'background' && type === 'background') {
        map.setPaintProperty(id, 'background-color', '#070e1a');
      }

      // ── Water → dark ocean (contrast against bright land) ──
      if (id.includes('water') && !id.includes('label') && !id.includes('name')) {
        if (type === 'fill') {
          map.setPaintProperty(id, 'fill-color', '#020509');
        } else if (type === 'line') {
          map.setPaintProperty(id, 'line-color', '#061020');
        }
      }

      // ── Landuse areas → slightly different blue tint ──
      if (id.includes('landuse') || id.includes('land')) {
        if (type === 'fill') {
          map.setPaintProperty(id, 'fill-color', '#0d1e38');
        }
      }

      // ── Buildings → subtle blue tint ──
      if (id.includes('building') && type === 'fill') {
        map.setPaintProperty(id, 'fill-color', '#0e1e38');
        map.setPaintProperty(id, 'fill-opacity', 0.5);
      }

      // ── Boundaries: detect by ID or source-layer ──
      // Country borders hidden (Natural Earth replaces them).
      // State/province borders fade in only at zoom 6+ to avoid
      // double-line with Natural Earth at country-level zoom.
      const isBoundaryById = (id.includes('boundary') || id.includes('border') || id.includes('admin'));
      const isBoundaryBySource = ('source-layer' in layer && (layer as Record<string, unknown>)['source-layer'] === 'boundary');
      if ((isBoundaryById || isBoundaryBySource) && type === 'line') {
        if (id.includes('country')) {
          map.setPaintProperty(id, 'line-opacity', 0);
        } else if (id.includes('state') || id.includes('province')) {
          map.setPaintProperty(id, 'line-color', '#6abce0');
          map.setPaintProperty(id, 'line-opacity', [
            'interpolate', ['linear'], ['zoom'],
            5, 0,   // hidden at country-level zoom (no double line)
            6, 0.4,  // fade in when zoomed into a country
            8, 0.6,
          ] as unknown as number);
          map.setPaintProperty(id, 'line-width', 0.8);
        } else {
          map.setPaintProperty(id, 'line-opacity', 0);
        }
      }

      // ── Roads → subtle blue network (visible on zoom) ──
      if ((id.includes('road') || id.includes('highway') || id.includes('tunnel') || id.includes('bridge')) && type === 'line') {
        map.setPaintProperty(id, 'line-color', '#1468b0');
        map.setPaintProperty(id, 'line-opacity', 0.2);
      }

      // ── Labels → BRIGHT WHITE, fully readable at every zoom ──
      if (type === 'symbol') {
        if (id.includes('country') || id.includes('continent')) {
          map.setPaintProperty(id, 'text-color', '#e8f4ff');
          map.setPaintProperty(id, 'text-halo-color', '#020810');
          map.setPaintProperty(id, 'text-halo-width', 3);
          map.setPaintProperty(id, 'text-halo-blur', 1);
        } else if (id.includes('state') || id.includes('province')) {
          map.setPaintProperty(id, 'text-color', '#d8ecff');
          map.setPaintProperty(id, 'text-halo-color', '#020810');
          map.setPaintProperty(id, 'text-halo-width', 2.5);
          map.setPaintProperty(id, 'text-halo-blur', 0.5);
        } else if (id.includes('place') || id.includes('city') || id.includes('town') || id.includes('village')) {
          map.setPaintProperty(id, 'text-color', '#c8e4ff');
          map.setPaintProperty(id, 'text-halo-color', '#020810');
          map.setPaintProperty(id, 'text-halo-width', 2);
          map.setPaintProperty(id, 'text-halo-blur', 0.5);
        } else {
          map.setPaintProperty(id, 'text-color', '#a8d0ff');
          map.setPaintProperty(id, 'text-halo-color', '#020810');
          map.setPaintProperty(id, 'text-halo-width', 1.5);
        }
      }
    } catch {
      // Skip unsupported properties
    }
  }
}


/* ═══════════════════════════════════════════════════════════════
   NATURAL EARTH BORDERS — Official accurate country boundaries
   Uses polygon outlines from ne_110m_admin_0_countries (gold standard)
   ═══════════════════════════════════════════════════════════════ */
function setupNaturalEarthBorders(map: maplibregl.Map) {
  // Find first symbol layer to insert borders below labels
  const style = map.getStyle();
  let insertBefore: string | undefined;
  if (style?.layers) {
    for (const layer of style.layers) {
      if (layer.type === 'symbol') { insertBefore = layer.id; break; }
    }
  }

  // Load Natural Earth countries polygons — outlines = accurate borders
  fetch('/ne_countries.geojson')
    .then(res => res.json())
    .then((data: GeoJSON.FeatureCollection) => {
      if (map.getSource('ne-countries')) return;

      map.addSource('ne-countries', {
        type: 'geojson',
        data,
        promoteId: 'ISO_A2',
      });

      // Invisible fill for hover detection
      map.addLayer({
        id: 'ne-country-fill',
        type: 'fill',
        source: 'ne-countries',
        paint: {
          'fill-color': 'rgba(0,229,255,0.0)',
          'fill-opacity': 0,
        },
      }, insertBefore);

      // Hover highlight fill — shows on hovered country
      map.addLayer({
        id: 'ne-country-fill-hover',
        type: 'fill',
        source: 'ne-countries',
        paint: {
          'fill-color': 'rgba(0,229,255,0.06)',
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0],
        },
      }, insertBefore);

      // Hover highlight border — brighter on hovered country
      map.addLayer({
        id: 'ne-country-border-hover',
        type: 'line',
        source: 'ne-countries',
        paint: {
          'line-color': '#00E5FF',
          'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 0],
          'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.6, 0],
        },
      }, insertBefore);

      // Country border outlines from polygon edges
      map.addLayer({
        id: 'ne-country-borders',
        type: 'line',
        source: 'ne-countries',
        paint: {
          'line-color': '#7ec8f0',
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.8, 4, 1.2, 8, 1.8],
          'line-opacity': 0.75,
        },
      }, insertBefore);
    })
    .catch(() => { /* Natural Earth data unavailable — CARTO borders remain */ });
}

/* ═══════════════════════════════════════════════════════════════
   TACTICAL GRID — Lat/lng coordinate grid (more visible)
   ═══════════════════════════════════════════════════════════════ */
function setupGridOverlay(map: maplibregl.Map) {
  const features: GeoJSON.Feature[] = [];

  for (let lat = -60; lat <= 80; lat += 30) {
    features.push({
      type: 'Feature',
      properties: { label: `${Math.abs(lat)}°${lat >= 0 ? 'N' : 'S'}` },
      geometry: {
        type: 'LineString',
        coordinates: Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat]),
      },
    });
  }
  for (let lng = -180; lng <= 180; lng += 30) {
    features.push({
      type: 'Feature',
      properties: { label: `${Math.abs(lng)}°${lng >= 0 ? 'E' : 'W'}` },
      geometry: {
        type: 'LineString',
        coordinates: Array.from({ length: 35 }, (_, i) => [lng, -85 + i * 5]),
      },
    });
  }

  map.addSource('grid-lines', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
  });

  // Grid lines — visible solid lines (matching reference)
  map.addLayer({
    id: 'grid-lines-layer',
    type: 'line',
    source: 'grid-lines',
    paint: {
      'line-color': 'rgba(25, 100, 200, 0.12)',
      'line-width': 0.7,
    },
  });

  // Grid labels
  map.addLayer({
    id: 'grid-labels',
    type: 'symbol',
    source: 'grid-lines',
    layout: {
      'symbol-placement': 'line',
      'text-field': ['get', 'label'],
      'text-size': 9,
      'text-font': ['Open Sans Regular'],
      'text-offset': [0, -0.6],
      'text-max-angle': 45,
    },
    paint: {
      'text-color': 'rgba(40, 120, 220, 0.15)',
      'text-halo-color': 'rgba(1, 8, 20, 0.8)',
      'text-halo-width': 1,
    },
  });
}

/* ═══════════════════════════════════════════════════════════════
   SIGHTING MARKERS — BIG, BRIGHT, DRAMATIC energy nodes
   ═══════════════════════════════════════════════════════════════ */
/**
 * Jitter co-located points so they fan out when a cluster expands.
 * Groups points sharing exact same coords, then offsets duplicates
 * in a spiral pattern (~100-300m apart — invisible at low zoom,
 * clearly separated at high zoom).
 */
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
    // Spread duplicates in a spiral: ~0.001° ≈ 110 m
    const step = 0.0012;
    for (let k = 1; k < indices.length; k++) {
      const angle = (k / indices.length) * Math.PI * 2;
      const r = step * (1 + Math.floor(k / 8) * 0.5); // grow radius for large groups
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

  // ══════════════════════════════════════
  //  CLUSTERS — Large glowing holographic rings
  // ══════════════════════════════════════

  // Cluster: mega outer bloom (atmosphere)
  map.addLayer({
    id: 'cluster-ripple',
    type: 'circle',
    source: 'sightings',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': 'rgba(0, 229, 255, 0.03)',
      'circle-radius': [
        'step', ['get', 'point_count'],
        50, 50, 65, 200, 80, 500, 95,
      ],
      'circle-stroke-color': 'rgba(0, 229, 255, 0.08)',
      'circle-stroke-width': 2,
      'circle-blur': 0.8,
    },
  });

  // Cluster: outer glow ring
  map.addLayer({
    id: 'cluster-glow-outer',
    type: 'circle',
    source: 'sightings',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': 'rgba(0, 229, 255, 0.04)',
      'circle-radius': [
        'step', ['get', 'point_count'],
        38, 50, 50, 200, 62, 500, 74,
      ],
      'circle-stroke-color': 'rgba(0, 229, 255, 0.15)',
      'circle-stroke-width': 1.5,
      'circle-blur': 0.4,
    },
  });

  // Cluster: main holographic disc — BRIGHTER
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'sightings',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'interpolate', ['linear'], ['get', 'point_count'],
        10, 'rgba(0, 229, 255, 0.06)',
        100, 'rgba(0, 153, 255, 0.10)',
        1000, 'rgba(0, 153, 255, 0.14)',
      ],
      'circle-radius': [
        'step', ['get', 'point_count'],
        24, 50, 32, 200, 40, 500, 48,
      ],
      'circle-stroke-color': [
        'interpolate', ['linear'], ['get', 'point_count'],
        10, 'rgba(0, 229, 255, 0.5)',
        100, 'rgba(0, 229, 255, 0.65)',
        1000, 'rgba(0, 229, 255, 0.8)',
      ],
      'circle-stroke-width': [
        'interpolate', ['linear'], ['get', 'point_count'],
        10, 1.5, 1000, 2.5,
      ],
    },
  });

  // Cluster: inner ring detail
  map.addLayer({
    id: 'cluster-inner-ring',
    type: 'circle',
    source: 'sightings',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': 'transparent',
      'circle-radius': [
        'step', ['get', 'point_count'],
        15, 50, 20, 200, 26, 500, 32,
      ],
      'circle-stroke-color': 'rgba(0, 246, 210, 0.2)',
      'circle-stroke-width': 0.8,
    },
  });

  // Cluster count — BIGGER text
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
      'text-size': 14,
      'text-font': ['Open Sans Bold'],
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': '#CFFFFF',
      'text-halo-color': 'rgba(0, 40, 80, 0.95)',
      'text-halo-width': 2,
    },
  });

  // ══════════════════════════════════════
  //  SIGHTINGS — Big bright energy nodes
  // ══════════════════════════════════════

  // Sighting: wide VISIBLE aura bloom
  map.addLayer({
    id: 'sighting-aura',
    type: 'circle',
    source: 'sightings',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        1, 18, 3, 28, 6, 42, 10, 55, 14, 70,
      ],
      'circle-opacity': 0.1,
      'circle-blur': 1,
    },
  });

  // Sighting: bright glow ring
  map.addLayer({
    id: 'sighting-glow',
    type: 'circle',
    source: 'sightings',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        1, 10, 3, 17, 6, 26, 10, 36, 14, 46,
      ],
      'circle-opacity': 0.25,
      'circle-blur': 0.5,
    },
  });

  // Sighting: core energy dot — BIG & BRIGHT
  map.addLayer({
    id: 'sighting-dots',
    type: 'circle',
    source: 'sightings',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        1, 5.5, 3, 8, 6, 11, 10, 15, 14, 20, 18, 26,
      ],
      'circle-opacity': 1,
      'circle-stroke-color': '#CFFFFF',
      'circle-stroke-width': [
        'interpolate', ['linear'], ['zoom'],
        1, 0.8, 6, 1.5, 12, 2,
      ],
      'circle-stroke-opacity': 0.35,
    },
  });
}

/* ═══════════════════════════════════════════════════════════════
   HEATMAP — Energy field visualization
   ═══════════════════════════════════════════════════════════════ */
function setupHeatmapLayer(map: maplibregl.Map) {
  map.addSource('heatmap-source', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  // Insert heatmap BELOW labels so country/continent names stay visible
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
        0.05, 'rgba(0, 10, 40, 0.4)',
        0.15, 'rgba(0, 50, 120, 0.6)',
        0.25, '#003d8a',
        0.35, '#0066cc',
        0.45, '#0099FF',
        0.55, '#00E5FF',
        0.65, '#00F6D2',
        0.75, '#00B8A9',
        0.85, '#7b61ff',
        0.95, '#c084fc',
        1.0, '#CFFFFF',
      ],
    },
    layout: { visibility: 'none' },
  }, insertBefore);
}

/* Heatmap mode paint profiles */
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

/* ═══════════════════════════════════════════════════════════════
   POPUPS — LARGE, CLEAR, READABLE holographic intel cards
   ═══════════════════════════════════════════════════════════════ */
function createSightingPopup(props: { shape: string; location: string; color: string }): string {
  return `<div class="holo-popup">
    <div class="holo-popup-scanline"></div>
    <div class="holo-popup-corner tl"></div>
    <div class="holo-popup-corner tr"></div>
    <div class="holo-popup-corner bl"></div>
    <div class="holo-popup-corner br"></div>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
      <div style="position:relative">
        <div style="width:18px;height:18px;border-radius:50%;background:${props.color};box-shadow:0 0 8px ${props.color},0 0 20px ${props.color},0 0 40px ${props.color}60;animation:popupPulse 2s ease-in-out infinite"></div>
        <div style="position:absolute;inset:-7px;border-radius:50%;border:1.5px solid ${props.color}50;animation:popupRing 3s ease-in-out infinite"></div>
        <div style="position:absolute;inset:-14px;border-radius:50%;border:1px solid ${props.color}20"></div>
      </div>
      <div>
        <div style="font-family:'Rajdhani',sans-serif;font-size:9px;font-weight:600;color:#00E5FF;letter-spacing:0.3em;text-transform:uppercase;opacity:0.6;margin-bottom:2px">SIGNAL TYPE</div>
        <span style="font-family:'Orbitron',sans-serif;font-size:18px;font-weight:700;color:#CFFFFF;text-shadow:0 0 12px rgba(0,229,255,0.4),0 0 30px rgba(0,229,255,0.15);letter-spacing:0.1em">${props.shape.toUpperCase()}</span>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(0,229,255,0.03);border-radius:6px;border:1px solid rgba(0,229,255,0.06);margin-bottom:8px">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;opacity:0.5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#00E5FF" stroke-width="2"/>
        <circle cx="12" cy="9" r="2.5" stroke="#00E5FF" stroke-width="2"/>
      </svg>
      <span style="font-family:'Rajdhani',sans-serif;color:#89DFFF;font-size:14px;font-weight:500;letter-spacing:0.03em">${cleanLocation(props.location) || 'Unknown Location'}</span>
    </div>
    <div style="width:100%;height:1px;background:linear-gradient(90deg,transparent,#0099FF80,#00E5FF60,#0099FF80,transparent);margin:10px 0"></div>
    <div style="font-family:'Rajdhani',sans-serif;color:#00E5FF;font-size:11px;text-align:center;letter-spacing:0.25em;text-transform:uppercase;font-weight:600">CLICK FOR FULL INTEL</div>
  </div>`;
}

function createClusterPopup(count: number): string {
  return `<div class="holo-popup" style="text-align:center;min-width:180px">
    <div class="holo-popup-scanline"></div>
    <div class="holo-popup-corner tl"></div>
    <div class="holo-popup-corner tr"></div>
    <div class="holo-popup-corner bl"></div>
    <div class="holo-popup-corner br"></div>
    <div style="font-family:'Rajdhani',sans-serif;font-size:10px;color:rgba(0,229,255,0.5);letter-spacing:0.35em;margin-bottom:6px;text-transform:uppercase;font-weight:600">SIGNAL CLUSTER</div>
    <div style="font-family:'Orbitron',monospace;font-size:28px;color:#00E5FF;font-weight:700;text-shadow:0 0 15px rgba(0,229,255,0.6),0 0 35px rgba(0,229,255,0.25),0 0 60px rgba(0,229,255,0.1);letter-spacing:0.08em">${count.toLocaleString()}</div>
    <div style="font-family:'Rajdhani',sans-serif;font-size:11px;color:#00F6D2;letter-spacing:0.3em;margin-top:4px;text-transform:uppercase;font-weight:600;opacity:0.7">REPORTED SIGNALS</div>
    <div style="width:60px;height:1px;background:linear-gradient(90deg,transparent,#0099FF80,#00E5FF60,transparent);margin:12px auto 10px"></div>
    <div style="font-family:'Rajdhani',sans-serif;color:#7b61ff;font-size:11px;letter-spacing:0.2em;font-weight:600">ZOOM TO EXPAND</div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   RADAR SWEEP — Rotating scan overlay every 3s
   ═══════════════════════════════════════════════════════════════ */
function setupRadarSweep(map: maplibregl.Map) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  canvas.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:500;width:500px;height:500px;opacity:0.12;mix-blend-mode:screen';
  map.getContainer().appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let angle = 0;
  const cx = 128, cy = 128, radius = 120;

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, 256, 256);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Sweep gradient using arc
    const sweepGrad = ctx.createLinearGradient(0, 0, radius, 0);
    sweepGrad.addColorStop(0, 'rgba(0, 229, 255, 0.0)');
    sweepGrad.addColorStop(1, 'rgba(0, 229, 255, 0.3)');

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -0.05, 0.4);
    ctx.closePath();
    ctx.fillStyle = sweepGrad;
    ctx.fill();

    // Sweep edge line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius, 0);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    // Concentric rings
    for (let r = 30; r <= radius; r += 30) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.06)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.fill();

    angle += (Math.PI * 2) / (3 * 60); // Full rotation every ~3s at 60fps
    requestAnimationFrame(draw);
  }

  draw();
}

/* ═══════════════════════════════════════════════════════════════
   OVERLAY — Loading / No Data
   ═══════════════════════════════════════════════════════════════ */
function MapOverlay({ isLoading, noData }: { isLoading: boolean; noData: boolean }) {
  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
          <div className="holo-loading-card">
            <div className="holo-spinner" />
            <div>
              <span className="font-display text-base text-signal-cyan tracking-[0.25em] glow-text-cyan block font-bold">
                SCANNING
              </span>
              <span className="text-xs text-signal-ghost tracking-[0.15em] font-body">Retrieving signal data...</span>
            </div>
          </div>
        </div>
      )}
      {noData && !isLoading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
          <div className="holo-loading-card">
            <div
              className="font-display text-xl sm:text-2xl text-signal-red/80 tracking-[0.2em] mb-2 animate-pulse font-bold"
              style={{ textShadow: '0 0 20px rgba(255,51,85,0.4), 0 0 40px rgba(255,51,85,0.15)' }}
            >
              NO SIGNAL DETECTED
            </div>
            <div className="text-sm text-signal-ghost font-body tracking-wider">
              No recorded sightings for this year
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN MAP VIEW
   ═══════════════════════════════════════════════════════════════ */
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
  points,
  onSightingClick,
  isLoading,
  noData,
  heatmapEnabled,
  heatmapMode,
  countryBounds,
  onCountryHover,
  onCountryClick,
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

    // Check WebGL availability before attempting map creation
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglFailed(true);
        return;
      }
    } catch {
      setWebglFailed(true);
      return;
    }

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
    } catch {
      setWebglFailed(true);
      return;
    }

    // Handle WebGL context loss at runtime
    map.on('error', (e) => {
      if (e.error?.message?.includes('WebGL') || e.error?.message?.includes('context')) {
        setWebglFailed(true);
      }
    });

    map.on('load', () => {
      readyRef.current = true;

      customizeStyle(map);
      setupNaturalEarthBorders(map);
      setupGridOverlay(map);
      setupSightingsLayers(map);
      setupHeatmapLayer(map);
      setupRadarSweep(map);

      if (points.length > 0) {
        updateSightingsSource(map, points);
      }
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

    // Click sighting → detail
    map.on('click', 'sighting-dots', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['sighting-dots'] });
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
        popupRef.current = new maplibregl.Popup({
          closeButton: false, closeOnClick: false, offset: 24,
          className: 'signal626-popup',
        })
          .setLngLat(geom.coordinates as [number, number])
          .setHTML(createClusterPopup(count))
          .addTo(map);
      }
    });
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
      popupRef.current?.remove();
    });

    // Hover sighting
    map.on('mouseenter', 'sighting-dots', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const features = map.queryRenderedFeatures(e.point, { layers: ['sighting-dots'] });
      if (!features.length) return;
      const props = features[0].properties!;
      const geom = features[0].geometry;
      if (geom.type === 'Point') {
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({
          closeButton: false, closeOnClick: false, offset: 18,
          className: 'signal626-popup',
        })
          .setLngLat(geom.coordinates as [number, number])
          .setHTML(createSightingPopup({
            shape: props.shape || 'Unknown',
            location: props.location || '',
            color: props.color || '#00E5FF',
          }))
          .addTo(map);
      }
    });
    map.on('mouseleave', 'sighting-dots', () => {
      map.getCanvas().style.cursor = '';
      popupRef.current?.remove();
    });

    // ── Country hover — emits data for CountryHoverPopup ──
    map.on('mousemove', 'ne-country-fill', (e) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const iso = feature.properties?.ISO_A2 as string | undefined;
      const name = (feature.properties?.NAME as string) || '';
      if (!iso || iso === '-99') return;

      // Check if cursor is over a sighting dot or cluster — if so, don't show country popup
      const sightingFeatures = map.queryRenderedFeatures(e.point, { layers: ['sighting-dots', 'clusters'] });
      if (sightingFeatures.length > 0) {
        // Clear country hover when over markers
        if (hoveredCountryRef.current) {
          map.setFeatureState({ source: 'ne-countries', id: hoveredCountryRef.current }, { hover: false });
          hoveredCountryRef.current = null;
          countryHoverRef.current?.(null);
        }
        return;
      }

      // Update hover highlight
      if (hoveredCountryRef.current && hoveredCountryRef.current !== iso) {
        map.setFeatureState({ source: 'ne-countries', id: hoveredCountryRef.current }, { hover: false });
      }
      hoveredCountryRef.current = iso;
      map.setFeatureState({ source: 'ne-countries', id: iso }, { hover: true });

      countryHoverRef.current?.({
        code: iso,
        name,
        x: e.originalEvent.clientX,
        y: e.originalEvent.clientY,
      });
    });

    map.on('mouseleave', 'ne-country-fill', () => {
      if (hoveredCountryRef.current) {
        map.setFeatureState({ source: 'ne-countries', id: hoveredCountryRef.current }, { hover: false });
        hoveredCountryRef.current = null;
      }
      countryHoverRef.current?.(null);
    });

    // Click country fill → open intelligence panel
    map.on('click', 'ne-country-fill', (e) => {
      if (!e.features?.length) return;
      // Don't trigger if clicking on sighting/cluster
      const sightingFeatures = map.queryRenderedFeatures(e.point, { layers: ['sighting-dots', 'clusters'] });
      if (sightingFeatures.length > 0) return;

      const iso = e.features[0].properties?.ISO_A2 as string | undefined;
      if (iso && iso !== '-99') {
        countryClickRef.current?.(iso);
      }
    });

    // Point pulse animation — cycle aura opacity every 2s
    let pulseAnim: number;
    const startPulse = () => {
      let t = 0;
      const tick = () => {
        t += 0.03;
        const pulse = 0.04 + Math.sin(t) * 0.04; // oscillates 0.00 - 0.08
        try {
          if (readyRef.current && map.getLayer('sighting-aura')) {
            map.setPaintProperty('sighting-aura', 'circle-opacity', pulse);
          }
        } catch { /* layer not ready */ }
        pulseAnim = requestAnimationFrame(tick);
      };
      pulseAnim = requestAnimationFrame(tick);
    };
    startPulse();

    mapRef.current = map;

    return () => {
      cancelAnimationFrame(pulseAnim);
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
    const dotLayers = ['clusters', 'cluster-count', 'cluster-glow-outer', 'cluster-inner-ring', 'cluster-ripple', 'sighting-dots', 'sighting-glow', 'sighting-aura'];

    for (const l of layers) {
      try { map.setLayoutProperty(l, 'visibility', showHeat ? 'visible' : 'none'); } catch {}
    }
    for (const l of dotLayers) {
      try { map.setLayoutProperty(l, 'visibility', showHeat ? 'none' : 'visible'); } catch {}
    }

    // Boost label visibility when heatmap is active
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
              // Restore original colors
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
          } catch { /* skip */ }
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

    // Apply current heatmap mode
    if (showHeat) {
      applyHeatmapMode(map, heatmapMode);
    }
  }, [heatmapEnabled, points, heatmapMode]);

  // Apply heatmap mode changes
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
      <div className="relative w-full h-full flex items-center justify-center" style={{ background: '#070e1a' }}>
        <div className="text-center px-6 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ border: '2px solid rgba(255,51,85,0.4)', background: 'rgba(255,51,85,0.05)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#FF3355" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="font-display text-xl text-signal-red/90 tracking-[0.15em] mb-3"
            style={{ textShadow: '0 0 20px rgba(255,51,85,0.3)' }}>
            WEBGL UNAVAILABLE
          </div>
          <p className="text-sm text-signal-muted leading-relaxed mb-4">
            This device or browser does not support WebGL, which is required for the interactive map.
          </p>
          <p className="text-xs text-signal-muted/60">
            Try using a desktop browser (Chrome, Firefox, Edge) or enable hardware acceleration in your browser settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full map-container-glow">
      <div ref={containerRef} className="w-full h-full" />
      <MapOverlay isLoading={isLoading} noData={noData} />
      <div className="map-depth-vignette" />

      {/* Custom Zoom Controls */}
      <div className="absolute top-[56px] sm:top-[72px] md:top-[84px] right-2 sm:right-3 z-[1000] flex flex-col gap-0 rounded-xl overflow-hidden"
        style={{
          background: 'rgba(5, 12, 28, 0.92)',
          border: '1px solid rgba(0, 229, 255, 0.25)',
          boxShadow: '0 0 24px rgba(0,0,0,0.6), 0 0 12px rgba(0,229,255,0.08), inset 0 1px 0 rgba(0,229,255,0.1)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <button onClick={handleZoomIn}
          className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center transition-all duration-200 group active:scale-95"
          style={{ borderBottom: '1px solid rgba(0,229,255,0.12)' }}
          title="Zoom In"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#00E5FF] transition-all duration-200 group-hover:scale-110"
            style={{ filter: 'drop-shadow(0 0 6px rgba(0,229,255,0.9)) drop-shadow(0 0 14px rgba(0,229,255,0.4))' }}>
            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
        <button onClick={handleZoomOut}
          className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center transition-all duration-200 group active:scale-95"
          title="Zoom Out"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#00E5FF] transition-all duration-200 group-hover:scale-110"
            style={{ filter: 'drop-shadow(0 0 6px rgba(0,229,255,0.9)) drop-shadow(0 0 14px rgba(0,229,255,0.4))' }}>
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

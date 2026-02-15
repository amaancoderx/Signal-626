'use client';

import { useEffect, useMemo, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import Supercluster from 'supercluster';
import {
  MAP_CENTER,
  MAP_ZOOM,
  MAP_MIN_ZOOM,
  MAP_MAX_ZOOM,
  CLUSTER_RADIUS,
  CLUSTER_MAX_ZOOM,
  getShapeColor,
} from '@/lib/constants';

function cleanLocation(location: string | null): string {
  if (!location) return '';
  const parts = location.split(',').map(s => s.trim()).filter(Boolean);
  // Deduplicate: remove later parts if already mentioned in earlier parts
  const result: string[] = [];
  for (const part of parts) {
    const partLower = part.toLowerCase();
    const alreadyMentioned = result.some(r => r.toLowerCase().includes(partLower));
    if (!alreadyMentioned) result.push(part);
  }
  return result.join(', ');
}
import type { MapPoint, HeatmapMode } from '@/lib/types';

// Fix default marker icons
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface ClusterProperties {
  cluster: boolean;
  cluster_id?: number;
  point_count?: number;
  point_count_abbreviated?: string | number;
  sightingId?: number;
  shape?: string | null;
  location?: string | null;
}

interface MapViewProps {
  points: MapPoint[];
  onSightingClick: (id: number) => void;
  isLoading: boolean;
  noData: boolean;
  heatmapEnabled: boolean;
  heatmapMode: HeatmapMode;
}

function ClusterLayer({
  points,
  onSightingClick,
}: {
  points: MapPoint[];
  onSightingClick: (id: number) => void;
}) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup>(L.layerGroup());

  const supercluster = useMemo(() => {
    const index = new Supercluster<ClusterProperties>({
      radius: CLUSTER_RADIUS,
      maxZoom: CLUSTER_MAX_ZOOM,
      minPoints: 3,
    });

    const geoPoints: GeoJSON.Feature<GeoJSON.Point, ClusterProperties>[] =
      points.map((p) => ({
        type: 'Feature',
        properties: {
          cluster: false,
          sightingId: p.id,
          shape: p.shape,
          location: p.location,
        },
        geometry: {
          type: 'Point',
          coordinates: [p.longitude, p.latitude],
        },
      }));

    index.load(geoPoints);
    return index;
  }, [points]);

  const updateClusters = useCallback(() => {
    const bounds = map.getBounds();
    const zoom = map.getZoom();

    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    const clusters = supercluster.getClusters(bbox, Math.floor(zoom));
    const layer = layerRef.current;
    layer.clearLayers();

    clusters.forEach((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties;

      if (props.cluster) {
        const count = props.point_count || 0;
        const size =
          count < 50 ? 36 : count < 200 ? 44 : count < 500 ? 52 : 60;
        const isLarge = count >= 200;

        const icon = L.divIcon({
          html: `<div class="custom-cluster ${isLarge ? 'custom-cluster-large' : ''}" style="width:${size}px;height:${size}px;cursor:pointer" title="Click to zoom in">${count >= 1000 ? Math.round(count / 1000) + 'k' : count}</div>`,
          className: '',
          iconSize: L.point(size, size),
          iconAnchor: L.point(size / 2, size / 2),
        });

        const marker = L.marker([lat, lng], { icon });

        marker.bindTooltip(
          `<div style="font-family:Rajdhani,monospace;font-size:11px;color:#FFFFFF;text-align:center">
            <strong>${count.toLocaleString()} sightings</strong><br/>
            <span style="color:#7A8A99;font-size:10px">Click to zoom in</span>
          </div>`,
          {
            className: 'glass-panel',
            direction: 'top',
            offset: L.point(0, -size / 2),
          }
        );

        marker.on('click', () => {
          const expansionZoom = Math.min(
            supercluster.getClusterExpansionZoom(props.cluster_id!),
            MAP_MAX_ZOOM
          );
          map.flyTo([lat, lng], expansionZoom, { duration: 0.5 });
        });
        layer.addLayer(marker);
      } else {
        const color = getShapeColor(props.shape || null);
        const circle = L.circleMarker([lat, lng], {
          radius: 6,
          fillColor: color,
          fillOpacity: 0.9,
          color: '#fff',
          weight: 1.5,
          opacity: 0.4,
        });

        circle.on('click', () => {
          if (props.sightingId) {
            onSightingClick(props.sightingId);
          }
        });

        circle.bindTooltip(
          `<div style="font-family:Rajdhani,monospace;font-size:12px;color:#FFFFFF">
            <strong>${props.shape || 'Unknown'}</strong><br/>
            <span style="color:#E6F1FF">${cleanLocation(props.location ?? null)}</span><br/>
            <span style="color:#7A8A99;font-size:10px">Click to view details</span>
          </div>`,
          {
            className: 'glass-panel',
            direction: 'top',
            offset: L.point(0, -8),
          }
        );

        layer.addLayer(circle);
      }
    });
  }, [map, supercluster, onSightingClick]);

  useEffect(() => {
    const layer = layerRef.current;
    layer.addTo(map);

    updateClusters();

    map.on('moveend', updateClusters);
    map.on('zoomend', updateClusters);

    return () => {
      map.off('moveend', updateClusters);
      map.off('zoomend', updateClusters);
      map.removeLayer(layer);
    };
  }, [map, updateClusters]);

  return null;
}

const HEATMAP_GRADIENT = {
  0.0: 'rgba(0,10,5,0)',
  0.15: '#003311',
  0.3: '#00551a',
  0.45: '#00882e',
  0.55: '#00CC55',
  0.65: '#00FF9C',
  0.75: '#33FFB5',
  0.85: '#00E5FF',
  0.95: '#80F0FF',
  1.0: '#FFFFFF',
};

const HEATMAP_MODE_CONFIG: Record<HeatmapMode, { radius: number; blur: number; maxZoom: number; minOpacity: number }> = {
  density: { radius: 20, blur: 20, maxZoom: 10, minOpacity: 0.25 },
  clusters: { radius: 35, blur: 30, maxZoom: 8, minOpacity: 0.2 },
  precision: { radius: 10, blur: 8, maxZoom: 14, minOpacity: 0.35 },
};

function HeatmapLayer({ points, mode }: { points: MapPoint[]; mode: HeatmapMode }) {
  const map = useMap();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heatLayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (points.length === 0) return;

    const config = HEATMAP_MODE_CONFIG[mode];

    const heatData: [number, number, number][] = points.map((p) => [
      p.latitude,
      p.longitude,
      0.6,
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    heatLayerRef.current = (L as any).heatLayer(heatData, {
      ...config,
      max: 1.0,
      gradient: HEATMAP_GRADIENT,
    });

    heatLayerRef.current.addTo(map);

    // Fade-in animation
    const pane = map.getPane('overlayPane');
    if (pane) {
      containerRef.current = pane;
      pane.style.transition = 'opacity 300ms ease-in-out';
      pane.style.opacity = '0';
      requestAnimationFrame(() => {
        if (containerRef.current) containerRef.current.style.opacity = '1';
      });
    }

    return () => {
      // Fade-out before removal
      if (containerRef.current) {
        containerRef.current.style.opacity = '0';
      }
      // Delay removal slightly for fade-out
      const layerToRemove = heatLayerRef.current;
      setTimeout(() => {
        if (layerToRemove) {
          try { map.removeLayer(layerToRemove); } catch { /* already removed */ }
        }
        if (containerRef.current) {
          containerRef.current.style.transition = '';
          containerRef.current.style.opacity = '1';
          containerRef.current = null;
        }
      }, 300);
      heatLayerRef.current = null;
    };
  }, [map, points, mode]);

  return null;
}

function MapOverlay({
  isLoading,
  noData,
}: {
  isLoading: boolean;
  noData: boolean;
}) {
  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
          <div className="glass-panel rounded-lg px-6 py-3 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-white loading-pulse" />
            <span className="font-display text-sm text-white tracking-wider">
              SCANNING...
            </span>
          </div>
        </div>
      )}
      {noData && !isLoading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
          <div className="glass-panel rounded-lg px-8 py-4 text-center">
            <div className="font-display text-lg text-signal-amber tracking-wider mb-1">
              NO SIGNALS DETECTED
            </div>
            <div className="text-xs text-signal-muted font-mono">
              No recorded sightings for this year
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ZoomControls() {
  return <ZoomControl position="topright" />;
}

function MapTileSetup() {
  const map = useMap();
  useEffect(() => {
    const panes = map.getPane('tilePane');
    if (panes) {
      const children = panes.children;
      if (children.length >= 3) {
        children[0]?.classList.add('map-base-layer');
        children[2]?.classList.add('map-labels-layer');
      }
    }
  }, [map]);
  return null;
}

export default function MapView({
  points,
  onSightingClick,
  isLoading,
  noData,
  heatmapEnabled,
  heatmapMode,
}: MapViewProps) {
  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        minZoom={MAP_MIN_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
        preferCanvas={true}
      >
        {/* Base dark layer - geography, terrain */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          maxZoom={19}
          subdomains="abcd"
        />
        {/* Boundary lines overlay - state/country borders */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
          subdomains="abcd"
          opacity={0.12}
        />
        {/* Labels layer - country/city names on top */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          maxZoom={19}
          subdomains="abcd"
        />
        <MapTileSetup />
        <ZoomControls />
        {points.length > 0 && heatmapEnabled && (
          <HeatmapLayer points={points} mode={heatmapMode} />
        )}
        {points.length > 0 && !heatmapEnabled && (
          <ClusterLayer points={points} onSightingClick={onSightingClick} />
        )}
      </MapContainer>
      <MapOverlay isLoading={isLoading} noData={noData} />
    </div>
  );
}

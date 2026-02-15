'use client';

import { useQuery } from '@tanstack/react-query';
import type { MapPoint, Sighting } from '@/lib/types';

interface SightingsResponse {
  year: number;
  count: number;
  sightings: MapPoint[];
}

export function useSightings(year: number, shape?: string) {
  return useQuery<SightingsResponse>({
    queryKey: ['sightings', year, shape],
    queryFn: async () => {
      const params = new URLSearchParams({ year: year.toString() });
      if (shape && shape !== 'All') params.set('shape', shape);

      const res = await fetch(`/api/sightings?${params}`);
      if (!res.ok) throw new Error('Failed to fetch sightings');
      return res.json();
    },
    enabled: year >= 1400 && year <= 2026,
    placeholderData: (prev) => prev,
  });
}

export function useSightingDetail(id: number | null) {
  return useQuery<Sighting>({
    queryKey: ['sighting', id],
    queryFn: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(`/api/sighting/${id}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch sighting');
        return res.json();
      } finally {
        clearTimeout(timeout);
      }
    },
    enabled: id !== null,
    retry: 2,
    retryDelay: 1000,
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';

interface StatsResponse {
  totalReports: number;
  yearRange: { min: number; max: number };
  topShapes: { shape: string; count: number }[];
  allShapes: string[];
}

export function useStats() {
  return useQuery<StatsResponse>({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });
}

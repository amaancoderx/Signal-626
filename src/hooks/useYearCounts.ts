'use client';

import { useQuery } from '@tanstack/react-query';
import type { YearCount } from '@/lib/types';

interface YearCountsResponse {
  yearCounts: YearCount[];
}

export function useYearCounts() {
  return useQuery<YearCountsResponse>({
    queryKey: ['yearCounts'],
    queryFn: async () => {
      const res = await fetch('/api/year-counts');
      if (!res.ok) throw new Error('Failed to fetch year counts');
      return res.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

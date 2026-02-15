import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/year-counts
export async function GET() {
  const supabase = createServerClient();

  // Try RPC function first (single SQL query, ~100ms)
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_year_counts');

  if (!rpcError && rpcData) {
    return NextResponse.json({ yearCounts: rpcData }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  }

  console.warn('RPC get_year_counts failed, using fallback:', rpcError?.message);

  // Fallback: paginate (slower but works without RPC)
  const allCounts: Record<number, number> = {};
  let from = 0;
  const batchSize = 50000;

  while (true) {
    const { data, error } = await supabase
      .from('nuforc_sightings')
      .select('occurred')
      .not('occurred', 'is', null)
      .range(from, from + batchSize - 1)
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) break;

    for (const row of data) {
      if (row.occurred) {
        const year = new Date(row.occurred).getFullYear();
        if (year >= 1400 && year <= 2026) {
          allCounts[year] = (allCounts[year] || 0) + 1;
        }
      }
    }

    from += batchSize;
    if (data.length < batchSize) break;
  }

  const yearCounts = Object.entries(allCounts)
    .map(([year, count]) => ({ year: parseInt(year, 10), count }))
    .sort((a, b) => a.year - b.year);

  return NextResponse.json({ yearCounts }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}

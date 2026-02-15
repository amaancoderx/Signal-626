import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/stats
export async function GET() {
  const supabase = createServerClient();

  // Get total count
  const { count: totalCount } = await supabase
    .from('nuforc_sightings')
    .select('*', { count: 'exact', head: true });

  // Try RPC for shape counts (fast)
  let topShapes: { shape: string; count: number }[] = [];
  let allShapes: string[] = [];

  const { data: shapeRpc, error: shapeErr } = await supabase.rpc('get_shape_counts');

  if (!shapeErr && shapeRpc) {
    topShapes = shapeRpc.slice(0, 20).map((r: { shape: string; count: number }) => ({
      shape: r.shape,
      count: Number(r.count),
    }));
    allShapes = shapeRpc.map((r: { shape: string }) => r.shape);
  } else {
    // Fallback: fetch shapes manually (paginated)
    const shapeCounts: Record<string, number> = {};
    let offset = 0;
    const batch = 50000;

    while (true) {
      const { data } = await supabase
        .from('nuforc_sightings')
        .select('shape')
        .not('shape', 'is', null)
        .range(offset, offset + batch - 1);

      if (!data || data.length === 0) break;

      for (const row of data) {
        if (row.shape) {
          shapeCounts[row.shape] = (shapeCounts[row.shape] || 0) + 1;
        }
      }
      offset += batch;
      if (data.length < batch) break;
    }

    topShapes = Object.entries(shapeCounts)
      .map(([shape, count]) => ({ shape, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    allShapes = Object.keys(shapeCounts).sort();
  }

  return NextResponse.json({
    totalReports: totalCount || 0,
    yearRange: { min: 1400, max: 2026 },
    topShapes,
    allShapes,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}

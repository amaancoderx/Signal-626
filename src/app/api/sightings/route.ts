import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// GET /api/sightings?year=2020&shape=Light
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const shape = searchParams.get('shape');

  if (!year) {
    return NextResponse.json({ error: 'year parameter required', year: 0, count: 0, sightings: [] }, { status: 400 });
  }

  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum) || yearNum < 1400 || yearNum > 2026) {
    return NextResponse.json({ error: 'Invalid year', year: 0, count: 0, sightings: [] }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    return NextResponse.json({ error: 'Missing Supabase config', year: yearNum, count: 0, sightings: [] }, { status: 500 });
  }

  const supabase = createClient(url, key);

  interface Row {
    id: number;
    latitude: number;
    longitude: number;
    shape: string | null;
    occurred: string | null;
    location: string | null;
  }

  const BATCH = 1000;
  const allRows: Row[] = [];

  // Strategy 1: Try RPC function
  let rpcOk = false;
  try {
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .rpc('get_sightings_by_year', {
          target_year: yearNum,
          shape_filter: shape && shape !== 'All' ? shape : null,
        })
        .range(offset, offset + BATCH - 1);

      if (error || !data || !Array.isArray(data)) {
        if (offset === 0) break; // RPC doesn't work, fall through
        break; // No more data
      }

      rpcOk = true;
      for (const r of data) {
        allRows.push({
          id: Number(r.id),
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          shape: r.shape ?? null,
          occurred: r.occurred ?? null,
          location: r.location ?? null,
        });
      }

      if (data.length < BATCH) break;
      offset += BATCH;
    }
  } catch {
    // RPC not available, fall through to REST
  }

  // Strategy 2: Direct REST query
  if (!rpcOk || allRows.length === 0) {
    allRows.length = 0; // clear any partial RPC data
    const startDate = `${yearNum}-01-01T00:00:00`;
    const endDate = `${yearNum + 1}-01-01T00:00:00`;
    let from = 0;

    try {
      while (true) {
        let q = supabase
          .from('nuforc_sightings')
          .select('id, latitude, longitude, shape, occurred, location')
          .gte('occurred', startDate)
          .lt('occurred', endDate)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (shape && shape !== 'All') {
          q = q.eq('shape', shape);
        }

        const { data, error } = await q
          .order('id', { ascending: true })
          .range(from, from + BATCH - 1);

        if (error || !data || data.length === 0) break;

        for (const r of data) {
          allRows.push({
            id: Number(r.id),
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
            shape: r.shape ?? null,
            occurred: r.occurred ?? null,
            location: r.location ?? null,
          });
        }

        if (data.length < BATCH) break;
        from += BATCH;
      }
    } catch {
      // Query failed
    }
  }

  return NextResponse.json({
    year: yearNum,
    count: allRows.length,
    sightings: allRows,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}

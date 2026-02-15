import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type SightingRow = {
  id: number;
  latitude: number;
  longitude: number;
  shape: string | null;
  occurred: string;
  location: string | null;
};

// GET /api/sightings?year=2020&shape=Light
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const shape = searchParams.get('shape');

  if (!year) {
    return NextResponse.json({ error: 'year parameter required' }, { status: 400 });
  }

  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum) || yearNum < 1400 || yearNum > 2026) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const startDate = `${yearNum}-01-01T00:00:00`;
  const endDate = `${yearNum + 1}-01-01T00:00:00`;
  const BATCH = 1000;
  const allSightings: SightingRow[] = [];
  let offset = 0;

  // Build query string with PostgREST filters
  let filterParams = `occurred=gte.${startDate}&occurred=lt.${endDate}&latitude=not.is.null&longitude=not.is.null&select=id,latitude,longitude,shape,occurred,location&order=id.asc`;
  if (shape && shape !== 'All') {
    filterParams += `&shape=eq.${encodeURIComponent(shape)}`;
  }

  // Paginate through all results using direct REST API
  while (true) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/nuforc_sightings?${filterParams}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Range': `${offset}-${offset + BATCH - 1}`,
        },
      }
    );

    if (!res.ok) {
      console.error('Supabase fetch error:', res.status);
      break;
    }

    const data: SightingRow[] = await res.json();
    if (!data || data.length === 0) break;

    allSightings.push(...data);
    offset += BATCH;

    if (data.length < BATCH) break;
  }

  return NextResponse.json({
    year: yearNum,
    count: allSightings.length,
    sightings: allSightings,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}

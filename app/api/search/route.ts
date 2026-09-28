import { NextResponse } from 'next/server';
import { search } from '@/lib/queries';

export const runtime = 'nodejs';

export function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.slice(0, 200) ?? '';
  return NextResponse.json(
    { results: search(query) },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}

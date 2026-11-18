import { NextResponse } from 'next/server';
import { getBootstrap } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Fresh availability, used after a slot clash. Never the cached copy. */
export async function GET() {
  const { data, stale } = await getBootstrap();
  return NextResponse.json(
    { ok: !stale, availability: data.availability, config: data.config },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

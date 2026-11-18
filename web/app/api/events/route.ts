import { NextResponse } from 'next/server';
import { logEvents } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** Anonymous funnel counters. Answers immediately; never blocks the page. */
export async function POST(req: Request) {
  let body: { events?: unknown[] };
  try {
    body = (await req.json()) as { events?: unknown[] };
  } catch {
    return NextResponse.json({ ok: true, written: 0 });
  }

  const events = Array.isArray(body.events) ? body.events.slice(0, 50) : [];
  if (!events.length) return NextResponse.json({ ok: true, written: 0 });

  const result = await logEvents(events);
  return NextResponse.json(result);
}

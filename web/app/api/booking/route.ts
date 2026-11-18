import { NextResponse } from 'next/server';
import { createBooking } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/* The database validates everything again, so this handler deliberately does
   not second-guess it: it passes the fields through and returns the answer.
   Keeping one set of rules in one place is why the two can never disagree. */
const FIELDS = [
  'name', 'phone', 'consent', 'occasion', 'eventDate', 'filmLength',
  'deliveryDate', 'slotTime', 'follower', 'honeypot', 'language',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
  'ad_id', 'fbclid', 'referrer', 'notes',
] as const;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
  }

  const payload: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (body[f] !== undefined && body[f] !== null) payload[f] = String(body[f]).slice(0, 300);
  }

  const result = await createBooking(payload);
  return NextResponse.json(result, { status: 'ok' in result && result.ok ? 200 : 200 });
}

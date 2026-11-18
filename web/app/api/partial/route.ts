import { NextResponse } from 'next/server';
import { savePartial } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/* Fired as someone moves through the form, so a number typed on step one is
   yours even if they never reach the end. Always answers ok: a failure here
   must never stop someone booking. */
const FIELDS = [
  'sessionId', 'step', 'name', 'phone', 'occasion', 'eventDate',
  'filmLength', 'follower', 'price', 'language',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
  'ad_id', 'fbclid', 'referrer',
] as const;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const payload: Record<string, unknown> = {};
    for (const f of FIELDS) {
      if (body[f] !== undefined && body[f] !== null) payload[f] = String(body[f]).slice(0, 300);
    }
    await savePartial(payload);
  } catch { /* swallowed on purpose */ }
  return NextResponse.json({ ok: true });
}

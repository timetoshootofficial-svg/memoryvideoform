import { NextResponse } from 'next/server';
import { adminData, adminLeads, adminSetStatus } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/* The PIN travels to this handler and no further than Postgres, which stores
   only its hash and throttles wrong guesses. It is never put in a URL, so it
   cannot end up in a log or a Referer header. */
export async function POST(req: Request) {
  let body: { action?: string; pin?: string; bookingId?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
  }

  const pin = String(body.pin ?? '');
  if (!pin) return NextResponse.json({ ok: false, code: 'BAD_PIN' });

  if (body.action === 'leads') return NextResponse.json(await adminLeads(pin));

  if (body.action === 'setStatus') {
    return NextResponse.json(
      await adminSetStatus(pin, String(body.bookingId ?? ''), String(body.status ?? '')),
    );
  }
  return NextResponse.json(await adminData(pin));
}

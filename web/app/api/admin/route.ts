import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { adminData, adminLeads, adminPayments, adminSetPackages, adminPackages, adminSetStatus } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/* The PIN travels to this handler and no further than Postgres, which stores
   only its hash and throttles wrong guesses. It is never put in a URL, so it
   cannot end up in a log or a Referer header. */
export async function POST(req: Request) {
  let body: { action?: string; pin?: string; bookingId?: string; status?: string;
              values?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
  }

  const pin = String(body.pin ?? '');
  if (!pin) return NextResponse.json({ ok: false, code: 'BAD_PIN' });

  if (body.action === 'leads') return NextResponse.json(await adminLeads(pin));
  if (body.action === 'payments') return NextResponse.json(await adminPayments(pin));
  if (body.action === 'packages') return NextResponse.json(await adminPackages(pin));

  /* Saving packages also drops the cached home page, so the change is on the
     live site in seconds rather than whenever the 60-second window happens to
     turn over. That is what the Publish button is for. */
  if (body.action === 'setPackages') {
    const values: Record<string, number> = {};
    for (const [k, v] of Object.entries(body.values ?? {})) {
      if (/^(list_)?price_(30s|1m|2m|3m|4m|5m)$/.test(k)) values[k] = Math.max(0, Math.round(Number(v) || 0));
    }
    const out = await adminSetPackages(pin, values);
    if (out && 'ok' in out && out.ok) { try { revalidatePath('/'); } catch { /* best effort */ } }
    return NextResponse.json(out);
  }

  if (body.action === 'setStatus') {
    return NextResponse.json(
      await adminSetStatus(pin, String(body.bookingId ?? ''), String(body.status ?? '')),
    );
  }
  return NextResponse.json(await adminData(pin));
}

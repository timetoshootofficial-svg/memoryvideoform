import { NextResponse } from 'next/server';
import { webhookSignatureValid } from '@/lib/razorpay-verify';
import { paymentCaptured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const SECRET = String(process.env.RAZORPAY_WEBHOOK_SECRET ?? '').trim();

/**
 * Razorpay telling us, server to server, what happened.
 *
 * This is the one that matters. The browser's return trip is a convenience —
 * it does not happen if the tab is closed, if the connection drops on the way
 * back, or if the person pays on their phone and walks away. This always
 * arrives, and Razorpay retries it if we are down.
 *
 * The body must be read as text, not parsed and re-stringified: the signature
 * is over the exact bytes that were sent.
 */
export async function POST(req: Request) {
  if (!SECRET) {
    console.error('[webhook] RAZORPAY_WEBHOOK_SECRET is not set; refusing');
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  if (!webhookSignatureValid({ rawBody: raw, signature, webhookSecret: SECRET })) {
    /* Anyone can post here. Without this check, anyone could mark a booking
       paid. Answer 400 and say nothing more. */
    console.error('[webhook] bad signature');
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const name = String(event.event ?? '');

  /* Only a captured payment moves money. Everything else is noise we
     acknowledge so Razorpay stops retrying it. */
  if (name !== 'payment.captured') {
    return NextResponse.json({ ok: true, ignored: name });
  }

  const payload = event.payload as { payment?: { entity?: Record<string, unknown> } } | undefined;
  const entity = payload?.payment?.entity ?? {};
  const paymentId = String(entity.id ?? '');
  const orderId   = String(entity.order_id ?? '');
  const method    = String(entity.method ?? '');

  if (!paymentId || !orderId) {
    return NextResponse.json({ ok: true, ignored: 'incomplete' });
  }

  const result = await paymentCaptured({
    order_id: orderId, payment_id: paymentId, method,
  });

  /* A failure here must NOT be a 200: Razorpay retries non-2xx, which is
     exactly what we want if the database was briefly unreachable. */
  if (!result || !('ok' in result) || !result.ok) {
    console.error('[webhook] could not record', paymentId.slice(0, 24));
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

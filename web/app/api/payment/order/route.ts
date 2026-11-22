import { NextResponse } from 'next/server';
import { createOrder, publicKeyId, razorpayConfigured, isTestMode } from '@/lib/razorpay';
import { paymentStarted, getBootstrap } from '@/lib/supabase';
import { BUSINESS } from '@/lib/business';
import { toPaise } from '@/lib/razorpay-verify';

export const dynamic = 'force-dynamic';

/**
 * Start a payment.
 *
 * The amount is NOT taken from the request. It is read here, on the server,
 * from the config table — otherwise the price would be whatever the person
 * paying typed into the developer console.
 */
export async function POST(req: Request) {
  if (!razorpayConfigured()) {
    return NextResponse.json({ ok: false, code: 'NOT_CONFIGURED' }, { status: 200 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
  }

  const bookingId = String(body.bookingId ?? '').slice(0, 40);
  const sessionId = String(body.sessionId ?? '').slice(0, 80);
  if (!/^TTS-\d+$/.test(bookingId)) {
    return NextResponse.json({ ok: false, code: 'BAD_BOOKING' }, { status: 200 });
  }

  const { data } = await getBootstrap();
  const fee = Number((data.config as Record<string, unknown>).booking_fee) || BUSINESS.bookingFee;
  const amountPaise = toPaise(fee);
  if (amountPaise <= 0) {
    return NextResponse.json({ ok: false, code: 'BAD_AMOUNT' }, { status: 200 });
  }

  const order = await createOrder({
    amountPaise,
    receipt: bookingId,
    notes: { booking_id: bookingId, kind: 'hold' },
  });

  if ('error' in order) {
    return NextResponse.json({ ok: false, code: order.error }, { status: 200 });
  }

  /* Recorded before the window opens. A capture is only believed for an order
     that exists here, and for the amount written here.
     If this fails we must not open the checkout: the money would be taken and
     there would be nothing to attach it to. Better to refuse than to charge
     someone for a booking we cannot mark as held. */
  const started = await paymentStarted({
    order_id: order.id,
    booking_id: bookingId,
    session_id: sessionId,
    kind: 'hold',
    amount_paise: amountPaise,
  });

  if (!started || !('ok' in started) || !started.ok) {
    const code = (started as { code?: string } | null)?.code ?? 'RECORD_FAILED';
    console.error(`[payment] could not record order ${order.id} -> ${code}`);
    return NextResponse.json({ ok: false, code: 'RECORD_FAILED' }, { status: 200 });
  }

  return NextResponse.json({
    ok: true,
    keyId: publicKeyId(),
    orderId: order.id,
    amountPaise,
    currency: 'INR',
    test: isTestMode(),
  });
}

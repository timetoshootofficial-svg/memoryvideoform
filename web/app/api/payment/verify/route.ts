import { NextResponse } from 'next/server';
import { keySecret, razorpayConfigured } from '@/lib/razorpay';
import { checkoutSignatureValid } from '@/lib/razorpay-verify';
import { paymentCaptured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * The browser comes back from the Razorpay window claiming a payment went
 * through. It could claim anything, so nothing here is believed until the
 * signature checks out against the key secret.
 *
 * This is not the only way a payment gets recorded. The webhook does the same
 * job and will arrive even if this trip never happens — a closed tab, a dead
 * connection. Both land on the same row.
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

  const orderId   = String(body.razorpay_order_id ?? '').slice(0, 80);
  const paymentId = String(body.razorpay_payment_id ?? '').slice(0, 80);
  const signature = String(body.razorpay_signature ?? '').slice(0, 200);

  if (!checkoutSignatureValid({ orderId, paymentId, signature, keySecret: keySecret() })) {
    console.error('[payment] verify -> bad signature for order', orderId.slice(0, 24));
    return NextResponse.json({ ok: false, code: 'BAD_SIGNATURE' }, { status: 200 });
  }

  const result = await paymentCaptured({ order_id: orderId, payment_id: paymentId });

  if (!result || !('ok' in result) || !result.ok) {
    const code = (result as { code?: string } | null)?.code ?? 'RECORD_FAILED';
    return NextResponse.json({ ok: false, code }, { status: 200 });
  }

  return NextResponse.json({
    ok: true,
    bookingId: result.booking ?? null,
    paidPaise: result.paid_paise ?? 0,
  });
}

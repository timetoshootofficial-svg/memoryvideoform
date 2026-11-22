import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Checking that a payment really came from Razorpay.
 *
 * Both checks are the same idea: Razorpay signs something with the secret
 * only the two of us hold, and we sign it again and compare. No secret
 * travels, and nothing the browser sends is believed on its own — a browser
 * can claim any payment id it likes.
 *
 * Kept free of `server-only` and of any network call so it can be tested
 * directly, which matters: this is the function that decides whether money
 * was really received.
 */

/** Constant time, so a wrong signature cannot be found one character at a time. */
function sameSignature(a: string, b: string): boolean {
  const x = Buffer.from(String(a ?? ''), 'utf8');
  const y = Buffer.from(String(b ?? ''), 'utf8');
  if (x.length !== y.length || x.length === 0) return false;
  return timingSafeEqual(x, y);
}

const hmac = (secret: string, body: string) =>
  createHmac('sha256', secret).update(body).digest('hex');

/**
 * The browser comes back from the Razorpay window with three values.
 * Razorpay signed `order_id|payment_id` with the key secret.
 */
export function checkoutSignatureValid(
  { orderId, paymentId, signature, keySecret }:
  { orderId: string; paymentId: string; signature: string; keySecret: string },
): boolean {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  return sameSignature(hmac(keySecret, `${orderId}|${paymentId}`), signature);
}

/**
 * The webhook signs the whole raw body with the webhook secret, which is a
 * different secret from the key secret.
 *
 * The body must be the bytes exactly as they arrived. Parsing the JSON and
 * stringifying it again changes the spacing and the signature stops matching,
 * which is the usual reason a webhook "mysteriously" fails.
 */
export function webhookSignatureValid(
  { rawBody, signature, webhookSecret }:
  { rawBody: string; signature: string; webhookSecret: string },
): boolean {
  if (!rawBody || !signature || !webhookSecret) return false;
  return sameSignature(hmac(webhookSecret, rawBody), signature);
}

/** Razorpay counts in paise. ₹99 is 9900, and a rupee amount with a fraction
 *  is a mistake rather than something to round. */
export function toPaise(rupees: number): number {
  const n = Number(rupees);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (!Number.isInteger(n)) return 0;
  return n * 100;
}

import 'server-only';

/**
 * Talking to Razorpay. Server only — the key secret must never reach a
 * browser, and neither must the decision about how much to charge.
 */

const KEY_ID     = String(process.env.RAZORPAY_KEY_ID ?? '').trim();
const KEY_SECRET = String(process.env.RAZORPAY_KEY_SECRET ?? '').trim();

export const razorpayConfigured = () => KEY_ID.length > 0 && KEY_SECRET.length > 0;

/** Safe to send to the browser: the checkout script needs it. The secret is not. */
export const publicKeyId = () => KEY_ID;

/** `rzp_test_…` keys only ever touch Razorpay's test money. Worth knowing so
 *  the page can say so out loud rather than letting anyone think it is real. */
export const isTestMode = () => /^rzp_test_/i.test(KEY_ID);

export const keySecret = () => KEY_SECRET;

export interface RazorpayOrder { id: string; amount: number; currency: string; status: string }

/**
 * Create an order. `amountPaise` is decided by the caller from the config
 * table — never from the request body, or the price would be whatever the
 * person paying says it is.
 */
export async function createOrder(
  { amountPaise, receipt, notes }:
  { amountPaise: number; receipt: string; notes?: Record<string, string> },
): Promise<RazorpayOrder | { error: string }> {
  if (!razorpayConfigured()) return { error: 'NOT_CONFIGURED' };
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) return { error: 'BAD_AMOUNT' };

  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        /* Razorpay rejects a receipt over 40 characters. */
        receipt: String(receipt).slice(0, 40),
        notes: notes ?? {},
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;

    if (!res.ok || !json || typeof json.id !== 'string') {
      /* Razorpay's own message can name the account or the key; it is logged
         here and never returned to the browser. */
      const detail = json ? JSON.stringify(json).slice(0, 400) : '(no body)';
      console.error(`[razorpay] orders -> ${res.status} ${detail}`);
      return { error: res.status === 401 ? 'BAD_KEYS' : 'ORDER_FAILED' };
    }

    return json as unknown as RazorpayOrder;
  } catch (e) {
    console.error('[razorpay] orders ->', e instanceof Error ? e.name : 'unknown');
    return { error: 'NETWORK' };
  } finally {
    clearTimeout(timer);
  }
}

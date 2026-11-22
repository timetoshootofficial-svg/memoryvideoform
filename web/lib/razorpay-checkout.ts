/**
 * Opening Razorpay's checkout window, from the browser.
 *
 * The script is ~100KB and most visitors never reach the price step, so it is
 * not in the page. It is fetched once, when someone arrives at the step where
 * they might pay — early enough that the window opens instantly when they
 * press the button, late enough that nobody downloads it for nothing.
 */

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open(): void;
    on(event: string, handler: (r: unknown) => void): void }; }
}

const SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let loading: Promise<boolean> | null = null;

export function loadCheckout(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (loading) return loading;

  loading = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    const el = existing ?? document.createElement('script');
    el.src = SRC;
    el.async = true;
    el.addEventListener('load', () => resolve(Boolean(window.Razorpay)));
    el.addEventListener('error', () => { loading = null; resolve(false); });
    if (!existing) document.head.appendChild(el);
  });
  return loading;
}

export interface CheckoutResult {
  status: 'paid' | 'dismissed' | 'failed' | 'unavailable';
  orderId?: string;
  paymentId?: string;
  signature?: string;
}

/**
 * Resolves when the window closes, whatever happened — paid, dismissed, or
 * failed. It never rejects: a payment screen that throws leaves the person
 * staring at a spinner.
 */
export function openCheckout(
  { keyId, orderId, amountPaise, name, phone, description, onOpen }:
  { keyId: string; orderId: string; amountPaise: number;
    name?: string; phone?: string; description?: string; onOpen?: () => void },
): Promise<CheckoutResult> {
  return new Promise<CheckoutResult>((resolve) => {
    const Rzp = typeof window !== 'undefined' ? window.Razorpay : undefined;
    if (!Rzp) { resolve({ status: 'unavailable' }); return; }

    let settled = false;
    const done = (r: CheckoutResult) => { if (!settled) { settled = true; resolve(r); } };

    try {
      const rzp = new Rzp({
        key: keyId,
        order_id: orderId,
        amount: amountPaise,
        currency: 'INR',
        name: 'Timetoshoot',
        description: description ?? 'Booking fee',
        /* Prefilled so nobody retypes what they just told us two steps ago. */
        prefill: { name: name ?? '', contact: phone ?? '' },
        theme: { color: '#FFC700' },
        /* The person closing the window is not an error. It resolves, so the
           page can offer to try again instead of hanging. */
        modal: { ondismiss: () => done({ status: 'dismissed' }) },
        handler: (r: Record<string, string>) => done({
          status: 'paid',
          orderId: r.razorpay_order_id,
          paymentId: r.razorpay_payment_id,
          signature: r.razorpay_signature,
        }),
      });

      rzp.on('payment.failed', () => done({ status: 'failed' }));
      rzp.open();
      onOpen?.();
    } catch {
      done({ status: 'unavailable' });
    }
  });
}

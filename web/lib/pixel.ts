/**
 * The four things we tell Meta, and nothing else.
 *
 * Every call is a no-op when the pixel never loaded, so a blocked script, an
 * ad-blocker or a missing id can never throw inside the booking form.
 *
 * What is deliberately NOT sent: name, phone number, occasion. Meta does not
 * need them, and sending personal data to an advertising platform is a line
 * this site does not cross.
 */
type Fbq = (...args: unknown[]) => void;

function fbq(): Fbq | null {
  if (typeof window === 'undefined') return null;
  const f = (window as unknown as { fbq?: Fbq }).fbq;
  return typeof f === 'function' ? f : null;
}

/** They reached the step that shows the price: a real signal of intent. */
export function pixelReachedPrice(value: number) {
  try { fbq()?.('track', 'InitiateCheckout', { value, currency: 'INR' }); } catch { /* never break the form */ }
}

/** They pressed Book now and the lead was recorded. */
export function pixelLead(value: number, filmLength: string) {
  try {
    fbq()?.('track', 'Lead', {
      value, currency: 'INR', content_category: 'memory_film', content_name: filmLength,
    });
  } catch { /* never break the form */ }
}

/**
 * They paid the booking fee.
 *
 * Sent as AddToCart, deliberately NOT as Purchase. Meta optimises toward
 * whichever conversion is cheapest to get, so if a ₹99 hold and a ₹1,500
 * advance were both "Purchase" it would learn to find people who pay ₹99 and
 * stop there. They are different events because they are different things.
 *
 * This is also the event worth optimising a campaign toward for now: at this
 * volume the advance will never give Meta the ~50 conversions a week it needs
 * to learn anything, and this will.
 */
export function pixelHoldPaid(valueRupees: number) {
  try {
    fbq()?.('track', 'AddToCart', {
      value: valueRupees, currency: 'INR', content_category: 'booking_fee',
    });
  } catch { /* never break the form */ }
}

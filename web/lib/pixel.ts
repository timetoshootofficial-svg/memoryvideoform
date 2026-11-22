/**
 * The three things we tell Meta, and nothing else.
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

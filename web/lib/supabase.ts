import 'server-only';
import type { Bootstrap, BookingResult, SiteConfig } from './types';
import { SITE } from './site';

/**
 * The only place that talks to Supabase, and it never runs in the browser.
 *
 * This is the one real gain of moving to Next.js: on the static site the
 * publishable key shipped in every page source. Here it stays in the server
 * environment, so the database is not addressable from a visitor's machine at
 * all. The row level security behind it is unchanged — belt and braces.
 */

const URL_ = process.env.SUPABASE_URL ?? '';
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';

export const backendConfigured = () => URL_.startsWith('http') && KEY.length > 0;

type Rpc = 'tts_bootstrap' | 'tts_log_events' | 'tts_create_lead'
         | 'tts_create_booking' | 'tts_admin_data' | 'tts_admin_set_status';

async function rpc<T>(
  fn: Rpc,
  args: Record<string, unknown>,
  opts: { revalidate?: number; timeoutMs?: number } = {},
): Promise<T | { ok: false; code: string; message?: string }> {
  if (!backendConfigured()) return { ok: false, code: 'NO_API' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);

  try {
    const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify(args),
      signal: controller.signal,
      ...(opts.revalidate === undefined
        ? { cache: 'no-store' as const }
        : { next: { revalidate: opts.revalidate } }),
    });

    const text = await res.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { /* not json */ }

    if (!res.ok) {
      /* PostgREST explains itself in `message` — "Could not find the function
         public.tts_create_lead(p) in the schema cache" and the like. That
         belongs in the server log, not in front of someone trying to book a
         film for their parents. The code travels; the prose does not. */
      const msg = typeof body === 'object' && body && 'message' in body
        ? String((body as { message: unknown }).message) : '';
      console.error(`[supabase] ${fn} -> ${res.status} ${msg}`);
      return { ok: false, code: res.status === 404 ? 'NOT_DEPLOYED' : `HTTP_${res.status}` };
    }
    if (body && typeof body === 'object') return body as T;
    return { ok: false, code: 'BAD_RESPONSE' };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return { ok: false, code: aborted ? 'TIMEOUT' : 'NETWORK' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Prices and rules. Cached for 60s, as the old page was.
 *
 * It asks for a single day of availability rather than the whole window: the
 * page no longer shows a calendar, and 61 days of slots was 15 KB of JSON
 * nobody read.
 */
export async function getBootstrap(): Promise<{ data: Bootstrap; stale: boolean }> {
  const today = new Date().toISOString().slice(0, 10);
  const r = await rpc<Bootstrap>('tts_bootstrap', { p_from: today, p_to: today }, { revalidate: 60 });
  if ('ok' in r && r.ok) return { data: r, stale: false };

  /* The page must still render and still be honest: show the prices we know
     rather than an empty screen. */
  return {
    data: {
      ok: true,
      config: { ...SITE.fallback, today, film_lengths: [] } as unknown as SiteConfig,
      availability: [],
      testimonials: [],
    },
    stale: true,
  };
}

/**
 * Records someone who wants a film. No slot is held: the date is agreed in the
 * WhatsApp conversation that follows, which is where it was always really
 * agreed. `tts_create_booking` is still there for the day the calendar comes
 * back, and still works.
 */
export const createLead = (payload: Record<string, unknown>) =>
  rpc<BookingResult>('tts_create_lead', { p: payload }, { timeoutMs: 20000 });

export const createBooking = (payload: Record<string, unknown>) =>
  rpc<BookingResult>('tts_create_booking', { p: payload }, { timeoutMs: 20000 });

export const logEvents = (events: unknown[]) =>
  rpc<{ ok: true; written: number }>('tts_log_events', { p_events: events }, { timeoutMs: 8000 });

export const adminData = (pin: string) =>
  rpc<Record<string, unknown>>('tts_admin_data', { p_pin: pin }, { timeoutMs: 20000 });

export const adminSetStatus = (pin: string, bookingId: string, status: string) =>
  rpc<Record<string, unknown>>('tts_admin_set_status',
    { p_pin: pin, p_booking_id: bookingId, p_status: status }, { timeoutMs: 15000 });

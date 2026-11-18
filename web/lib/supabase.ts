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

type Rpc = 'tts_bootstrap' | 'tts_log_events' | 'tts_create_booking'
         | 'tts_admin_data' | 'tts_admin_set_status';

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
      const msg = typeof body === 'object' && body && 'message' in body
        ? String((body as { message: unknown }).message) : '';
      return { ok: false, code: res.status === 404 ? 'NOT_DEPLOYED' : `HTTP_${res.status}`, message: msg };
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

/** Prices, rules and which slots are gone. Cached for 60s, as the old page was. */
export async function getBootstrap(): Promise<{ data: Bootstrap; stale: boolean }> {
  const r = await rpc<Bootstrap>('tts_bootstrap', { p_from: null, p_to: null }, { revalidate: 60 });
  if ('ok' in r && r.ok) return { data: r, stale: false };

  /* The page must still render and still be honest: show the prices we know,
     and no calendar, rather than an empty screen. */
  const today = new Date().toISOString().slice(0, 10);
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

export const createBooking = (payload: Record<string, unknown>) =>
  rpc<BookingResult>('tts_create_booking', { p: payload }, { timeoutMs: 20000 });

export const logEvents = (events: unknown[]) =>
  rpc<{ ok: true; written: number }>('tts_log_events', { p_events: events }, { timeoutMs: 8000 });

export const adminData = (pin: string) =>
  rpc<Record<string, unknown>>('tts_admin_data', { p_pin: pin }, { timeoutMs: 20000 });

export const adminSetStatus = (pin: string, bookingId: string, status: string) =>
  rpc<Record<string, unknown>>('tts_admin_set_status',
    { p_pin: pin, p_booking_id: bookingId, p_status: status }, { timeoutMs: 15000 });

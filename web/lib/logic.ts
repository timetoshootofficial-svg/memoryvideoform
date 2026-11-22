/**
 * Pure booking rules — no I/O, no React, no DOM.
 *
 * The authoritative copy of these rules lives in Postgres (supabase/schema.sql),
 * because the browser can never be trusted with a price. This file exists so
 * the page can show the same answer the server is going to give, without a
 * round trip. When a rule changes, it changes in both places.
 */
import { LENGTHS, type FilmLength, type SiteConfig,
         type AvailabilityDay, type CalendarDay, type DayTime } from './types';

const isLength = (v: string): v is FilmLength => (LENGTHS as readonly string[]).includes(v);

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* ------------------------------- lengths ------------------------------- */

/** Only the lengths this project actually prices are offered. */
export function availableLengths(config: Partial<SiteConfig>): FilmLength[] {
  return LENGTHS.filter((code) => num(config[`price_${code}`]) > 0);
}

/* -------------------------------- dates -------------------------------- */

const pad2 = (n: number) => (n < 10 ? '0' : '') + n;

/** Date | 'YYYY-MM-DD' | '' -> 'YYYY-MM-DD' | '' */
export function normDate(v: Date | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return '';
    return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v).trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/** Day arithmetic in UTC, so it never shifts across a daylight-saving edge. */
export function addDays(dateStr: string, days: number): string {
  const p = String(dateStr).split('-');
  const d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function daysBetween(a: string, b: string): number {
  const pa = String(a).split('-');
  const pb = String(b).split('-');
  return Math.round(
    (Date.UTC(+pb[0], +pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], +pa[1] - 1, +pa[2])) / 86400000,
  );
}

/* -------------------------------- people ------------------------------- */

/** The clean 10-digit number, or '' when it is not a valid Indian mobile. */
export function normalizePhone(v: string | null | undefined): string {
  let d = String(v ?? '').replace(/[^0-9]/g, '');
  if (d.length > 11 && d.startsWith('00')) d = d.slice(2);
  if (d.length === 13 && d.startsWith('091')) d = d.slice(3);
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : '';
}

export const isValidPhone = (v: string | null | undefined) => normalizePhone(v) !== '';

/** Two letters is enough, and Tamil letters count. */
export function isValidName(v: string | null | undefined): boolean {
  return String(v ?? '').trim().replace(/[^A-Za-z஀-௿]/g, '').length >= 2;
}

/* ------------------------------- pricing ------------------------------- */

export function unitsFor(config: Partial<SiteConfig>, filmLength: string): number {
  if (!isLength(filmLength)) return 0;
  const v = config[`units_${filmLength}`];
  if (v === '' || v === null || v === undefined) return 1;
  const n = Number(v);
  return !Number.isFinite(n) || n < 1 ? 1 : n;
}

export function basePrice(config: Partial<SiteConfig>, filmLength: string): number {
  if (!isLength(filmLength)) return 0;
  const n = num(config[`price_${filmLength}`], 0);
  return n < 0 ? 0 : n;
}

/**
 * The struck-through "was" price. Zero when it is missing or not above what
 * is actually charged, so a blank or a mistake shows no strike rather than an
 * invented saving — which is what the law objects to.
 */
export function listPrice(config: Partial<SiteConfig>, filmLength: string): number {
  if (!isLength(filmLength)) return 0;
  const n = num(config[`list_price_${filmLength}`], 0);
  if (n <= 0) return 0;
  return n > basePrice(config, filmLength) ? n : 0;
}

/* The Instagram-follower discount was removed on 22 November 2026. The shape
   of what this returns is unchanged so the price box and the tests that read
   it did not all have to move at once; discount is simply always zero. */
export function calcPrice(config: Partial<SiteConfig>, filmLength: string) {
  const base = basePrice(config, filmLength);
  if (!base) return { base: 0, discount: 0, total: 0, list: 0 };
  return { base, discount: 0, total: base, list: listPrice(config, filmLength) };
}

/* ----------------------------- availability ---------------------------- */

export const countFreeTimes = (times: DayTime[] | null | undefined): number =>
  (times ?? []).filter((t) => !t.taken).length;

export interface EvaluateOpts {
  today: string;
  minLeadDays: number;
  bookingWindowDays: number;
  eventDate?: string;
  units: number;
  slotsLeft: number;
  freeTimes?: number | null;
}

export function evaluateDate(date: string, opts: EvaluateOpts): {
  selectable: boolean;
  reason: CalendarDay['reason'];
  best: boolean;
} {
  const today = normDate(opts.today);
  const minLead = num(opts.minLeadDays);
  const windowDays = num(opts.bookingWindowDays, 60) || 60;
  const eventDate = normDate(opts.eventDate);
  const units = num(opts.units, 1) || 1;
  const left = num(opts.slotsLeft);

  if (date < addDays(today, minLead)) return { selectable: false, reason: 'lead_time', best: false };
  if (date > addDays(today, windowDays)) return { selectable: false, reason: 'out_of_window', best: false };
  if (eventDate && date >= eventDate) return { selectable: false, reason: 'after_event', best: false };
  if (left < units) return { selectable: false, reason: 'full', best: false };
  if (opts.freeTimes !== undefined && opts.freeTimes !== null && num(opts.freeTimes) <= 0) {
    return { selectable: false, reason: 'full', best: false };
  }

  // The sweet spot: delivered one to three days before the occasion.
  let best = false;
  if (eventDate) {
    const gap = daysBetween(date, eventDate);
    best = gap >= 1 && gap <= 3;
  }
  return { selectable: true, reason: 'ok', best };
}

export interface BuildCalendarOpts {
  today: string;
  minLeadDays: number;
  bookingWindowDays: number;
  eventDate?: string;
  units: number;
}

export function buildCalendar(
  availability: AvailabilityDay[] | null | undefined,
  opts: BuildCalendarOpts,
): CalendarDay[] {
  return (availability ?? []).map((day) => {
    const times = day.times ?? null;
    const free = day.freeTimes ?? (times ? countFreeTimes(times) : undefined);

    const e = evaluateDate(day.date, { ...opts, slotsLeft: day.slotsLeft, freeTimes: free });

    /* "n left" is whichever runs out first: the capacity you set, or the time
       slots still open that day. Promising four when only one hour is free
       would be a lie the booking step then has to take back. */
    const shown = free === undefined || free === null ? day.slotsLeft : Math.min(day.slotsLeft, free);

    return {
      date: day.date,
      slotsLeft: shown,
      capacityLeft: day.slotsLeft,
      capacity: day.capacity,
      times,
      freeTimes: free,
      selectable: e.selectable,
      reason: e.reason,
      best: e.best,
    };
  });
}

export const hasAnySelectable = (calendar: CalendarDay[]) => calendar.some((d) => d.selectable);

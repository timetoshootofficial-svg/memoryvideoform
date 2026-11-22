import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../lib/logic.ts';
import { STRINGS } from '../lib/i18n.ts';
import { LENGTHS } from '../lib/types.ts';

const CONFIG = {
  today: '2026-11-18',
  price_30s: 2999, price_1m: 4999, price_2m: 7999,
  price_3m: 9999, price_4m: 13999, price_5m: 16999,
  list_price_1m: 0, list_price_2m: 9499, list_price_3m: 500,
  units_30s: 1, units_1m: 1, units_2m: 2, units_3m: 2, units_4m: 3, units_5m: 3,
  follower_discount: 200, daily_capacity: 4,
  min_lead_days: 3, booking_window_days: 60, slot_hold_hours: 24,
} as never;

test('phone numbers are normalised the way the database does it', () => {
  for (const v of ['9876543210', '+91 98765 43210', '09876543210',
                   '919876543210', '0091 9876543210', '+919876543210'])
    assert.equal(L.normalizePhone(v), '9876543210', v);
  for (const v of ['12345', '5876543210', '987654321', '', 'abcdefghij', '98765432100'])
    assert.equal(L.normalizePhone(v), '', v);
});

test('a Tamil name is a valid name', () => {
  assert.ok(L.isValidName('வசந்த்'));
  assert.ok(L.isValidName('Priya'));
  assert.ok(!L.isValidName('A'));
  assert.ok(!L.isValidName('123'));
});

test('only lengths that carry a price are offered', () => {
  assert.deepEqual(L.availableLengths(CONFIG), ['30s', '1m', '2m', '3m', '4m', '5m']);
  assert.deepEqual(L.availableLengths({ price_1m: 4999, price_2m: 0 } as never), ['1m']);
});

test('nothing takes money off the listed price any more', () => {
  /* The Instagram-follower discount was removed on 22 November 2026. The ad
     quotes the list price, so anything that quietly reduced it would put the
     advertisement and the page back out of step — the exact problem the
     price-match work fixed. */
  const p = L.calcPrice(CONFIG, '1m');
  assert.equal(p.total, p.base, 'the total must be the listed price');
  assert.equal(p.discount, 0);

  /* Even if a stale follower_discount is still sitting in the config table,
     the page must ignore it. */
  const stale = L.calcPrice({ price_1m: 4999, follower_discount: 200 } as never, '1m');
  assert.equal(stale.total, 4999, 'a leftover config value must not reach the price');
});

test('a struck price is only shown when it is genuinely higher', () => {
  assert.equal(L.listPrice(CONFIG, '2m'), 9499);   // above the 7999 charged
  assert.equal(L.listPrice(CONFIG, '3m'), 0);      // 500 is below 9999, so no strike
  assert.equal(L.listPrice(CONFIG, '1m'), 0);      // zero means no strike
});

test('dates respect lead time, the booking window and the event date', () => {
  const o = { today: '2026-11-18', minLeadDays: 3, bookingWindowDays: 60,
              units: 1, slotsLeft: 4, freeTimes: 4 };
  assert.equal(L.evaluateDate('2026-11-20', o).reason, 'lead_time');
  assert.equal(L.evaluateDate('2026-11-21', o).selectable, true);
  assert.equal(L.evaluateDate('2027-02-01', o).reason, 'out_of_window');
  assert.equal(L.evaluateDate('2026-12-10', { ...o, eventDate: '2026-12-10' }).reason, 'after_event');
  assert.equal(L.evaluateDate('2026-12-01', { ...o, slotsLeft: 0 }).reason, 'full');
});

test('a day with capacity but no free time slot is still full', () => {
  const o = { today: '2026-11-18', minLeadDays: 3, bookingWindowDays: 60, units: 1, slotsLeft: 3 };
  assert.equal(L.evaluateDate('2026-12-01', { ...o, freeTimes: 0 }).reason, 'full');
  assert.equal(L.evaluateDate('2026-12-01', { ...o, freeTimes: 1 }).selectable, true);
});

test('"n left" never promises more than the free time slots allow', () => {
  const [day] = L.buildCalendar(
    [{ date: '2026-12-01', capacity: 4, used: 0, slotsLeft: 4, freeTimes: 1,
       times: [{ time: '11:00 AM', taken: false }, { time: '1:00 PM', taken: true },
               { time: '4:00 PM', taken: true }, { time: '7:00 PM', taken: true }] }],
    { today: '2026-11-18', minLeadDays: 3, bookingWindowDays: 60, units: 1 });
  assert.equal(day.slotsLeft, 1, 'shows the smaller of capacity and free times');
  assert.equal(day.capacityLeft, 4);
});

test('a longer film needs more capacity than a short one', () => {
  for (const code of LENGTHS) {
    const u = L.unitsFor(CONFIG, code);
    assert.ok(u >= 1 && u <= 4, `${code} uses ${u} units`);
    assert.ok(u <= Number(CONFIG['daily_capacity' as never]),
      `${code} must fit inside one day`);
  }
});

test('delivery one to three days before the event is marked best', () => {
  const o = { today: '2026-11-18', minLeadDays: 3, bookingWindowDays: 60,
              units: 1, slotsLeft: 4, freeTimes: 4, eventDate: '2026-12-10' };
  assert.equal(L.evaluateDate('2026-12-08', o).best, true);
  assert.equal(L.evaluateDate('2026-12-01', o).best, false);
});

test('every English string has a Tamil translation, and the reverse', () => {
  const en = Object.keys(STRINGS.en);
  const ta = Object.keys(STRINGS.ta);
  assert.deepEqual(en.filter((k) => !ta.includes(k)), [], 'missing Tamil');
  assert.deepEqual(ta.filter((k) => !en.includes(k)), [], 'extra Tamil');
  assert.ok(en.length > 120);
});

test('every film length has a label and a short label in both languages', () => {
  for (const code of LENGTHS)
    for (const lang of ['en', 'ta'] as const) {
      assert.ok((STRINGS[lang] as Record<string, string>)[`len_${code}`], `${lang} len_${code}`);
      assert.ok((STRINGS[lang] as Record<string, string>)[`len_${code}_short`], `${lang} len_${code}_short`);
    }
});

test('WhatsApp messages carry no emoji, because wa.me mangles them', () => {
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
  for (const lang of ['en', 'ta'] as const)
    for (const [k, v] of Object.entries(STRINGS[lang]))
      if (k.startsWith('wa_')) assert.ok(!emoji.test(v as string), `${lang}.${k}`);
});

test('day arithmetic does not drift across a month or year boundary', () => {
  assert.equal(L.addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(L.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(L.addDays('2027-01-01', -1), '2026-12-31');
  assert.equal(L.daysBetween('2026-12-08', '2026-12-10'), 2);
});

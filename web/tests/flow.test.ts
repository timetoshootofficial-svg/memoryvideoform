import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STRINGS } from '../lib/i18n.ts';

const form = readFileSync(new URL('../components/booking/BookingForm.tsx', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../../supabase/02_no_calendar.sql', import.meta.url), 'utf8');

test('every call to action says the same thing in both languages', () => {
  for (const lang of ['en', 'ta'] as const) {
    const s = STRINGS[lang] as Record<string, string>;
    assert.equal(s.nav_cta, s.start_cta, `${lang}: nav and hero must match`);
    assert.equal(s.start_cta, s.sticky_cta, `${lang}: hero and sticky must match`);
    assert.equal(s.sticky_cta, s.reserve_cta, `${lang}: sticky and submit must match`);
  }
  assert.equal(STRINGS.en.start_cta, 'Book now');
});

test('the form no longer asks for a date or an hour', () => {
  for (const gone of ['deliveryDate', 'slotTime', 'Calendar', 'tchip', 'legend', 'buildCalendar'])
    assert.ok(!form.includes(gone), `BookingForm still references ${gone}`);
});

test('nothing promises to hold a slot any more', () => {
  for (const lang of ['en', 'ta'] as const)
    for (const key of ['reserve_note', 'success_note', 'success_body'])
      assert.ok(!/\{hours\}/.test((STRINGS[lang] as Record<string, string>)[key]),
        `${lang}.${key} still talks about a hold`);
});

test('the WhatsApp message carries no date or time it cannot know', () => {
  for (const lang of ['en', 'ta'] as const) {
    const m = (STRINGS[lang] as Record<string, string>).wa_message;
    assert.ok(!m.includes('{date}') && !m.includes('{time}'), `${lang}.wa_message`);
    for (const need of ['{name}', '{id}', '{length}', '{occasion}', '{amount}'])
      assert.ok(m.includes(need), `${lang}.wa_message is missing ${need}`);
  }
});

test('every placeholder the form fills exists in the string, and vice versa', () => {
  const pairs: Array<[string, string[]]> = [
    ['wa_message', ['name', 'id', 'occasion', 'length', 'amount']],
    ['mini_sum', ['length', 'occasion']],
    ['success_body', ['id']],
    ['step_of', ['n', 'total']],
  ];
  for (const lang of ['en', 'ta'] as const)
    for (const [key, given] of pairs) {
      const raw = (STRINGS[lang] as Record<string, string>)[key];
      const wanted = [...raw.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      for (const w of wanted)
        assert.ok(given.includes(w), `${lang}.${key} wants {${w}} which the form never passes`);
    }
});

test('the thank-you screen does not redirect on its own', () => {
  assert.ok(!/window\.location\.href\s*=/.test(form),
    'the success screen must leave the visitor a button to tap');
  assert.ok(form.includes("t('open_whatsapp')"), 'the WhatsApp button is missing');
});

test('the lead function is granted, and the price still comes from config', () => {
  assert.ok(/grant execute on function public\.tts_create_lead\(jsonb\) to anon/.test(sql));
  assert.ok(sql.includes("public.tts_cfg_num('price_' || v_length, 0)"),
    'the price must be read from config, never from the request');
  assert.ok(!/p->>'price'|p->>'total'|p->>'status'/.test(sql),
    'the request must not be able to set price, total or status');
});

test('a lead is written with no slot and no hold', () => {
  assert.ok(/null, null, v_units/.test(sql), 'delivery_date and slot_time must be null');
  assert.ok(/'Pending', null,/.test(sql), 'hold_until must be null');
});

test('a database failure never shows its own words to the visitor', () => {
  const layer = readFileSync(new URL('../lib/supabase.ts', import.meta.url), 'utf8');
  const notOk = layer.slice(layer.indexOf('if (!res.ok)'), layer.indexOf('if (body && typeof body'));
  assert.ok(!/message:\s*msg/.test(notOk),
    'the PostgREST message must stay in the log, not travel to the browser');
  assert.ok(/console\.error/.test(notOk), 'it should still be logged server-side');
});

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

test('the WhatsApp button is the loudest thing on the thank-you screen', () => {
  const screen = form.slice(form.indexOf('step === RESULT_STEP'));
  assert.ok(/className="btn btn-primary" href=\{waHref\}/.test(screen),
    'it must use the primary style, not the quiet btn-wa outline');
});

test('consent is given by continuing, not by a tick', () => {
  assert.ok(!/type="checkbox"[^>]*consent|checked=\{data\.consent\}/.test(form),
    'the consent checkbox should be gone');
  assert.ok(form.includes("{t('consent')}"), 'the consent line must still be shown');
  assert.ok(form.includes("consent: 'true'"), 'the server still requires consent to be asserted');
  for (const lang of ['en', 'ta'] as const)
    assert.ok(!/\btick\b|கட்டம்/.test((STRINGS[lang] as Record<string, string>).consent),
      `${lang}.consent must not tell anyone to tick anything`);
});

test('the privacy policy describes what the site actually does', () => {
  for (const f of ['../app/privacy/page.tsx', '../../privacy.html']) {
    const page = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!/tick a box/i.test(page), `${f} still claims there is a tick box`);
    assert.ok(!/Google Sheet/i.test(page), `${f} still says the data is in a Google Sheet`);
    assert.ok(!/time slot you choose/i.test(page), `${f} still mentions choosing a time slot`);
  }
});

test('the form captures a lead at every step, not only at the end', () => {
  assert.ok(form.includes("fetch('/api/partial'"), 'the form never saves a partial');
  assert.ok(/capture\(from \+ 1, data\)/.test(form), 'advancing a step must capture');
  assert.ok(/visibilitychange/.test(form), 'leaving the tab should capture what there is');
  assert.ok(form.includes("sessionId: sessionId()"), 'the booking must carry the session');
});

test('the privacy policy says that partial entries are kept', () => {
  for (const f of ['../app/privacy/page.tsx', '../../privacy.html']) {
    const page = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(/record this as you go/i.test(page),
      `${f} does not disclose that half-finished forms are kept`);
  }
});

test('a partial save can never block or break the booking form', () => {
  const capture = form.slice(form.indexOf('const capture ='), form.indexOf('const goStep'));
  assert.ok(!/await\s+fetch\('\/api\/partial'/.test(capture), 'capture must not be awaited');
  assert.ok(/catch\s*\(\s*\)\s*=>\s*\{\s*\}/.test(capture) || /\.catch\(/.test(capture),
    'capture must swallow its own failures');
});

test('the leads view is gated by the same PIN as everything else', () => {
  const route = readFileSync(new URL('../app/api/admin/route.ts', import.meta.url), 'utf8');
  const leadsLine = route.slice(route.indexOf("action === 'leads'"));
  assert.ok(leadsLine.includes('adminLeads(pin)'), 'the leads call must pass the PIN');
  const guard = route.slice(0, route.indexOf("action === 'leads'"));
  assert.ok(/if \(!pin\) return/.test(guard), 'a request with no PIN must be refused first');
});

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

test('the funnel stages are read from what people did, not from a step number', () => {
  const fix = readFileSync(new URL('../../supabase/04_fix_stage_counts.sql', import.meta.url), 'utf8');
  assert.ok(/\(occasion <> ''\)\s*as did_choose_occasion/.test(fix),
    'choosing an occasion must be judged by there being an occasion');
  assert.ok(!/chose_occasion[\s\S]{0,80}step_reached >= 2/.test(fix),
    'reaching step 2 only means they gave a number');
  assert.ok(/case when step_reached >= 3 or completed then price else 0 end/.test(fix),
    'a price should not count before the step that shows it');
});

test('the form records the step it is entering, which the SQL must agree with', () => {
  assert.ok(/capture\(from \+ 1, data\)/.test(form),
    'capture sends the step being entered');
  const fix = readFileSync(new URL('../../supabase/04_fix_stage_counts.sql', import.meta.url), 'utf8');
  assert.ok(/did_see_price[\s\S]{0,60}step_reached >= 3/.test(fix),
    'entering step 3 is what "saw the price" means');
});

test('the hero shows only a number the project actually has', () => {
  const stats = readFileSync(new URL('../components/Stats.tsx', import.meta.url), 'utf8');
  for (const invented of ['rating', 'stars', '4.9', '98%', 'reviews', 'awards'])
    assert.ok(!new RegExp(invented, 'i').test(stats), `Stats invents a ${invented}`);
  assert.ok(/if \(digits <= 0\) return null/.test(stats),
    'with no figure configured the hero must show nothing, not a zero');
  /* The number must arrive as a prop. A literal in the JSX would mean the
     config table had stopped being the source of truth. (The doc comment
     mentions 500 as an example, so only code lines are checked.) */
  const code = stats.split('\n').filter((l) => !/^\s*(\*|\/\*|\/\/)/.test(l)).join('\n');
  assert.ok(/clients: string/.test(code), 'the figure must be a prop');
  assert.ok(!/[>"']\s*\d{3,}\s*\+?\s*[<"']/.test(code),
    'no client count should be written into the component');
});

test('the counted numbers are correct before any JavaScript runs', () => {
  const cu = readFileSync(new URL('../components/CountUp.tsx', import.meta.url), 'utf8');
  assert.ok(/useState\(value\)/.test(cu),
    'the finished number must be the server-rendered one');
  assert.ok(/prefers-reduced-motion/.test(cu), 'it must honour reduced motion');
  assert.ok(/setShown\(value\)/.test(cu), 'reduced motion must land on the real number');
});

test('Tamil headlines are given room for their vowel marks', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.ok(/html\[lang="ta"\] \.display\{line-height:1\.[23]/.test(css),
    'the Latin 1.06 line-height makes Tamil lines collide');
});

test('a length is spelled the same way in its label and its short form', () => {
  /* The price box used the full label and the WhatsApp message the short one,
     so "30 வினாடி" and "30 விநாடி" went out to the same customer. */
  for (const lang of ['en', 'ta'] as const) {
    const table = STRINGS[lang] as Record<string, string>;
    for (const code of ['30s', '1m', '2m', '3m', '4m', '5m']) {
      const full = table[`len_${code}`];
      const short = table[`len_${code}_short`];
      const letters = (v: string) => v.replace(/[0-9\s]/g, '');
      assert.ok(
        letters(short) === letters(full) || letters(full).startsWith(letters(short)),
        `${lang} len_${code}: "${full}" and "${short}" are spelled differently`,
      );
    }
  }
});

test('the headline light runs inside the letters, not over the page', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const block = css.slice(css.indexOf('@supports ((-webkit-background-clip:text)'),
                          css.indexOf('@keyframes led-run'));
  assert.ok(/-webkit-background-clip:text/.test(block) && /background-clip:text/.test(block),
    'the gradient must be clipped to the text');
  assert.ok(!/mix-blend-mode/.test(block),
    'blending would tint the white page; the light belongs in the strokes');

  /* Transparent letters are invisible letters where the clip is unsupported,
     so every line of it must live inside the @supports block. */
  assert.ok(/text-fill-color:transparent/.test(block), 'the fill must be transparent inside @supports');
  const outside = css.replace(block, '');
  assert.ok(!/text-fill-color:transparent/.test(outside),
    'a transparent fill outside @supports would blank the headline');

  const kf = css.slice(css.indexOf('@keyframes led-run'));
  const from = Number(/from\{background-position:(-?\d+)%/.exec(kf)?.[1]);
  const to = Number(/to  \{background-position:(-?\d+)%/.exec(kf)?.[1]);
  assert.ok(from > to, `the light must run left to right (from ${from}% to ${to}%)`);
});

test('reduced motion leaves the headline readable in plain ink', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const quiet = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
  assert.ok(/text-fill-color:var\(--ink\) !important/.test(quiet),
    'with the animation off the letters must be given their colour back');
});

test('the underline under the second line is gone', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.ok(!/h1 \.alt::after/.test(css), 'the yellow underline should be removed');
  for (const name of ['draw', 'swell', 'sweep'])
    assert.ok(!new RegExp('@keyframes ' + name + '\\b').test(css),
      `@keyframes ${name} was only used by that underline`);
});

test('the floating WhatsApp button is on the public pages and not in admin', () => {
  const home = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const privacy = readFileSync(new URL('../app/privacy/page.tsx', import.meta.url), 'utf8');
  const admin = readFileSync(new URL('../app/admin/page.tsx', import.meta.url), 'utf8');
  assert.ok(home.includes('<WhatsAppFab'), 'missing on the home page');
  assert.ok(privacy.includes('<WhatsAppFab'), 'missing on the privacy page');
  assert.ok(!admin.includes('WhatsAppFab'), 'the dashboard is a work tool, not a sales page');

  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const fab = css.slice(css.indexOf('.wafab{'), css.indexOf('.wafab:hover'));
  assert.ok(/position:fixed/.test(fab) && /right:16px/.test(fab), 'it must be pinned bottom right');
  /* Below 768px the sticky Book now bar owns the bottom of the screen. */
  assert.ok(/bottom:calc\(96px/.test(fab), 'it must clear the sticky bar on a phone');
});

test('the floating button opens a plain enquiry, not a booking message', () => {
  const fab = readFileSync(new URL('../components/WhatsAppFab.tsx', import.meta.url), 'utf8');
  assert.ok(fab.includes("t('wa_plain')"), 'it must use the plain message');
  assert.ok(!/wa_message/.test(fab),
    'the booking message names a length and a reference this visitor does not have');
});

/** WCAG relative luminance, so the contrast check is measured not guessed. */
function contrastOnWhite(hex: string): number {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = ch.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return 1.05 / (L + 0.05);
}

test('every colour the light passes through stays readable on white', () => {
  /* The brand yellow is 1.56:1 against white. A letter filled with it does
     not look lit, it looks missing -- which is how this first shipped. */
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const grad = css.slice(css.indexOf('background-image:linear-gradient(100deg'),
                         css.indexOf('background-size:300%'));
  const colours = [...grad.matchAll(/#([0-9A-Fa-f]{6})/g)].map((m) => '#' + m[1]);
  assert.ok(colours.length >= 3, 'expected several stops in the sweep gradient');
  for (const c of colours) {
    const ratio = contrastOnWhite(c);
    assert.ok(ratio >= 3,
      `${c} is ${ratio.toFixed(2)}:1 on white — the words vanish as the light crosses them`);
  }
});

test('the heading has room to paint its descenders', () => {
  /* background-clip:text cuts the background box to the glyphs, so a glyph
     that reaches outside that box is simply not painted. The g in
     "breathing" was losing its tail. */
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const block = css.slice(css.indexOf('@supports ((-webkit-background-clip:text)'),
                          css.indexOf('@keyframes led-run'));
  const pad = /padding:([^;]+);/.exec(block)?.[1] ?? '';
  const bottom = Number(/([\d.]+)em\s*;?\s*$/.exec(pad.trim())?.[1] ?? 0);
  assert.ok(bottom >= 0.15, `padding-bottom is ${bottom}em; a descender needs about .2em`);
  assert.ok(/margin:-[\d.]+em/.test(block),
    'the padding must be given back as negative margin, or the layout shifts');
});

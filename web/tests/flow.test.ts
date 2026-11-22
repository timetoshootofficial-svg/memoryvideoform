import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { STRINGS } from '../lib/i18n.ts';
import * as L from '../lib/logic.ts';

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

test('the headline is visible from the first frame and then stays put', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const entrance = css.slice(css.indexOf('h1 > span{'), css.indexOf('@keyframes head-in'));
  const keyframes = css.slice(css.indexOf('@keyframes head-in'),
                              css.indexOf('}', css.indexOf('to  {transform')) + 2);

  /* Nothing in the headline's entrance may touch opacity or clip the glyphs:
     either one means the words are absent while it plays, and the page reads
     as slow to open. It may only move them. */
  assert.ok(!/opacity/.test(keyframes), 'the headline must never animate from invisible');
  assert.ok(!/clip-path/.test(keyframes), 'clipping the glyphs hides them just as surely');

  const delays = [...entrance.matchAll(/animation-delay:([\d.]+)s/g)].map((m) => Number(m[1]));
  for (const d of delays)
    assert.ok(d <= 0.1, `an entrance delay of ${d}s keeps the headline waiting`);

  assert.ok(!/infinite/.test(entrance), 'the words must not re-animate; only the light repeats');
});

test('the headline itself is never animated, clipped or faded', () => {
  /* background-clip:text looked right in every computed style and still
     rendered nothing, because a background clipped to text does not reliably
     repaint while its position animates. The words are now plain text and
     only a second copy moves. This test is the scar. */
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const hero = readFileSync(new URL('../components/Hero.tsx', import.meta.url), 'utf8');

  /* The comment above the rule explains why this was abandoned, so only
     real declarations are checked. */
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/background-clip:\s*text/.test(rules),
    'the heading must not depend on clipping a background to text');
  assert.ok(!/text-fill-color:\s*transparent/.test(rules),
    'transparent letters are invisible letters when anything goes wrong');

  const lit = css.slice(css.indexOf('.h1wrap > .lit{'), css.indexOf('@keyframes bar-slide'));
  assert.ok(/position:absolute/.test(lit), 'the moving copy must be an overlay');
  assert.ok(/pointer-events:none/.test(lit), 'the overlay must not catch taps');

  /* Only the overlay carries the animation, and it slides a mask rather than
     a hard-edged clip: a clip gives the bar straight sides and the light
     arrives and leaves like a shutter. */
  /* This block, not everything after it. Slicing to the end of the file
     made every rule added to globals.css later part of the headline's
     business, which it is not — the ticket's notches tripped it. */
  const kfAt = css.indexOf('@keyframes bar-slide');
  const kf = css.slice(kfAt, css.indexOf('\n}', kfAt) + 2);
  assert.ok(/mask-position/.test(kf), 'the bar should slide a mask, not repaint the text');
  assert.ok(!/clip-path/.test(kf), 'a clipped band has sharp edges');
  const band = /--band:linear-gradient\(([\s\S]*?)\);/.exec(lit)?.[1] ?? '';
  const stops = [...band.matchAll(/rgba\(0,0,0,([\d.]+)\)/g)].map((m) => Number(m[1]));
  const partial = stops.filter((a) => a > 0 && a < 1).length;
  assert.ok(partial >= 4, `the band needs soft edges; found ${partial} partial stops`);
  assert.ok(hero.includes('aria-hidden="true"'), 'the duplicate must not be read out twice');
});

test('reduced motion leaves the headline in plain ink', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const quiet = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce){\n  .h1wrap"));
  assert.ok(/\.h1wrap > \.lit\{display:none\}/.test(quiet),
    'with motion off the gold copy should simply not be there');
});

test('the gold overlay stays readable on white', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const lit = css.slice(css.indexOf('.h1wrap > .lit{'), css.indexOf('@keyframes bar-slide'));
  const hex = /color:(#[0-9A-Fa-f]{6})/.exec(lit)?.[1];
  assert.ok(hex, 'the overlay needs an explicit colour');
  const ratio = contrastOnWhite(hex);
  assert.ok(ratio >= 3,
    `${hex} is ${ratio.toFixed(2)}:1 on white — the words would vanish as the bar crosses`);
});

test('the heading box lives on the wrapper, so both copies cannot drift apart', () => {
  /* The gold copy is absolutely positioned and fills the wrapper. If an h1
     rule sets a width or a horizontal margin, the copy in flow honours it and
     the overlay does not, and the two slide apart -- which is exactly what
     happened the moment a breakpoint centred the heading with max-width and
     margin:auto. The box belongs to .h1wrap and only to .h1wrap. */
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

  const offenders: string[] = [];
  const re = /(^|[},])\s*([^{}@]*\bh1\b[^{}]*)\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rules))) {
    const selector = m[2].trim();
    if (/h1wrap/.test(selector)) continue;             // the wrapper's own rules are fine
    const body = m[3];
    if (/max-width|margin-left|margin-right|margin:[^;]*auto/.test(body))
      offenders.push(`${selector} { ${body.trim()} }`);
  }
  assert.deepEqual(offenders, [],
    'these h1 rules set a box the absolutely positioned copy cannot follow');
});

test('a measure in ch is read in the font it is written for', () => {
  /* `ch` is the width of a zero in the element's own font. Moving max-width
     from the heading to the wrapper silently read it at body size and broke
     the headline onto five lines. */
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const wrap = /\.h1wrap\{([^}]*max-width:[^}]*)\}/.exec(css)?.[1];
  if (!wrap) return;                                    // no ch measure, nothing to check
  if (!/max-width:[\d.]+ch/.test(wrap)) return;
  assert.ok(/font-size:/.test(wrap) && /font-family:/.test(wrap),
    'a ch measure on the wrapper needs the heading’s own font metrics beside it');
});

test('a pasted Supabase URL is accepted in the shapes a dashboard gives it', async () => {
  /* Every one of these is the same project. Each shape, at some point, meant
     the live site quietly served built-in prices instead of real ones. */
  const { normaliseSupabaseUrl: n } = await import('../lib/supabase-url.ts');
  const want = 'https://abc.supabase.co';
  for (const given of [
    'https://abc.supabase.co',
    'https://abc.supabase.co/',
    'https://abc.supabase.co///',
    'abc.supabase.co',
    '  https://abc.supabase.co  ',
    'https://abc.supabase.co\n',
    'https://abc.supabase.co/rest/v1',
    'https://abc.supabase.co/rest',
    'https://db.abc.supabase.co',
  ]) assert.equal(n(given), want, `"${given.trim()}" should normalise to ${want}`);

  /* A bare project reference, which the dashboard shows on its own in
     several places and which resolves to nothing by itself. */
  assert.equal(n('ksvctdgpwyrtbsucespc'), 'https://ksvctdgpwyrtbsucespc.supabase.co');
  assert.equal(n('  KSVCTDGPWYRTBSUCESPC  '), 'https://ksvctdgpwyrtbsucespc.supabase.co');

  assert.equal(n('http://abc.supabase.co'), 'http://abc.supabase.co', 'an explicit scheme is kept');
  assert.equal(n(''), '', 'an empty value stays empty');
  assert.equal(n(undefined), '', 'a missing value stays empty');
});

test('the server layer uses the normaliser rather than the raw variable', () => {
  const src = readFileSync(new URL('../lib/supabase.ts', import.meta.url), 'utf8');
  assert.ok(/normaliseSupabaseUrl\(process\.env\.SUPABASE_URL\)/.test(src),
    'SUPABASE_URL must be normalised before use');
  assert.ok(!/process\.env\.SUPABASE_URL \?\? ''/.test(src),
    'the raw variable must not be used directly');
});

test('the price step opens on the cheapest film, which is what the ad quotes', () => {
  /* The advertisement quotes the lowest price. The form used to open on the
     most-chosen package, so someone who clicked ₹2,999 met ₹4,999 on the very
     step where the price first appears — and left. */
  const form = readFileSync(new URL('../components/booking/BookingForm.tsx', import.meta.url), 'utf8');
  assert.ok(/filmLength: cheapest/.test(form), 'the default must be the cheapest length');
  assert.ok(/sort\(\(a, b\) => L\.basePrice\(config, a\) - L\.basePrice\(config, b\)\)/.test(form),
    'cheapest must be decided by price, not by the order the lengths are listed in');
  assert.ok(!/most_chosen_package as FilmLength/.test(form),
    'the most-chosen package must not decide what the visitor lands on');
});

test('choosing a length is tapping an option, not dragging a slider', () => {
  const form = readFileSync(new URL('../components/booking/BookingForm.tsx', import.meta.url), 'utf8');
  assert.ok(!/type="range"/.test(form), 'a range input gives no visible options and no certainty on a phone');
  assert.ok(/role="radiogroup"/.test(form) && /role="radio"/.test(form),
    'the options must announce themselves as a choice');
  /* Each option carries its own price, so the cost and the choice are one thing. */
  const block = form.slice(form.indexOf('className="lens"'), form.indexOf('</div>', form.indexOf('className="lens"')) + 2000);
  assert.ok(/L\.calcPrice\(config, code\)/.test(block),
    'each option must price itself');
  assert.ok(/₹\{inr\(p\.total\)\}/.test(block), 'each option must show that price');
});

test('the pixel is only ever loaded with a real id, and never on admin', () => {
  const px = readFileSync(new URL('../components/MetaPixel.tsx', import.meta.url), 'utf8');
  assert.ok(/\^\\d\{10,20\}\$/.test(px), 'a malformed id must inject nothing at all');
  assert.ok(/strategy="afterInteractive"/.test(px), 'it must not compete with the first paint');

  const home = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const admin = readFileSync(new URL('../app/admin/page.tsx', import.meta.url), 'utf8');
  const privacy = readFileSync(new URL('../app/privacy/page.tsx', import.meta.url), 'utf8');
  assert.ok(home.includes('<MetaPixel'), 'the pixel belongs on the page the ads point at');
  assert.ok(!admin.includes('MetaPixel'), 'the dashboard is not advertising traffic');
  assert.ok(!privacy.includes('MetaPixel'), 'the privacy page is not advertising traffic');
});

test('no personal detail is ever sent to Meta', () => {
  /* Meta needs the value of a booking. It does not need who made it, and
     sending a name or a phone number to an ad platform is a line this site
     does not cross. */
  const px = readFileSync(new URL('../lib/pixel.ts', import.meta.url), 'utf8');
  for (const forbidden of ['name', 'phone', 'email', 'occasion'])
    assert.ok(!new RegExp(`\\b${forbidden}\\b\\s*[:,]`).test(px.replace(/\/\*[\s\S]*?\*\//g, '')),
      `pixel.ts appears to send ${forbidden}`);
  assert.ok(/currency: 'INR'/.test(px), 'the value needs its currency or Meta cannot use it');
  assert.ok((px.match(/catch \{/g) || []).length >= 2,
    'every pixel call must swallow its own failure; a blocked script cannot break the form');
});

test('the hero carries the price the advertisement quotes', () => {
  const hero = readFileSync(new URL('../components/Hero.tsx', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.ok(/t\('hero_price'/.test(hero), 'the hero must show a starting price');
  assert.ok(/fromPrice > 0 \?/.test(hero), 'with nothing priced it must show nothing, not zero');
  /* Read from config, so the hero cannot drift from what the form charges. */
  assert.ok(/Math\.min\(\.\.\.priced\)/.test(page), 'the figure must be the cheapest live price');
  assert.ok(!/2,?999/.test(hero), 'the price must not be written into the component');
});

test('the form no longer asks when the occasion is', () => {
  /* The date was settled on WhatsApp anyway. Asking for it here cost a field
     on the step before the price and bought nothing the conversation does
     not already cover. */
  const form = readFileSync(new URL('../components/booking/BookingForm.tsx', import.meta.url), 'utf8');
  for (const gone of ['eventDate', 'f_event', 'showPicker'])
    assert.ok(!form.includes(gone), `the form still references ${gone}`);

  /* ...and the copy it needed went with it, in both languages. */
  const en = STRINGS.en as Record<string, string>;
  const ta = STRINGS.ta as Record<string, string>;
  for (const k of ['label_event_date', 'event_date_hint', 'err_event_past', 'skip_date']) {
    assert.ok(!(k in en), `en.${k} is dead copy`);
    assert.ok(!(k in ta), `ta.${k} is dead copy`);
  }
});

test('the drop-off chart only names steps the page actually has', () => {
  /* The calendar rows survived the calendar's removal and sat at a permanent
     zero, so the chart read as if two thirds of people vanished at a screen
     that no longer exists. Every row must name an event something still
     fires. */
  const admin = readFileSync(new URL('../app/admin/AdminDashboard.tsx', import.meta.url), 'utf8');
  const funnel = readFileSync(new URL('../components/booking/useFunnel.ts', import.meta.url), 'utf8');

  const block = admin.match(/const FUNNEL_STEPS[^=]*=\s*\[([\s\S]*?)\];/);
  assert.ok(block, 'FUNNEL_STEPS must be a literal list');
  const rows = [...block[1].matchAll(/\['([a-z0-9_]+)'/g)].map((m) => m[1]);
  assert.ok(rows.length > 0, 'the chart must have rows');

  /* What the browser can really send: literal track() names, plus the
     template that produces step_2 and step_3. */
  const src = form + funnel;
  const fired = new Set([...src.matchAll(/track\('([a-z0-9_]+)'/g)].map((m) => m[1]));
  if (/track\(`step_\$\{n\}`/.test(src)) for (const n of [1, 2, 3, 4]) fired.add(`step_${n}`);

  for (const key of rows)
    assert.ok(fired.has(key), `the chart shows "${key}", which nothing fires any more`);

  for (const dead of ['step_4', 'date_selected', 'time_selected'])
    assert.ok(!rows.includes(dead), `${dead} belongs to the removed calendar`);

  /* Someone can tap three occasions before settling, so occasion_selected is
     counted more than once per person and its bar would run backwards. */
  assert.ok(!rows.includes('occasion_selected'),
    'occasion_selected can fire repeatedly, so it cannot be a drop-off row');

  /* And the summary underneath must not promise a reservation either. */
  assert.ok(!/Visit to reservation/.test(admin), 'nothing reserves a slot any more');
});

test('the build does not need Google to be up', () => {
  /* next/font/google downloads the font while the site builds. On 22 Nov 2026
     Google did not answer, the loader dereferenced null, and the production
     deploy died with nothing wrong in this repository. The font files live
     here now. */
  const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');

  assert.ok(!/from\s+['"]next\/font\/google['"]/.test(layout),
    'layout.tsx imports next/font/google again — the build is back on Google');
  assert.ok(/from\s+['"]next\/font\/local['"]/.test(layout),
    'layout.tsx must load the fonts from this repository');

  /* Every file it names must actually be here, or the build fails. */
  const srcs = [...layout.matchAll(/src:\s*'\.\/(fonts\/[^']+)'/g)].map((m) => m[1]);
  assert.equal(srcs.length, 3, 'three families: display, body, Tamil');
  for (const rel of srcs) {
    const p = new URL('../app/' + rel, import.meta.url);
    assert.ok(statSync(p).size > 10_000, `${rel} is missing or too small to be a font`);
    const head = readFileSync(p).subarray(0, 4).toString('latin1');
    assert.equal(head, 'wOF2', `${rel} is not a woff2 file`);
  }

  /* One file per family only works because each is a variable font, so the
     weight has to be a range. A single number would flatten the headline,
     the half-bold price labels and the Tamil body to one weight. */
  const ranges = [...layout.matchAll(/weight:\s*'(\d+)\s+(\d+)'/g)];
  assert.equal(ranges.length, 3, 'each family needs a weight range, not one weight');
  for (const [, lo, hi] of ranges)
    assert.ok(Number(hi) > Number(lo), `weight range ${lo} ${hi} is not a range`);
});

test('the pages a payment provider looks for are all there and agree', () => {
  /* Razorpay checks the site before it activates an account, and it checks
     that the refund terms on the page match what the account claims. These
     four pages must exist, link to each other, and be linked from the page
     people pay on. */
  const pages = ['terms', 'refunds', 'privacy', 'contact'];
  for (const p of pages)
    assert.ok(statSync(new URL(`../app/${p}/page.tsx`, import.meta.url)).size > 500,
      `/${p} is missing`);

  const footer = readFileSync(new URL('../components/Footer.tsx', import.meta.url), 'utf8');
  for (const p of pages)
    assert.ok(footer.includes(`'/${p}'`), `the footer does not link /${p}`);

  /* Both languages need the label, or the Tamil footer silently shows a key. */
  const en = STRINGS.en as Record<string, string>;
  const ta = STRINGS.ta as Record<string, string>;
  for (const k of ['footer_terms_link', 'footer_refunds_link',
                   'footer_privacy_link', 'footer_contact_link']) {
    assert.ok(en[k], `en.${k} missing`);
    assert.ok(ta[k], `ta.${k} missing`);
    assert.notEqual(en[k], ta[k], `${k} was never translated`);
  }

  /* One source for the contact details, so the three pages cannot disagree
     with each other or with the Razorpay account. */
  const biz = readFileSync(new URL('../lib/business.ts', import.meta.url), 'utf8');
  for (const must of ['phone', 'whatsapp', 'address', 'hours', 'revisions',
                      'bookingFee', 'refundDays'])
    assert.ok(new RegExp(`\\b${must}\\s*:`).test(biz), `business.ts has no ${must}`);

  /* The account is an individual one. Claiming a company would not survive
     the check, and would not be true. */
  const terms = readFileSync(new URL('../app/terms/page.tsx', import.meta.url), 'utf8');
  assert.ok(/not a separately registered company/.test(terms),
    'the terms must not imply a registered company');

  /* The one rule the whole refund policy turns on. */
  const refunds = readFileSync(new URL('../app/refunds/page.tsx', import.meta.url), 'utf8');
  assert.ok(/storyboard/i.test(refunds), 'the refund cut-off is the storyboard');
  assert.ok(/not refundable|not\s*<\/strong>\s*refundable/i.test(refunds),
    'the booking fee terms must say it is not refundable');
});

test('the follower discount is gone from every place it lived', () => {
  /* It came off on 22 November 2026. It touched the price, the form, the copy
     in both languages, the two API routes and the privacy page, so a partial
     removal is easy — and a half-removed discount is a price the advertisement
     does not quote. */
  const form = readFileSync(new URL('../components/booking/BookingForm.tsx', import.meta.url), 'utf8');
  assert.ok(!/follower/i.test(form), 'the booking form still mentions the follower offer');

  for (const f of ['../app/api/partial/route.ts', '../app/api/booking/route.ts']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!/'follower'/.test(src), `${f} still accepts the follower field`);
  }

  /* The copy, in both languages. A key left in one and not the other is how a
     Tamil page ends up showing a raw key. */
  for (const lang of ['en', 'ta'] as const)
    assert.ok(!('follower_check' in (STRINGS[lang] as Record<string, string>)),
      `${lang} still carries the follower checkbox copy`);

  /* calcPrice must not take the flag back as an argument. */
  const logic = readFileSync(new URL('../lib/logic.ts', import.meta.url), 'utf8');
  assert.ok(!/isFollower/.test(logic), 'calcPrice still takes a follower argument');

  const privacy = readFileSync(new URL('../app/privacy/page.tsx', import.meta.url), 'utf8');
  assert.ok(!/follower discount/i.test(privacy),
    'the privacy policy still says we collect it');

  /* And the server has to be shut too, or a hand-made request still claims
     the ₹200. The SQL that does it must exist for the owner to run. */
  const sql = readFileSync(new URL('../../supabase/11_remove_follower_discount.sql', import.meta.url), 'utf8');
  assert.ok(/update public\.config set value = '0' where key = 'follower_discount'/.test(sql),
    'the config value must be set to zero server-side');
});

test('the Tamil page is really Tamil, and says the same thing', () => {
  /* Half the people who see this page read it in Tamil. Until now the
     delivery sentence came out of the config table as one English string and
     was dropped into both languages, so the Tamil page showed an English
     line in the middle of it. */
  const en = STRINGS.en as Record<string, string>;
  const ta = STRINGS.ta as Record<string, string>;

  const ek = Object.keys(en), tk = Object.keys(ta);
  assert.deepEqual(ek.filter((k) => !(k in ta)), [], 'keys missing from Tamil');
  assert.deepEqual(tk.filter((k) => !(k in en)), [], 'keys only in Tamil');

  /* A placeholder that exists in one language and not the other renders as
     literal {text} to whoever reads that language. */
  const ph = (v: string) => (String(v).match(/\{\w+\}/g) ?? []).sort().join(',');
  for (const k of ek)
    assert.equal(ph(ta[k]), ph(en[k]), `${k}: placeholders differ between languages`);

  /* Every string a reader sees must contain Tamil letters. The exceptions are
     the brand and strings that are nothing but a placeholder. */
  const tamil = /[஀-௿]/;
  const onlyPlaceholders = (v: string) => !/[A-Za-z]{3,}/.test(String(v).replace(/\{\w+\}/g, ''));
  for (const k of ek) {
    if (k === 'brand') continue;
    if (onlyPlaceholders(ta[k])) continue;
    assert.ok(tamil.test(ta[k]), `ta.${k} was never translated: ${JSON.stringify(ta[k])}`);
  }

  /* The calendar went months ago. Three answers still described it, in both
     languages, telling people to pick a date on a screen that is not there. */
  for (const lang of ['en', 'ta'] as const) {
    const all = Object.entries(STRINGS[lang] as Record<string, string>);
    for (const [k, v] of all) {
      assert.ok(!/calendar/i.test(v), `${lang}.${k} still mentions the calendar`);
      assert.ok(!/காலெண்டர்/.test(v), `${lang}.${k} still mentions the calendar`);
    }
  }

  /* And nothing may promise that the page never charges: the ₹99 booking fee
     is paid on it. */
  for (const lang of ['en', 'ta'] as const)
    for (const [k, v] of Object.entries(STRINGS[lang] as Record<string, string>))
      assert.ok(!/nothing is charged on this page/i.test(v),
        `${lang}.${k} promises the page never charges`);
});

test('the thank-you screen is a ticket they can keep', () => {
  /* It is the only thing a customer takes away from the page, and the only
     part of it they will be asked for again is the reference. So the
     reference is the biggest thing on it, and the screen says to screenshot
     it. */
  const form = readFileSync(new URL('../components/booking/BookingForm.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

  assert.ok(/className="ticket"/.test(form), 'the result must be a ticket');
  assert.ok(/className="tref">\{booking\.bookingId\}/.test(form),
    'the booking reference is what the ticket is for');
  assert.ok(/t\('ticket_screenshot'\)/.test(form), 'it must tell them to keep it');

  /* The WhatsApp button is the one action on the screen. */
  const result = form.slice(form.indexOf('<div className="result">'));
  assert.ok(/btn btn-primary/.test(result) && /waHref/.test(result),
    'WhatsApp must be the primary action under the ticket');

  /* The notch is a circle half outside the card; it only reads as a bite
     because the card clips it, and only sits on the edge because the tear is
     a child of the ticket rather than of its padded body. */
  assert.ok(/\.ticket\{[^}]*overflow:hidden/s.test(css), 'the ticket must clip its notches');
  const body = form.slice(form.indexOf('className="tbody"'), form.indexOf('className="tfoot"'));
  assert.ok(!/className="tear"/.test(body.slice(0, body.indexOf('</div>\n\n'))) ||
            form.indexOf('className="tear"') > form.indexOf('</div>\n\n                    {/*'),
    'the tear must not sit inside the padded body');

  /* Both languages, and the Tamil must be Tamil — this screen is where a
     missing translation would be most embarrassing. */
  for (const k of ['ticket_held', 'ticket_received', 'ticket_hint', 'ticket_occasion',
                   'ticket_film', 'ticket_total', 'ticket_paid', 'ticket_due',
                   'ticket_screenshot']) {
    assert.ok((STRINGS.en as Record<string, string>)[k], `en.${k} missing`);
    assert.ok(/[஀-௿]/.test((STRINGS.ta as Record<string, string>)[k]),
      `ta.${k} is not in Tamil`);
  }

  /* The slot is already booked by the time this button is on screen. */
  for (const lang of ['en', 'ta'] as const)
    assert.ok(!/book your slot|ஸ்லாட் புக் செய்/i.test(
      (STRINGS[lang] as Record<string, string>).open_whatsapp),
      `${lang}.open_whatsapp still asks them to book what they just booked`);

  /* A long label must never push the icon onto its own line. */
  assert.ok(/\.btn svg\{[^}]*flex:0 0 auto/.test(css), 'the button icon must not shrink or wrap');
});

test('nothing on the page says payment does not happen on it', () => {
  /* The ₹99 booking fee is taken on this page. Two lines sat one above the
     other saying "₹99 holds your slot" and "No payment now", and the refund
     policy promises we tell people before they pay. A leftover reassurance
     is worse than no reassurance. */
  for (const lang of ['en', 'ta'] as const)
    for (const [k, v] of Object.entries(STRINGS[lang] as Record<string, string>)) {
      assert.ok(!/no payment (now|on this page)/i.test(v), `${lang}.${k}: "${v}"`);
      assert.ok(!/இப்போது பணம் இல்லை/.test(v), `${lang}.${k}: "${v}"`);
    }

  /* And the terms of the fee must be on the step where it is taken. */
  const form = readFileSync(new URL('../components/booking/BookingForm.tsx', import.meta.url), 'utf8');
  assert.ok(/t\('pay_note'/.test(form), 'the fee terms must be shown before paying');
  assert.ok(/not refundable/i.test((STRINGS.en as Record<string, string>).pay_note),
    'and they must say it is not refundable, as the refund page does');
});

test('the contact page carries every way to reach them', () => {
  /* Razorpay checks these against the account. A missing support address is
     one of the commoner reasons an activation comes back. */
  const biz = readFileSync(new URL('../lib/business.ts', import.meta.url), 'utf8');
  const email = biz.match(/email:\s*'([^']+)'/)?.[1] ?? '';
  assert.match(email, /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i, 'business.ts needs a real email address');

  const page = readFileSync(new URL('../app/contact/page.tsx', import.meta.url), 'utf8');
  for (const must of ['B.email', 'phoneDisplay()', 'addressLines()', 'B.hours'])
    assert.ok(page.includes(must), `the contact page does not show ${must}`);
  assert.ok(/mailto:/.test(page), 'the email must be tappable');
});

test('the admin page shows money that arrived, not only money somebody typed', () => {
  /* Every figure in the value row is a status set by hand — which means the
     revenue column is only as true as somebody's memory. What Razorpay
     captured is a fact, and it now sits beside them. */
  const admin = readFileSync(new URL('../app/admin/AdminDashboard.tsx', import.meta.url), 'utf8');

  assert.ok(/action: 'payments'/.test(admin), 'admin must ask for the payments');
  assert.ok(/payData\?\.byBooking/.test(admin), 'each booking must show what came in against it');
  assert.ok(/Fees received/.test(admin), 'the total received must be on the page');

  /* It has to keep working before 14_admin_payments.sql is installed, or
     installing the payments work would take the admin page down. */
  assert.ok(/payData \? \(/.test(admin), 'the payment panels must be guarded');
  assert.ok(/payData\?\.byBooking\?\.\[/.test(admin), 'the per-booking lookup must be guarded');

  const sql = readFileSync(new URL('../../supabase/14_admin_payments.sql', import.meta.url), 'utf8');
  assert.ok(/tts_admin_check\(p_pin\)/.test(sql), 'it must be behind the PIN like every other admin call');
  assert.ok(/status = 'captured'/.test(sql), 'only captured payments count as money');
  assert.ok(/grant execute on function public\.tts_admin_payments/.test(sql), 'it must be callable');
});

test('packages are run from the admin page, and only packages', () => {
  /* The prices already lived in the config table and the booking form already
     hid a length priced at 0 — what was missing was a way to change them
     without opening Supabase. */
  const sql = readFileSync(new URL('../../supabase/15_admin_packages.sql', import.meta.url), 'utf8');

  assert.ok(/tts_admin_check\(p_pin\)/.test(sql), 'both functions must sit behind the PIN');

  /* The narrow bit: it writes twelve keys and nothing else. If it could write
     any key, a bug here could change the WhatsApp number or the admin PIN. */
  assert.ok(/price_' \|\| v_len/.test(sql) && /list_price_' \|\| v_len/.test(sql),
    'it must build the key from a fixed list of lengths');
  assert.ok(!/jsonb_each/.test(sql), 'it must not loop over whatever keys it was handed');
  assert.ok(/\^\[0-9\]\{1,7\}\$/.test(sql), 'values must be whole numbers within a sane range');

  /* And it checks the whole result before writing, so a save that would leave
     nothing to sell changes nothing at all. */
  const check = sql.indexOf('ALL_OFF');
  const write = sql.indexOf('insert into public.config');
  assert.ok(check > 0 && write > check, 'the all-off check must come before any write');

  /* The page caches for 60 seconds; Publish drops that cache so the change is
     visible straight away rather than whenever the window turns over. */
  const route = readFileSync(new URL('../app/api/admin/route.ts', import.meta.url), 'utf8');
  assert.ok(/revalidatePath\('\/'\)/.test(route), 'publishing must drop the cached page');
  assert.ok(/\^\(list_\)\?price_\(30s\|1m\|2m\|3m\|4m\|5m\)\$/.test(route),
    'the route must filter the keys too, not just trust the browser');
});

test('a saving is only shown when it is a saving', () => {
  /* A struck-through price that is not higher than what you charge is an
     invented discount, which is the thing consumer law objects to. */
  const CFG = { price_1m: 4999, list_price_1m: 5999, price_2m: 7999, list_price_2m: 7999 } as never;
  assert.equal(L.listPrice(CFG, '1m'), 5999, 'a higher was-price shows');
  assert.equal(L.listPrice(CFG, '2m'), 0, 'an equal was-price must not show');
  assert.equal(L.listPrice({ price_1m: 4999, list_price_1m: 3000 } as never, '1m'), 0,
    'a lower was-price must not show');

  const form = readFileSync(new URL('../components/booking/BookingForm.tsx', import.meta.url), 'utf8');
  assert.ok(/price\.list > price\.total/.test(form), 'the saving line must be conditional');
  assert.ok(/t\('you_save'/.test(form), 'and it must say the amount in words');
  for (const lang of ['en', 'ta'] as const)
    assert.ok((STRINGS[lang] as Record<string, string>).you_save?.includes('{amount}'),
      `${lang}.you_save must carry the amount`);
});

test('the original-price field says what it wants', () => {
  /* The first thing typed into it was 1000, meaning "₹1,000 off". It is the
     price BEFORE the discount, so 1000 sat below 2999, nothing was struck
     through, and the page gave no clue why. */
  const pkg = readFileSync(new URL('../app/admin/Packages.tsx', import.meta.url), 'utf8');

  assert.ok(!/Was \(struck through\)/.test(pkg), 'the old ambiguous label must be gone');
  assert.ok(/Original price/.test(pkg), 'it must name what it wants');
  assert.ok(/not the discount/.test(pkg), 'and say what it is not');

  /* When the number is below the price it must say so, and offer the sum —
     which is what the person meant. */
  assert.ok(/r\.list > 0 && r\.list <= r\.price/.test(pkg), 'it must notice the mistake');
  assert.ok(/Did you mean/.test(pkg), 'and offer the figure they meant');
  assert.ok(/list: r\.price \+ r\.list/.test(pkg), 'which is the price plus what they typed');
});

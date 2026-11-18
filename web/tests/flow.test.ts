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
  const kf = css.slice(css.indexOf('@keyframes bar-slide'));
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

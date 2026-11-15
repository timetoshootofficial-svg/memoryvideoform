# Timetoshoot — booking landing page

A single-page, mobile-first landing page with a 4-step booking form.
**The Google Sheet is the database and the admin panel.** You change prices,
capacity and copy numbers in the Sheet; the site picks them up within a minute.

```
index.html          the whole page (markup, theme, app logic)
js/config.js        the only file you edit to connect it — API URL, token, pixel, media
js/i18n.js          every label and message, English and Tamil
js/logic.js         pricing, capacity and availability rules (shared with the tests)
apps-script/        the API: Code.gs, the Sheet builder Setup.gs, and DEPLOY.md
sheet/              CSV templates, validation rules and the Dashboard formulas
tests/run.js        83 unit tests, including the double-booking race
assets/             your photo and sample films go here
```

No build step, no npm install, no framework. It is plain HTML, CSS and
JavaScript, so it loads fast and works inside the Instagram in-app browser.

---

## Setup, start to finish

### 1. Build the Sheet and the API

Follow `apps-script/DEPLOY.md`. At the end you will have:

- a Sheet with the tabs `Config`, `Bookings`, `Blocked`, `Funnel`, `Testimonials`, `Dashboard`
- a Web App URL ending in `/exec`
- an `API_TOKEN`
- a trigger that expires stale holds every 15 minutes

### 2. Fill in `js/config.js`

```js
apiUrl:   'https://script.google.com/macros/s/AKfy.../exec',
apiToken: 'your long random token',
pixelId:  '1234567890',          // leave '' to disable the Meta Pixel entirely
```

### 3. Add your media to `assets/`

| File | What it is |
|---|---|
| `keerthika.jpg` | square photo, about 400×400, shown in the hero |
| `sample-1.mp4` … `sample-3.mp4` | vertical sample films, 9:16, keep each under 4 MB |
| `sample-1.jpg` … `sample-3.jpg` | a still from each film, used as the poster frame |

Anything missing just shows a tidy placeholder — nothing breaks.

### 4. Put it online

**Vercel** (no framework needed):

```bash
npm i -g vercel
cd timetoshoot
vercel
```

Accept the defaults; it is detected as a static site. Then `vercel --prod`.

**Netlify:** drag the `timetoshoot` folder onto app.netlify.com/drop.

**Any shared host or S3:** upload the folder as it is. `index.html` must sit at
the root with `js/` and `assets/` beside it.

To test on your own machine first:

```bash
cd timetoshoot && python3 -m http.server 8080
```

Then open http://localhost:8080 . Opening `index.html` by double-clicking also
works, but some browsers block `fetch` on `file://`, so the local server is
safer.

---

## Running the site day to day

### Change a price

`Config` tab → edit `price_30s`, `price_1m`, `price_2m`, `price_3m`, `price_4m`
or `price_5m` → done. The site
refreshes within 60 seconds. Pricing cards, the step 3 stepper, the summary and
the WhatsApp message all read the same value, so they can never disagree.

### Change how much work you take per day

`Config` → `daily_capacity`. This counts **units**, not reservations: a 30s or
1m film uses 1 unit, a 2m film uses 2 (`units_2m`). Whichever runs out first,
units or free time slots, closes the day.

### Block a day, or change one day only

`Blocked` tab:

| Date | CapacityOverride | Note |
|---|---|---|
| `2026-12-25` | *(blank)* | fully blocked, shows as Full |
| `2026-12-31` | `1` | only one film that day |
| `2027-01-05` | `4` | a lighter week, take four |

### Change the rules

| Key | What it does |
|---|---|
| `time_slots` | the times offered each day, comma separated |
| `price_<length>` | the price of that length. **Clear it and that length stops being offered** — no code change needed |
| `units_<length>` | how much of a day that length costs. Keep it at or below `daily_capacity`, or nobody can book that length |
| `min_lead_days` | how soon you will accept a date. `3` means nothing inside the next 3 days is bookable |
| `booking_window_days` | how far ahead the calendar shows |
| `slot_hold_hours` | how long a `Pending` booking keeps its slot before the trigger frees it |
| `most_chosen_package` | which pricing card gets the "Most chosen" badge: `30s`, `1m` or `2m` |
| `follower_discount` | flat rupees off when they tick "I follow @timetoshoot" |
| `delivery_text` | the delivery promise shown in three places |
| `clients_count` | the hero badge, e.g. `200+` |
| `revisions_text` | your revision policy. Leave blank and the FAQ says you will confirm the number on WhatsApp |

### What a reservation is, and what it is not

The calendar exists to show scarcity and capture interest. A visitor picks a
**date**, then a **time slot**, then taps *Reserve my slot*. That writes a row
to `Bookings` immediately with Status `Pending` and a hold, and sends them to
WhatsApp with the date and time already in the message.

**A reservation is not a confirmed booking.** Nothing on the page promises the
customer that date. The page says so in as many words, right under the button:
"Nothing is confirmed until we talk on WhatsApp." You agree the real date in
the conversation and then set the Status yourself.

What that buys you:

- the date and time are in the Sheet before the conversation starts, so you open WhatsApp already knowing what they want
- the slot is held for `slot_hold_hours`, so two people cannot reserve the same time
- if they never message you, the trigger flips the row to `Expired` and the slot comes back, so the scarcity on the calendar stays real rather than silting up

### Time slots

`Config` → `time_slots`, a comma-separated list:

```
11:00 AM, 1:00 PM, 4:00 PM, 7:00 PM
```

Add, remove or rename them freely; the page reads the list as it is written,
so if you want Tamil labels, type Tamil labels. Each slot can be taken once
per day. A date shows as Full when every time is taken **or** when
`daily_capacity` for that day is used up, whichever happens first.

Keep `daily_capacity` at or below the number of time slots. With four times
and `daily_capacity` of 4, every time is bookable. Set it to 2 and the day
closes after two reservations even though two times still look open — which is
a fast way to make the calendar look scarcer than it is. That is your call to
make; the page will not do it behind your back.

### Work a booking### Work a booking

A new reservation lands in `Bookings` as **Pending**, with `HoldUntil` 24 hours
out (`slot_hold_hours`). The customer arrives on your WhatsApp with their
reference, date and time.

| You do | Set Status to | Effect on the calendar |
|---|---|---|
| you agreed a date on WhatsApp | `Confirmed` | that date and time stay taken, permanently |
| they paid | `Paid` | same, and it counts in Dashboard value |
| they went quiet | leave as `Pending` | the trigger sets it to `Expired` after the hold runs out and the slot opens again |
| they cancelled | `Cancelled` | the slot opens again immediately |

If the conversation lands on a **different** date from the one they reserved,
edit `DeliveryDate` and `SlotTime` on that row before setting `Confirmed`. The
calendar follows the Sheet, so the old slot frees itself and the new one fills.

Only edit the `Status` column (and `Notes`). Everything else is written by the
site. The dropdown stops typos — a misspelled status would be read as "not
holding a slot" and could oversell a day.

### Read the Dashboard

- **Funnel** — raw counts: visits, form starts, how far people got, dates picked, times picked, slots reserved.
- **Conversion** — the four ratios. `Calendar → booking` is the one that tells you whether your prices and dates are landing. `Visit → form start` tells you whether the ad matched the page.
- **Bookings by status** — Pending piling up means people reserve and vanish; follow up faster or raise the price.
- **Revenue** — `Paid revenue` is real money. `Booked but unpaid` is what to chase today.
- **By campaign** — reads `UTM_Campaign`, so tag your Meta ads (see below).
- **Upcoming deliveries** — your work queue, soonest first.

`Slot-taken errors` counting up means your real capacity is below demand. Raise
`daily_capacity` or raise prices.

**`Reserved, unconfirmed`** is the money sitting in reservations you have not
spoken to yet. The Dashboard's **TO CHASE** list gives you those rows with the
date, time, reference, name and phone number, oldest first. Work it down daily:
each one expires after `slot_hold_hours`.

### Testimonials

Add a row in `Testimonials` and set `Active` to `Y`. The section appears on the
site. With no active rows it is hidden completely. Only put in words a customer
actually sent you.

---

## Tracking your Meta ads

Tag your ad URLs so the Dashboard can split bookings by campaign:

```
https://yoursite.com/?utm_source=instagram&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&ad_id={{ad.id}}
```

`fbclid` and the `ad_id` are captured automatically and stored on the booking
row, so you can match a sale back to the exact ad.

The Meta Pixel fires `PageView` on load and **`Lead` only after a slot is
actually reserved** — not on a form start. Optimise your campaigns on that
Lead event and Meta will look for people who book, not people who browse.

---

## Tests

```bash
node tests/run.js
```

83 tests covering price calculation, the 2-minute double weight, capacity
overrides, time slots, lead time, the delivery-before-event rule, hold expiry,
Indian mobile validation, the duplicate and rate-limit rules, and a simulation
of two people reserving the same time slot at the same moment — once with the
lock (one wins, one is told the slot went) and once without it (both get in,
which is the bug the lock prevents).

Two of them are wiring checks rather than logic: every string the page asks for
must exist in English **and** Tamil, and every `#id` the script reaches for must
exist in the markup. Those catch the mistakes that only show up at runtime.

---

## Security notes, honestly

**What is protected.** Your Sheet ID and Sheet contents are never in the page.
Apps Script is the only way in, and it validates everything: name, phone,
consent, occasion, film length, date rules, lead time, the event-date rule and
capacity — all re-checked on the server, inside a lock. It strips `= + - @`
from anything written to the Sheet so nobody can inject a formula. A honeypot
field catches basic bots, and one phone number may make at most 3 bookings a
day. The script can only ever append a `Pending` row; it cannot change a status
or read anything else in your Drive.

**What is not.** Because this is a static site with no server of its own, the
`apiToken` in `js/config.js` is visible to anyone who views the page source. It
stops drive-by abuse of your endpoint; it is not a secret. The worst a
determined person can do with it is create junk `Pending` bookings, which the
rate limit caps and the 15-minute trigger clears.

**If you want a real secret**, put a tiny proxy in front: a Next.js API route
on Vercel or a Cloudflare Worker that holds `TTS_API_TOKEN` server-side and
forwards to Apps Script. See `.env.example`. The browser would then call
`/api/booking` instead of Apps Script, and `js/config.js` would hold no token
at all. The API contract does not change, so it is a drop-in upgrade.

**Keep the Sheet private.** It contains customer phone numbers. Share it with
specific people only, never "Anyone with the link". If you later use a
connected Looker Studio or an app, give it a copy of the Dashboard, not the
`Bookings` tab.

---

## Performance

- No framework, no bundler: about 60 KB of HTML, CSS and JS before fonts.
- Sample videos use `preload="none"` and only attach after the file is confirmed to exist, so nothing downloads until it is on screen.
- Availability is cached 60 seconds in the browser (`sessionStorage`) and 60 seconds in Apps Script (`CacheService`), so repeated views cost nothing.
- The calendar shows skeleton tiles while loading, so the page never jumps.
- Funnel events are batched and sent with `sendBeacon`, so tracking never blocks a tap.
- Fonts load with `display=swap`; if they are slow the page still renders in a system font.

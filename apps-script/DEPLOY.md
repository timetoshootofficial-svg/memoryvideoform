# Apps Script deployment

The Sheet is the database. This script is the only door into it. The website
talks to this script; it never touches the Sheet directly.

## 1. Create the script

1. Open your `Timetoshoot Bookings` Google Sheet.
2. `Extensions` → `Apps Script`. A project opens, bound to this Sheet.
3. Delete the sample `myFunction` code.
4. Create two files and paste the contents:
   - `Code.gs` ← `apps-script/Code.gs`
   - `Setup.gs` ← `apps-script/Setup.gs`

   `Code.gs` reads the Bookings tab **by header name**, so you can reorder or
   insert columns in that tab without breaking anything.
5. Save (⌘S).

## 2. Build the tabs

In the function dropdown pick **`setupSheet`** → `Run`.

Google will ask for permission the first time:
`Review permissions` → choose your account → `Advanced` →
`Go to <project name> (unsafe)` → `Allow`.
That warning appears because the script is yours and unverified. It only
touches this Sheet.

Check the Sheet: you should now have `Config`, `Bookings`, `Blocked`,
`Funnel`, `Testimonials`, `Dashboard`.

## 3. Create the API token

Pick **`generateApiToken`** → `Run`, then open `Execution log`
(or `View` → `Logs`). Copy the long token it prints.

It is stored for you in `Project Settings` → `Script properties` as
`API_TOKEN`. You can also set it there by hand:

| Property | Value |
|---|---|
| `API_TOKEN` | the long random string |

Without `API_TOKEN` set, **every request is rejected**. That is deliberate.

## 4. Deploy as a web app

1. `Deploy` → `New deployment`.
2. Click the gear → **Web app**.
3. Fill in:
   - **Description**: `Timetoshoot API v1`
   - **Execute as**: **Me (your@gmail.com)** ← so the script can write to the Sheet
   - **Who has access**: **Anyone** ← so the website can reach it
4. `Deploy`, approve access again if asked.
5. Copy the **Web app URL**. It ends in `/exec`.

"Anyone" means anyone who knows the URL can call it. That is why every request
must carry the correct `API_TOKEN`, and why the script validates and
rate-limits everything it writes. It can only append a `Pending` booking — it
can never read your other Sheets or change a status.

## 5. Point the website at it

Open `js/config.js` and fill in:

```js
apiUrl: 'https://script.google.com/macros/s/AKfy..../exec',
apiToken: 'the token from step 3',
```

## 6. Create the hold-expiry trigger

Stale `Pending` rows must release their slot, otherwise your calendar slowly
fills with people who reserved and never messaged you. This trigger is what
keeps the scarcity on the calendar honest, so do not skip it.

**Easy way:** pick **`createExpiryTrigger`** → `Run`. Done.

**By hand:** in the script editor click the clock icon (`Triggers`) →
`Add trigger`:

| Field | Value |
|---|---|
| Function to run | `expireHolds` |
| Deployment | `Head` |
| Event source | `Time-driven` |
| Type of time based trigger | `Minutes timer` |
| Minute interval | `Every 15 minutes` |

## 7. Test it before you send traffic

Paste this in your browser, with your URL and token:

```
https://script.google.com/macros/s/XXXX/exec?action=ping&token=YOUR_TOKEN
```

Expected: `{"ok":true,"now":"..."}`.

Then try a wrong token — you must get `{"ok":false,"code":"BAD_TOKEN"}`.

Then availability:

```
https://script.google.com/macros/s/XXXX/exec?action=bootstrap&token=YOUR_TOKEN
```

You should see your Config values and a list of dates with `slotsLeft`.

## 8. Whenever you change the script

Edits do **not** go live by themselves for the web app URL.
`Deploy` → `Manage deployments` → pencil icon → `Version: New version` →
`Deploy`. The URL stays the same.

## API reference

All requests carry `token`. `GET` uses query parameters, `POST` a JSON body.

| Action | Method | Parameters | Returns |
|---|---|---|---|
| `ping` | GET | — | `{ok, now}` |
| `bootstrap` | GET | `from`, `to` (optional) | `{ok, config, availability, testimonials}` |
| `getConfig` | GET | — | `{ok, config}` |
| `getAvailability` | GET | `from`, `to` | `{ok, availability:[{date, capacity, used, slotsLeft, times:[{time, taken}], freeTimes}]}` |
| `getTestimonials` | GET | — | `{ok, testimonials}` |
| `createBooking` | POST | `name, phone, consent, occasion, eventDate, filmLength, deliveryDate, slotTime, follower, honeypot, language, utm_*, ad_id, fbclid, referrer` | `{ok, bookingId, total, deliveryDate, slotTime, holdUntil}` |
| `logEvent` | POST | `events:[{sessionId, event, step, language, utm_campaign}]` | `{ok, written}` |

Error codes from `createBooking`:

| Code | Meaning | What the site shows |
|---|---|---|
| `SLOT_TAKEN` | that time slot, or the whole day, went while they were deciding | "That slot was just taken. Please pick another time." + availability reloads |
| `BAD_TIME` | the time is not one of the Config `time_slots` | same as SLOT_TAKEN |
| `LEAD_TIME` | delivery sooner than `min_lead_days` | ask for a later date |
| `AFTER_EVENT` | delivery on or after the event date | ask for an earlier date |
| `OUT_OF_WINDOW` | beyond `booking_window_days` | ask for a closer date |
| `DUPLICATE` | same phone, date and time already reserved | "You already reserved this slot." |
| `RATE_LIMIT` | 3 bookings from one phone today | send them to WhatsApp |
| `BAD_PHONE` / `BAD_NAME` / `NO_CONSENT` / `BAD_OCCASION` / `BAD_LENGTH` / `BAD_DATE` | failed server validation | the matching field error |
| `LOCK_BUSY` | could not get the lock in 10s | "Too many bookings at once. Please try again." |
| `BAD_TOKEN` | wrong or missing token | generic error |

## Why LockService

Google Sheets has no transactions. Two people tapping *Reserve* on the same
time slot in the same second would both read it as free and both write a row.
`createBooking` takes a script lock, re-reads availability **inside** the lock,
and only then appends. One wins, the other gets `SLOT_TAKEN`.

## What a reservation means

A reservation from the site is an **interest record**, not a confirmed booking.
It lands as `Pending` with a hold, and the page tells the customer plainly that
nothing is confirmed until you talk on WhatsApp. You set the real Status by
hand after the conversation. The hold exists so the calendar's scarcity is
real: unanswered reservations expire and the slot comes back.

`tests/run.js` simulates exactly that race, with and without the lock, so you
can see the difference.

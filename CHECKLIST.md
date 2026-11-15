# What you need to fill in

Tick these off and the page is live. Nothing here needs a developer.

## Must do before you send any ad traffic

- [ ] **Confirm the 1 minute price.** `Config` → `price_1m`. Seeded at `4999` as a guess.
- [ ] **Confirm the 2 minute price.** `Config` → `price_2m`. Seeded at `7999` as a guess.
- [ ] **Redeploy Apps Script for the longer films.** 3, 4 and 5 minute films (₹9,999 / ₹13,999 / ₹16,999) need the new `Code.gs` and `Setup.gs` pasted in, then `setupSheet` run and a **New version** deployed. Until then the site offers only 30s, 1m and 2m — it does not break, it just shows fewer choices.
- [ ] **Check `units_*` against `daily_capacity`.** A 4 or 5 minute film is seeded at 3 units. If any `units_*` is larger than `daily_capacity`, that length shows a calendar with every day full and no reason given.
- [ ] **Confirm your delivery promise.** `Config` → `delivery_text`. Seeded as "Ready within 5 days of receiving all details". Change the number to what you can actually keep. It appears in the pricing cards, how-it-works and the FAQ.
- [ ] **Set your time slots.** `Config` → `time_slots`, seeded `11:00 AM, 1:00 PM, 4:00 PM, 7:00 PM`. These are the times shown under the calendar once someone picks a date. Write them exactly as you want customers to read them.
- [ ] **Confirm `daily_capacity`.** Seeded at `4`, matching the four time slots. Lower it and the day closes early even if times look free.
- [ ] **Confirm `min_lead_days`.** Seeded at `3`. Nothing inside the next 3 days can be booked.
- [ ] **Write your revision policy.** `Config` → `revisions_text`. Left blank on purpose — I will not invent a policy. While it is blank the FAQ says you will confirm the number of revision rounds on WhatsApp, which is honest but weaker.
- [ ] **Check the hero number.** `Config` → `clients_count`, seeded `200+`. Your brief said 200+ clients in one place and a "50+ clients" badge in another. I used 200+. Change it if 50+ is the number you can stand behind.
- [ ] **Check `whatsapp_number`.** Seeded `917448326503`.
- [ ] **Review screenshots** → crop your WhatsApp feedback to **1080 × 1350 (4:5)**, save as `assets/review-1.jpg` and so on, then list them in `js/config.js` under `reviewImages`. Blur phone numbers and profile pictures first.
- [ ] **Meta Pixel ID** → `js/config.js` → `pixelId`. Leave it empty and no pixel code loads at all.
- [ ] **Apps Script URL and token** → `js/config.js` → `apiUrl` and `apiToken`. See `apps-script/DEPLOY.md`.

## Should do in the first week

- [ ] **Sample films** → `assets/sample-1.mp4`, `sample-2.mp4`, `sample-3.mp4`, vertical 9:16, each under 4 MB. Add a poster still beside each (`sample-1.jpg` …). Labels are in `js/config.js` → `samples`. Missing files show a clean placeholder, so you can launch without them, but samples are what sell this.
- [ ] **Testimonials** → `Testimonials` tab, set `Active` to `Y`. The section stays hidden while it is empty. Use only words a customer actually sent you — nothing on this page is invented.
- [ ] **Delete the example rows** in the `Blocked` tab (25 and 31 December are only there as examples).
- [ ] **Check the Sheet is private.** Share → specific people only. It holds phone numbers.
- [ ] **Tag your ad links** with `utm_campaign` and `ad_id` so the Dashboard can split bookings by campaign. The exact format is in `README.md`.

## Things I decided for you (change any of them in Config)

| Decision | Value | Why |
|---|---|---|
| `price_1m`, `price_2m` | 4999, 7999 | You left these blank. Priced as a ladder from your 2999, with the 1 min as the obvious middle choice. |
| `daily_capacity` | 4 units | Raised from 2 to match the four seeded time slots. |
| `time_slots` | 11:00 AM, 1:00 PM, 4:00 PM, 7:00 PM | You did not name any times, so these are a placeholder. Change them. |
| Reservation wording | "Nothing is confirmed until we talk on WhatsApp" | You said a reservation must not read as a confirmed booking. |
| `min_lead_days` | 3 | Your bracket said 3. |
| `booking_window_days` | 60 | Your bracket said 60. |
| `slot_hold_hours` | 24 | Your bracket said 24. |
| `most_chosen_package` | `1m` | Your bracket said 1m. |
| Delivery wording | "Ready within 5 days of receiving all details" | You said never say 48 hours. A test checks that "48 hours" appears nowhere on the site. |
| Occasion list | the five you named | "Other" is worded as "Something else" so it feels less like a form. |
| Best delivery days | 1 to 3 days before the event | Close enough to feel ready, with a day of slack. Shown as "Best" in the calendar. |
| Tribute wording | event date optional, gentler copy, a short note | You asked for gentle handling. |
| Language default | English, remembers the visitor's choice | Tamil is one tap away and persists. |

## Open questions I did not answer for you

1. **Revision policy** — how many rounds of changes are included? Needed for `revisions_text`.
2. **Is 200+ or 50+ the client number** you want on the hero?
3. **Do your time slots mean delivery times or call times?** The page just shows the label from Config, so either works — but the customer reads them as "when I get my film", because that is what the step asks. If you mean something else, reword `s4_title` and `time_title` in `js/i18n.js`.
4. **Payment terms** — full payment up front, or an advance? The FAQ currently says you share payment details on WhatsApp, which is true but vague. A clear "50% to confirm" line would filter harder, which is what you asked this page to do.

# Google Sheet template

Two ways to create the Sheet. **The script is the recommended one** — it also
adds dropdowns, colours and the Dashboard formulas, which CSVs cannot carry.

## Option A — run the setup script (recommended)

1. Create a new Google Sheet, name it `Timetoshoot Bookings`.
2. `Extensions` → `Apps Script`.
3. Paste `apps-script/Setup.gs` and `apps-script/Code.gs` as two files.
4. Run `setupSheet()` once and allow the permissions it asks for.
5. Run `generateApiToken()` once. Open `View` → `Logs` and copy the token.

You now have the tabs `Config`, `Bookings`, `Blocked`, `Funnel`,
`Testimonials`, `Dashboard`, with validation and seed values in place.

Re-running `setupSheet()` on an existing Sheet is safe: if your `Bookings` tab
predates the `SlotTime` column, it inserts that column after `DeliveryDate`
instead of rewriting your headers, and tells you it did.

## Option B — import the CSVs

Import each CSV as a **new sheet** and rename the tab to match the file name
(`Config`, `Bookings`, `Blocked`, `Funnel`, `Testimonials`). Then add by hand:

| Tab | What to add |
|---|---|
| Bookings | `Status` column N: Data → Data validation → Dropdown → `Pending, Confirmed, Paid, Cancelled, Expired`, reject invalid |
| Bookings | `FollowerDiscount` column L: dropdown `Y, N` |
| Bookings | `Phone` column D and `SlotTime` column I: Format → Number → Plain text |
| Testimonials | `Active` column D: dropdown `Y, N` |
| Dashboard | run `setupDashboard_()` from the script, or copy the formulas in `Dashboard-formulas.md` |

`Blocked.csv` ships with two example rows. Delete them before going live.

## Validation rules in one place

| Tab | Column | Rule |
|---|---|---|
| Bookings | Status | one of Pending / Confirmed / Paid / Cancelled / Expired |
| Bookings | FollowerDiscount | Y or N |
| Bookings | Phone | plain text, so leading digits are never eaten |
| Blocked | CapacityOverride | blank = day fully blocked, number = that day's capacity |
| Bookings | SlotTime | the time slot, written by the site, must match a value in Config `time_slots` |
| Testimonials | Active | Y or N. Only `Y` rows reach the site |

## Keep this Sheet private

It holds customer phone numbers. Share it with **specific people only** —
never "Anyone with the link". The website reads it through the Apps Script web
app, so visitors never need access to the Sheet itself.

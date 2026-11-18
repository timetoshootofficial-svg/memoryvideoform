# Supabase setup

Three steps, about five minutes. Nothing here needs the command line.

## 1. Run the schema

Supabase → **SQL Editor** → **New query** → paste the whole of
[`schema.sql`](schema.sql) → **Run**.

It creates six tables, seeds the prices, and creates the five functions the
site calls. It is safe to run again later — re-running it updates the
functions and leaves your bookings alone.

You should see `Success. No rows returned`.

## 2. Set the admin PIN

Same SQL Editor, new query:

```sql
select tts_set_admin_pin('choose-a-long-pin');
```

Six characters minimum. It is stored hashed, never in plain text, and it is
never sent to the browser. After twenty wrong tries in fifteen minutes the
dashboard stops answering.

## 3. Check it from the site

Open the site, open the booking form, pick a date. If the calendar fills in,
the connection works. `/admin` with your PIN should then show the dashboard.

---

## How the security works

The browser holds only the **publishable** key, and that key is meant to be
public. What protects your customers is not the key, it is this:

- Every table has row level security **on** with **no policy**, and its grants
  revoked. With the publishable key you can read nothing and write nothing.
- The page cannot touch a table at all. It calls five functions:

  | Function | What it does |
  |---|---|
  | `tts_bootstrap` | prices, rules, which slots are gone |
  | `tts_log_events` | anonymous funnel counters |
  | `tts_create_booking` | validates, then holds one slot |
  | `tts_admin_data` | the dashboard, behind the PIN |
  | `tts_admin_set_status` | changes one booking's status, behind the PIN |

- Those functions run as the owner, so they re-check everything: the phone
  number, the occasion, the lead time, and above all the **price**, which is
  read from the `config` table and never from the request.

So a visitor can ask to hold a slot. A visitor cannot read your customer list,
cannot set their own price, and cannot write a row.

## Two people, one slot

`tts_create_booking` takes an advisory lock on the delivery date, expires any
holds that have run out, re-checks capacity, then inserts. Behind that there is
a unique index on `(delivery_date, slot_time)` for live bookings, so even if
two requests somehow got past the check at the same instant, the database
itself refuses the second one and the page shows "this slot was just taken".

## Holds expire on their own

A reservation is `Pending` with a `hold_until`. Nothing needs to run on a
schedule: expired holds stop counting the moment they pass, and the next
booking attempt flips them to `Expired`.

## Changing a price

Table Editor → `config` → edit the `value`. The site picks it up within a
minute (the page caches for 60 seconds).

- `price_3m` — what you charge
- `list_price_3m` — the struck-through "was" price. **Leave it at 0** unless
  you genuinely charged that before; an invented "was" price breaks Indian
  advertising rules and Meta rejects ads for it.
- clearing `price_4m` to 0 retires that length everywhere

## Where the old Google Sheet data lives

The Sheet is untouched. If you want the five existing bookings in Supabase,
paste them into Table Editor → `bookings` by hand, or ask and they can be
scripted across.

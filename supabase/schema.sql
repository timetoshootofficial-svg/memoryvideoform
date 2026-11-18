-- ============================================================================
-- Timetoshoot — Supabase schema
-- ----------------------------------------------------------------------------
-- Paste this whole file into  Supabase → SQL Editor → New query → Run.
-- It is safe to run more than once.
--
-- SECURITY MODEL
--   The browser holds only the publishable key. Every table below has RLS on
--   and NO policy, so the publishable key can read and write nothing directly.
--   The site talks to the five tts_* functions instead. They are
--   SECURITY DEFINER: they run as the owner, validate everything server side,
--   and return only what the page is allowed to see.
--
--   This is why a visitor cannot read your customers' phone numbers, cannot
--   set their own price, and cannot write a booking straight into the table.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ============================== TABLES ======================================

create table if not exists public.config (
  key   text primary key,
  value text not null default ''
);

create table if not exists public.app_secrets (
  key   text primary key,
  value text not null default ''
);

create table if not exists public.blocked_dates (
  date     date primary key,
  capacity int,                       -- null = fully blocked
  reason   text default ''
);

create sequence if not exists public.booking_seq start 1;

create table if not exists public.bookings (
  id            bigint generated always as identity primary key,
  booking_id    text unique not null,
  created_at    timestamptz not null default now(),
  name          text not null,
  phone         text not null,
  occasion      text not null,
  event_date    date,
  film_length   text not null,
  delivery_date date not null,
  slot_time     text not null,
  units         int  not null default 1,
  price         int  not null default 0,
  follower      boolean not null default false,
  total         int  not null default 0,
  status        text not null default 'Pending'
                check (status in ('Pending','Confirmed','Paid','Cancelled','Expired')),
  hold_until    timestamptz,
  utm_source    text default '',
  utm_medium    text default '',
  utm_campaign  text default '',
  utm_content   text default '',
  ad_id         text default '',
  fbclid        text default '',
  referrer      text default '',
  language      text default '',
  notes         text default ''
);

create index if not exists bookings_delivery_idx on public.bookings (delivery_date);
create index if not exists bookings_phone_idx    on public.bookings (phone);
create index if not exists bookings_created_idx  on public.bookings (created_at desc);

-- One live booking per date + time. This is what actually stops two people
-- taking the same slot: the second INSERT fails at the database, not in code.
create unique index if not exists bookings_slot_unique
  on public.bookings (delivery_date, slot_time)
  where status in ('Pending','Confirmed','Paid');

create table if not exists public.funnel_events (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  session_id   text default '',
  event        text not null,
  step         text default '',
  language     text default '',
  utm_campaign text default ''
);

create index if not exists funnel_created_idx on public.funnel_events (created_at desc);
create index if not exists funnel_event_idx   on public.funnel_events (event);

create table if not exists public.admin_attempts (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  ok         boolean not null
);
create index if not exists admin_attempts_at_idx on public.admin_attempts (at desc);

-- ============================ LOCK IT DOWN ==================================

alter table public.config         enable row level security;
alter table public.app_secrets    enable row level security;
alter table public.blocked_dates  enable row level security;
alter table public.bookings       enable row level security;
alter table public.funnel_events  enable row level security;
alter table public.admin_attempts enable row level security;

-- No policies are created on purpose: with RLS on and no policy, anon and
-- authenticated get nothing. Revoke the table grants as well, so even a
-- future policy mistake cannot expose a table by itself.
revoke all on public.config         from anon, authenticated;
revoke all on public.app_secrets    from anon, authenticated;
revoke all on public.blocked_dates  from anon, authenticated;
revoke all on public.bookings       from anon, authenticated;
revoke all on public.funnel_events  from anon, authenticated;
revoke all on public.admin_attempts from anon, authenticated;
revoke all on sequence public.booking_seq from anon, authenticated;

-- ============================== SEED CONFIG =================================
-- Change a price here, or in Table Editor → config, and the site follows.
-- Set a list_price_* to 0 to hide the struck-through "was" price.

insert into public.config (key, value) values
  ('price_30s','2999'), ('price_1m','4999'), ('price_2m','7999'),
  ('price_3m','9999'), ('price_4m','13999'), ('price_5m','16999'),
  ('list_price_30s','0'), ('list_price_1m','0'), ('list_price_2m','0'),
  ('list_price_3m','0'), ('list_price_4m','0'), ('list_price_5m','0'),
  ('units_30s','1'), ('units_1m','1'), ('units_2m','2'),
  ('units_3m','2'), ('units_4m','3'), ('units_5m','3'),
  ('follower_discount','200'),
  ('daily_capacity','4'),
  ('min_lead_days','3'),
  ('booking_window_days','60'),
  ('slot_hold_hours','24'),
  ('max_per_phone_per_day','3'),
  ('time_slots','11:00 AM, 1:00 PM, 4:00 PM, 7:00 PM'),
  ('whatsapp_number','917448326503'),
  ('whatsapp_link','https://wa.me/message/PB6XEXRKZL7BH1'),
  ('instagram_handle','timetoshoot'),
  ('most_chosen_package','1m'),
  ('delivery_text','Ready within 5 days of receiving all details'),
  ('clients_count','200+'),
  ('revisions_text','')
on conflict (key) do nothing;

-- ============================== HELPERS =====================================

create or replace function public.tts_today() returns date
language sql stable as $fn$
  select (now() at time zone 'Asia/Kolkata')::date;
$fn$;

create or replace function public.tts_cfg(p_key text, p_default text default '')
returns text language sql stable security definer set search_path = public, pg_temp as $fn$
  select coalesce(nullif((select value from public.config where key = p_key), ''), p_default);
$fn$;

create or replace function public.tts_cfg_num(p_key text, p_default numeric default 0)
returns numeric language plpgsql stable security definer set search_path = public, pg_temp as $fn$
declare v text; n numeric;
begin
  select value into v from public.config where key = p_key;
  if v is null or btrim(v) = '' then return p_default; end if;
  begin n := btrim(v)::numeric; exception when others then return p_default; end;
  return n;
end;
$fn$;

-- '+91 98765 43210' | '09876543210' -> '9876543210'; '' when not a valid Indian mobile
create or replace function public.tts_phone(p_in text)
returns text language plpgsql immutable as $fn$
declare d text;
begin
  d := regexp_replace(coalesce(p_in,''), '[^0-9]', '', 'g');
  if length(d) > 11 and left(d,2) = '00'  then d := substr(d,3); end if;
  if length(d) = 13  and left(d,3) = '091' then d := substr(d,4); end if;
  if length(d) = 12  and left(d,2) = '91'  then d := substr(d,3); end if;
  if length(d) = 11  and left(d,1) = '0'   then d := substr(d,2); end if;
  if d ~ '^[6-9][0-9]{9}$' then return d; end if;
  return '';
end;
$fn$;

-- Trims, drops control characters, and defuses a leading =,+,-,@ so a name can
-- never become a formula when the owner exports to a spreadsheet.
create or replace function public.tts_clean(p_in text, p_max int default 100)
returns text language plpgsql immutable as $fn$
declare s text;
begin
  s := regexp_replace(coalesce(p_in,''), '[\u0000-\u001F\u007F]', ' ', 'g');
  s := regexp_replace(s, '^[[:space:]''"]*[=+\-@\t\r]+', '');
  s := btrim(s);
  if p_max is not null and length(s) > p_max then s := left(s, p_max); end if;
  return s;
end;
$fn$;

-- The film lengths this project actually prices, in order.
create or replace function public.tts_live_lengths()
returns text[] language sql stable security definer set search_path = public, pg_temp as $fn$
  select coalesce(array_agg(code order by ord), '{}'::text[])
  from (
    select code, ord from unnest(
      array['30s','1m','2m','3m','4m','5m'],
      array[1,2,3,4,5,6]
    ) as t(code, ord)
  ) l
  where public.tts_cfg_num('price_' || code, 0) > 0;
$fn$;

create or replace function public.tts_time_slots()
returns text[] language plpgsql stable security definer set search_path = public, pg_temp as $fn$
declare raw text; out_arr text[];
begin
  raw := public.tts_cfg('time_slots', '');
  if btrim(raw) = '' then return array['11:00 AM','1:00 PM','4:00 PM','7:00 PM']; end if;
  select array_agg(btrim(x)) into out_arr
    from unnest(string_to_array(raw, ',')) as x
   where btrim(x) <> '';
  if out_arr is null or array_length(out_arr,1) is null then
    return array['11:00 AM','1:00 PM','4:00 PM','7:00 PM'];
  end if;
  return out_arr;
end;
$fn$;

-- Flips Pending rows whose hold has run out to Expired, which frees the slot.
-- Called before every reservation, so no scheduled job is needed.
create or replace function public.tts_expire_holds()
returns int language plpgsql security definer set search_path = public, pg_temp as $fn$
declare n int;
begin
  update public.bookings
     set status = 'Expired'
   where status = 'Pending'
     and hold_until is not null
     and hold_until <= now();
  get diagnostics n = row_count;
  return n;
end;
$fn$;

-- ============================== BOOTSTRAP ===================================
-- One call: prices, rules, and which slots are gone. This is the only read
-- the page makes before it can show the calendar.

create or replace function public.tts_bootstrap(p_from date default null, p_to date default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $fn$
declare
  v_today date := public.tts_today();
  v_from  date;
  v_to    date;
  v_slots text[] := public.tts_time_slots();
  v_cap   int    := public.tts_cfg_num('daily_capacity', 4)::int;
  v_cfg   jsonb;
  v_avail jsonb;
begin
  v_from := coalesce(p_from, v_today);
  v_to   := coalesce(p_to, v_today + public.tts_cfg_num('booking_window_days', 60)::int);
  if v_to > v_from + 400 then v_to := v_from + 400; end if;

  v_cfg := jsonb_build_object(
    'price_30s',           public.tts_cfg_num('price_30s', 0),
    'price_1m',            public.tts_cfg_num('price_1m', 0),
    'price_2m',            public.tts_cfg_num('price_2m', 0),
    'price_3m',            public.tts_cfg_num('price_3m', 0),
    'price_4m',            public.tts_cfg_num('price_4m', 0),
    'price_5m',            public.tts_cfg_num('price_5m', 0),
    'list_price_30s',      public.tts_cfg_num('list_price_30s', 0),
    'list_price_1m',       public.tts_cfg_num('list_price_1m', 0),
    'list_price_2m',       public.tts_cfg_num('list_price_2m', 0),
    'list_price_3m',       public.tts_cfg_num('list_price_3m', 0),
    'list_price_4m',       public.tts_cfg_num('list_price_4m', 0),
    'list_price_5m',       public.tts_cfg_num('list_price_5m', 0),
    'units_30s',           public.tts_cfg_num('units_30s', 1),
    'units_1m',            public.tts_cfg_num('units_1m', 1),
    'units_2m',            public.tts_cfg_num('units_2m', 2),
    'units_3m',            public.tts_cfg_num('units_3m', 2),
    'units_4m',            public.tts_cfg_num('units_4m', 3),
    'units_5m',            public.tts_cfg_num('units_5m', 3),
    'follower_discount',   public.tts_cfg_num('follower_discount', 200),
    'daily_capacity',      v_cap,
    'min_lead_days',       public.tts_cfg_num('min_lead_days', 3),
    'booking_window_days', public.tts_cfg_num('booking_window_days', 60),
    'slot_hold_hours',     public.tts_cfg_num('slot_hold_hours', 24),
    'whatsapp_number',     regexp_replace(public.tts_cfg('whatsapp_number','917448326503'), '[^0-9]', '', 'g'),
    'whatsapp_link',       public.tts_cfg('whatsapp_link',''),
    'instagram_handle',    public.tts_cfg('instagram_handle','timetoshoot'),
    'most_chosen_package', public.tts_cfg('most_chosen_package','1m'),
    'delivery_text',       public.tts_cfg('delivery_text','Ready within 5 days of receiving all details'),
    'clients_count',       public.tts_cfg('clients_count','200+'),
    'revisions_text',      public.tts_cfg('revisions_text',''),
    'time_slots',          to_jsonb(v_slots),
    'film_lengths',        to_jsonb(public.tts_live_lengths()),
    'today',               to_jsonb(v_today)
  );

  with days as (
    select d::date as date from generate_series(v_from, v_to, interval '1 day') d
  ),
  live as (
    select b.delivery_date, b.slot_time, b.units
      from public.bookings b
     where b.delivery_date between v_from and v_to
       and ( b.status in ('Confirmed','Paid')
          or (b.status = 'Pending' and b.hold_until is not null and b.hold_until > now()) )
  ),
  per_day as (
    select days.date,
           coalesce(
             case when bd.date is not null then coalesce(bd.capacity, 0) else v_cap end,
             v_cap) as capacity,
           coalesce((select sum(l.units) from live l where l.delivery_date = days.date), 0)::int as used
      from days
      left join public.blocked_dates bd on bd.date = days.date
  )
  select jsonb_agg(
           jsonb_build_object(
             'date',      pd.date,
             'capacity',  pd.capacity,
             'used',      pd.used,
             'slotsLeft', greatest(0, pd.capacity - pd.used),
             'times',     tm.times,
             'freeTimes', tm.free
           ) order by pd.date)
    into v_avail
    from per_day pd
    cross join lateral (
      select jsonb_agg(jsonb_build_object('time', s.label, 'taken', s.taken) order by s.ord) as times,
             (count(*) filter (where not s.taken))::int as free
        from (
          select t.label, t.ord,
                 exists (select 1 from live l
                          where l.delivery_date = pd.date and l.slot_time = t.label) as taken
            from unnest(v_slots) with ordinality as t(label, ord)
        ) s
    ) tm;

  return jsonb_build_object(
    'ok', true,
    'config', v_cfg,
    'availability', coalesce(v_avail, '[]'::jsonb),
    'testimonials', '[]'::jsonb
  );
end;
$fn$;

-- ============================ FUNNEL EVENTS =================================
-- Anonymous counters only: a random per-visit code, the step reached and the
-- language. No name, no number, nothing that identifies a visitor.

create or replace function public.tts_log_events(p_events jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $fn$
declare n int := 0;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    return jsonb_build_object('ok', true, 'written', 0);
  end if;

  insert into public.funnel_events (session_id, event, step, language, utm_campaign)
  select public.tts_clean(e->>'sessionId', 40),
         public.tts_clean(e->>'event', 40),
         public.tts_clean(e->>'step', 20),
         public.tts_clean(e->>'language', 8),
         public.tts_clean(e->>'utm_campaign', 80)
    from jsonb_array_elements(p_events) with ordinality as a(e, ord)
   where a.ord <= 50
     and public.tts_clean(e->>'event', 40) <> '';
  get diagnostics n = row_count;

  return jsonb_build_object('ok', true, 'written', n);
end;
$fn$;

-- =========================== CREATE BOOKING =================================
-- A reservation here is an INTEREST RECORD, not a confirmed booking: it lands
-- as Pending with a hold and frees itself when the hold runs out. The real
-- date is agreed on WhatsApp and the owner sets the status by hand.
--
-- Everything is validated again here. The browser can ask for a slot; it can
-- never choose its own price, status or hold.

create or replace function public.tts_create_booking(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  v_today      date := public.tts_today();
  v_name       text;
  v_phone      text;
  v_occasion   text;
  v_length     text;
  v_delivery   date;
  v_event      date;
  v_slot       text;
  v_slots      text[] := public.tts_time_slots();
  v_units      int;
  v_price      int;
  v_follower   boolean;
  v_discount   int;
  v_total      int;
  v_cap        int;
  v_used       int;
  v_hold_hours int := public.tts_cfg_num('slot_hold_hours', 24)::int;
  v_hold       timestamptz;
  v_bid        text;
  v_same_day   int;
  v_dup        text;
  v_max_day    int := public.tts_cfg_num('max_per_phone_per_day', 3)::int;
begin
  -- honeypot: a bot filled the hidden field. Answer as if it worked, write nothing.
  if coalesce(btrim(p->>'honeypot'), '') <> '' or coalesce(btrim(p->>'company'), '') <> '' then
    return jsonb_build_object('ok', true, 'bookingId', 'TTS-0000', 'total', 0,
                              'holdUntil', null, 'spam', true);
  end if;

  v_name := public.tts_clean(p->>'name', 80);
  if length(regexp_replace(v_name, '[^A-Za-z஀-௿]', '', 'g')) < 2 then
    return jsonb_build_object('ok', false, 'code', 'BAD_NAME', 'message', 'Please enter your name.');
  end if;

  v_phone := public.tts_phone(p->>'phone');
  if v_phone = '' then
    return jsonb_build_object('ok', false, 'code', 'BAD_PHONE',
                              'message', 'Enter a valid 10-digit Indian mobile number.');
  end if;

  if coalesce(p->>'consent', 'false') not in ('true','TRUE','t') then
    return jsonb_build_object('ok', false, 'code', 'NO_CONSENT',
                              'message', 'Please agree to be contacted on WhatsApp.');
  end if;

  v_occasion := public.tts_clean(p->>'occasion', 40);
  if v_occasion not in ('Anniversary','Birthday','Birth memory gift','Tribute to loved ones','Other') then
    return jsonb_build_object('ok', false, 'code', 'BAD_OCCASION', 'message', 'Please choose an occasion.');
  end if;

  v_length := btrim(coalesce(p->>'filmLength',''));
  if not (v_length = any (public.tts_live_lengths())) then
    return jsonb_build_object('ok', false, 'code', 'BAD_LENGTH', 'message', 'Please choose a film length.');
  end if;

  begin v_delivery := nullif(btrim(coalesce(p->>'deliveryDate','')), '')::date;
  exception when others then v_delivery := null; end;
  if v_delivery is null then
    return jsonb_build_object('ok', false, 'code', 'BAD_DATE', 'message', 'Please pick a date.');
  end if;

  begin v_event := nullif(btrim(coalesce(p->>'eventDate','')), '')::date;
  exception when others then v_event := null; end;

  v_slot := public.tts_clean(p->>'slotTime', 20);
  if not (v_slot = any (v_slots)) then
    return jsonb_build_object('ok', false, 'code', 'BAD_TIME', 'message', 'Please pick a time slot.');
  end if;

  if v_delivery < v_today + public.tts_cfg_num('min_lead_days', 3)::int then
    return jsonb_build_object('ok', false, 'code', 'LEAD_TIME',
      'message', 'We need at least ' || public.tts_cfg_num('min_lead_days',3)::int
                 || ' days. Please pick a later date.');
  end if;
  if v_delivery > v_today + public.tts_cfg_num('booking_window_days', 60)::int then
    return jsonb_build_object('ok', false, 'code', 'OUT_OF_WINDOW',
      'message', 'That date is too far ahead. Please pick a closer date.');
  end if;
  if v_event is not null and v_delivery >= v_event then
    return jsonb_build_object('ok', false, 'code', 'AFTER_EVENT',
      'message', 'Delivery must be before your event date.');
  end if;

  v_units    := greatest(1, public.tts_cfg_num('units_' || v_length, 1)::int);
  v_price    := public.tts_cfg_num('price_' || v_length, 0)::int;
  v_follower := coalesce(p->>'follower','false') in ('true','TRUE','t');
  v_discount := case when v_follower then public.tts_cfg_num('follower_discount', 200)::int else 0 end;
  v_total    := greatest(0, v_price - v_discount);

  -- ---- atomic section: one reservation at a time for this date ----
  perform pg_advisory_xact_lock(hashtextextended('tts_slot_' || v_delivery::text, 0));

  perform public.tts_expire_holds();

  select count(*) into v_same_day
    from public.bookings
   where phone = v_phone
     and (created_at at time zone 'Asia/Kolkata')::date = v_today;
  if v_same_day >= v_max_day then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMIT',
      'message', 'You have reached today''s limit. Please message us on WhatsApp.');
  end if;

  select booking_id into v_dup
    from public.bookings
   where phone = v_phone
     and delivery_date = v_delivery
     and slot_time = v_slot
     and status not in ('Cancelled','Expired')
   limit 1;
  if v_dup is not null then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE', 'existingId', v_dup,
      'message', 'You already reserved this slot. We will message you on WhatsApp.');
  end if;

  select case when bd.date is not null then coalesce(bd.capacity, 0)
              else public.tts_cfg_num('daily_capacity', 4)::int end
    into v_cap
    from (select 1) one
    left join public.blocked_dates bd on bd.date = v_delivery;

  select coalesce(sum(units), 0)::int into v_used
    from public.bookings
   where delivery_date = v_delivery
     and ( status in ('Confirmed','Paid')
        or (status = 'Pending' and hold_until is not null and hold_until > now()) );

  if v_cap - v_used < v_units
     or exists (select 1 from public.bookings
                 where delivery_date = v_delivery and slot_time = v_slot
                   and ( status in ('Confirmed','Paid')
                      or (status = 'Pending' and hold_until is not null and hold_until > now()) ))
  then
    return jsonb_build_object('ok', false, 'code', 'SLOT_TAKEN',
      'message', 'This slot was just taken. Please pick another.');
  end if;

  v_bid  := 'TTS-' || lpad(nextval('public.booking_seq')::text, 4, '0');
  v_hold := now() + make_interval(hours => v_hold_hours);

  begin
    insert into public.bookings (
      booking_id, name, phone, occasion, event_date, film_length, delivery_date,
      slot_time, units, price, follower, total, status, hold_until,
      utm_source, utm_medium, utm_campaign, utm_content, ad_id, fbclid,
      referrer, language, notes)
    values (
      v_bid, v_name, v_phone, v_occasion, v_event, v_length, v_delivery,
      v_slot, v_units, v_price, v_follower, v_total, 'Pending', v_hold,
      public.tts_clean(p->>'utm_source', 60),
      public.tts_clean(p->>'utm_medium', 60),
      public.tts_clean(p->>'utm_campaign', 80),
      public.tts_clean(p->>'utm_content', 80),
      public.tts_clean(p->>'ad_id', 60),
      public.tts_clean(p->>'fbclid', 200),
      public.tts_clean(p->>'referrer', 200),
      public.tts_clean(p->>'language', 8),
      public.tts_clean(p->>'notes', 300));
  exception when unique_violation then
    -- the index caught a reservation that slipped in alongside this one
    return jsonb_build_object('ok', false, 'code', 'SLOT_TAKEN',
      'message', 'This slot was just taken. Please pick another.');
  end;

  return jsonb_build_object(
    'ok', true, 'bookingId', v_bid, 'total', v_total, 'price', v_price,
    'discount', v_discount, 'units', v_units,
    'deliveryDate', v_delivery, 'slotTime', v_slot,
    'holdUntil', v_hold, 'holdHours', v_hold_hours);
end;
$fn$;

-- ================================ ADMIN =====================================
-- The PIN is stored hashed, never in the config table (which the public page
-- reads). Repeated wrong PINs slow down and then stop, so the dashboard can
-- sit on a public URL without being guessable.

create or replace function public.tts_set_admin_pin(p_pin text)
returns text language plpgsql security definer set search_path = public, extensions, pg_temp as $fn$
begin
  if length(btrim(coalesce(p_pin,''))) < 6 then
    return 'REFUSED: use at least 6 characters.';
  end if;
  insert into public.app_secrets (key, value)
  values ('admin_pin_hash', crypt(btrim(p_pin), gen_salt('bf')))
  on conflict (key) do update set value = excluded.value;
  return 'Admin PIN set.';
end;
$fn$;

create or replace function public.tts_admin_check(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $fn$
declare v_hash text; v_fails int; v_ok boolean;
begin
  select value into v_hash from public.app_secrets where key = 'admin_pin_hash';
  if v_hash is null or v_hash = '' then
    return jsonb_build_object('ok', false, 'code', 'PIN_NOT_SET',
      'message', 'No admin PIN is set yet. Run select tts_set_admin_pin(''your-pin'') in the SQL editor.');
  end if;

  select count(*) into v_fails
    from public.admin_attempts
   where not ok and at > now() - interval '15 minutes';

  if v_fails >= 20 then
    return jsonb_build_object('ok', false, 'code', 'LOCKED',
      'message', 'Too many wrong attempts. Try again in 15 minutes.');
  end if;

  v_ok := (v_hash = crypt(btrim(coalesce(p_pin,'')), v_hash));

  insert into public.admin_attempts (ok) values (v_ok);
  delete from public.admin_attempts where at < now() - interval '1 day';

  if not v_ok then
    perform pg_sleep(least(v_fails, 4) * 0.25);
    return jsonb_build_object('ok', false, 'code', 'BAD_PIN', 'message', 'Wrong PIN.');
  end if;
  return jsonb_build_object('ok', true);
end;
$fn$;

create or replace function public.tts_admin_data(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $fn$
declare
  v_gate      jsonb := public.tts_admin_check(p_pin);
  v_today     date  := public.tts_today();
  v_yesterday date  := v_today - 1;
  v_week      date  := v_today - 6;
  v_month     date  := v_today - 29;
  v_stats     jsonb;
  v_bookings  jsonb;
  v_funnel    jsonb;
begin
  if not (v_gate->>'ok')::boolean then return v_gate; end if;

  perform public.tts_expire_holds();

  with b as (
    select *, (created_at at time zone 'Asia/Kolkata')::date as created_date
      from public.bookings
  )
  select jsonb_build_object(
    'total',            count(*),
    'today',            count(*) filter (where created_date = v_today),
    'yesterday',        count(*) filter (where created_date = v_yesterday),
    'last7',            count(*) filter (where created_date >= v_week),
    'last30',           count(*) filter (where created_date >= v_month),
    'pending',          count(*) filter (where status = 'Pending'),
    'confirmed',        count(*) filter (where status = 'Confirmed'),
    'paid',             count(*) filter (where status = 'Paid'),
    'cancelled',        count(*) filter (where status = 'Cancelled'),
    'expired',          count(*) filter (where status = 'Expired'),
    'revenuePaid',      coalesce(sum(total) filter (where status = 'Paid'), 0),
    'revenueConfirmed', coalesce(sum(total) filter (where status = 'Confirmed'), 0),
    'revenuePending',   coalesce(sum(total) filter (where status = 'Pending'), 0),
    'byOccasion', coalesce((select jsonb_object_agg(k, c) from
                   (select occasion k, count(*) c from b where occasion <> '' group by 1) x), '{}'::jsonb),
    'byLength',   coalesce((select jsonb_object_agg(k, c) from
                   (select film_length k, count(*) c from b where film_length <> '' group by 1) x), '{}'::jsonb),
    'byCampaign', coalesce((select jsonb_object_agg(k, c) from
                   (select coalesce(nullif(utm_campaign,''),'(none)') k, count(*) c from b group by 1) x), '{}'::jsonb),
    'bySlot',     coalesce((select jsonb_object_agg(k, c) from
                   (select slot_time k, count(*) c from b where slot_time <> '' group by 1) x), '{}'::jsonb)
  ) into v_stats from b;

  select coalesce(jsonb_agg(b_json order by created_at desc), '[]'::jsonb) into v_bookings
    from (
      select created_at, jsonb_build_object(
        'id',           booking_id,
        'createdAt',    to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS'),
        'createdDate',  (created_at at time zone 'Asia/Kolkata')::date,
        'name',         name,
        'phone',        phone,
        'occasion',     occasion,
        'eventDate',    event_date,
        'filmLength',   film_length,
        'deliveryDate', delivery_date,
        'slotTime',     slot_time,
        'price',        price,
        'follower',     case when follower then 'Y' else 'N' end,
        'total',        total,
        'status',       status,
        'holdUntil',    coalesce(to_char(hold_until at time zone 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS'), ''),
        'holdActive',   (status in ('Confirmed','Paid'))
                        or (status = 'Pending' and hold_until is not null and hold_until > now()),
        'campaign',     coalesce(nullif(utm_campaign,''),'(none)'),
        'source',       utm_source,
        'adId',         ad_id,
        'language',     language,
        'notes',        notes) as b_json
        from public.bookings
       order by created_at desc
       limit 500
    ) t;

  with e as (
    select event, session_id, (created_at at time zone 'Asia/Kolkata')::date as d
      from public.funnel_events
  )
  select jsonb_build_object(
    'all',       coalesce((select jsonb_object_agg(k,c) from (select event k, count(*) c from e group by 1) x), '{}'::jsonb),
    'today',     coalesce((select jsonb_object_agg(k,c) from (select event k, count(*) c from e where d = v_today group by 1) x), '{}'::jsonb),
    'yesterday', coalesce((select jsonb_object_agg(k,c) from (select event k, count(*) c from e where d = v_yesterday group by 1) x), '{}'::jsonb),
    'last7',     coalesce((select jsonb_object_agg(k,c) from (select event k, count(*) c from e where d >= v_week group by 1) x), '{}'::jsonb),
    'sessions',      (select count(distinct session_id) from e where session_id <> ''),
    'sessionsToday', (select count(distinct session_id) from e where session_id <> '' and d = v_today)
  ) into v_funnel;

  return jsonb_build_object(
    'ok', true,
    'now',   to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS'),
    'today', v_today,
    'stats', v_stats,
    'bookings', v_bookings,
    'funnel', v_funnel,
    'config', jsonb_build_object(
      'whatsapp_number', regexp_replace(public.tts_cfg('whatsapp_number','917448326503'), '[^0-9]', '', 'g'),
      'time_slots',      to_jsonb(public.tts_time_slots()),
      'daily_capacity',  public.tts_cfg_num('daily_capacity', 4),
      'slot_hold_hours', public.tts_cfg_num('slot_hold_hours', 24)));
end;
$fn$;

create or replace function public.tts_admin_set_status(p_pin text, p_booking_id text, p_status text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $fn$
declare v_gate jsonb := public.tts_admin_check(p_pin); v_id text; v_status text;
begin
  if not (v_gate->>'ok')::boolean then return v_gate; end if;

  v_status := btrim(coalesce(p_status,''));
  if v_status not in ('Pending','Confirmed','Paid','Cancelled','Expired') then
    return jsonb_build_object('ok', false, 'code', 'BAD_STATUS');
  end if;

  v_id := public.tts_clean(p_booking_id, 20);
  if v_id = '' then return jsonb_build_object('ok', false, 'code', 'BAD_ID'); end if;

  update public.bookings set status = v_status where booking_id = v_id returning booking_id into v_id;
  if v_id is null then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;

  return jsonb_build_object('ok', true, 'bookingId', v_id, 'status', v_status);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'code', 'SLOT_TAKEN',
    'message', 'Another live booking already holds that date and time.');
end;
$fn$;

-- ============================== GRANTS ======================================
-- Postgres grants EXECUTE to PUBLIC on every new function, so take it all back
-- first and then hand out only the five the site is meant to call.

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.tts_bootstrap(date, date)                to anon, authenticated;
grant execute on function public.tts_log_events(jsonb)                    to anon, authenticated;
grant execute on function public.tts_create_booking(jsonb)                to anon, authenticated;
grant execute on function public.tts_admin_data(text)                     to anon, authenticated;
grant execute on function public.tts_admin_set_status(text, text, text)   to anon, authenticated;

-- tts_set_admin_pin, tts_expire_holds and the helpers stay owner-only.

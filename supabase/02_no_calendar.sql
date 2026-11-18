-- ============================================================================
-- Timetoshoot — drop the calendar, keep the lead
-- ----------------------------------------------------------------------------
-- Run this AFTER schema.sql, in Supabase → SQL Editor.
--
-- The calendar asked for a date and a time before anyone had spoken to us,
-- and two thirds of the people who reached it left. So the site no longer
-- reserves a slot: it takes the name, the number, the occasion and the film
-- length, records the lead, and hands the conversation to WhatsApp.
--
-- Nothing is deleted. The slot machinery in schema.sql is still there, and
-- tts_create_booking still works, so the calendar can be switched back on
-- without restoring anything.
-- ============================================================================

-- A lead has no slot yet, so these two stop being required.
alter table public.bookings alter column delivery_date drop not null;
alter table public.bookings alter column slot_time    drop not null;

-- The slot index must ignore leads, or two of them would collide on (null,null).
drop index if exists public.bookings_slot_unique;
create unique index bookings_slot_unique
  on public.bookings (delivery_date, slot_time)
  where status in ('Pending','Confirmed','Paid')
    and delivery_date is not null
    and slot_time is not null;

-- ---------------------------------------------------------------------------
-- The whole booking step, minus the slot.
--
-- Everything the old function validated it still validates, and the price is
-- still read from `config` rather than from the request, so the browser can no
-- more set its own price than it could before.
-- ---------------------------------------------------------------------------
create or replace function public.tts_create_lead(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  v_today    date := public.tts_today();
  v_name     text;
  v_phone    text;
  v_occasion text;
  v_length   text;
  v_event    date;
  v_units    int;
  v_price    int;
  v_follower boolean;
  v_discount int;
  v_total    int;
  v_bid      text;
  v_same_day int;
  v_max_day  int := public.tts_cfg_num('max_per_phone_per_day', 3)::int;
begin
  -- honeypot: a bot filled the hidden field. Answer as if it worked, write nothing.
  if coalesce(btrim(p->>'honeypot'), '') <> '' or coalesce(btrim(p->>'company'), '') <> '' then
    return jsonb_build_object('ok', true, 'bookingId', 'TTS-0000', 'total', 0, 'spam', true);
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

  begin v_event := nullif(btrim(coalesce(p->>'eventDate','')), '')::date;
  exception when others then v_event := null; end;

  v_units    := greatest(1, public.tts_cfg_num('units_' || v_length, 1)::int);
  v_price    := public.tts_cfg_num('price_' || v_length, 0)::int;
  v_follower := coalesce(p->>'follower','false') in ('true','TRUE','t');
  v_discount := case when v_follower then public.tts_cfg_num('follower_discount', 200)::int else 0 end;
  v_total    := greatest(0, v_price - v_discount);

  -- One number cannot flood the sheet, same limit as before.
  select count(*) into v_same_day
    from public.bookings
   where phone = v_phone
     and (created_at at time zone 'Asia/Kolkata')::date = v_today;
  if v_same_day >= v_max_day then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMIT',
      'message', 'You have reached today''s limit. Please message us on WhatsApp.');
  end if;

  v_bid := 'TTS-' || lpad(nextval('public.booking_seq')::text, 4, '0');

  insert into public.bookings (
    booking_id, name, phone, occasion, event_date, film_length,
    delivery_date, slot_time, units, price, follower, total, status, hold_until,
    utm_source, utm_medium, utm_campaign, utm_content, ad_id, fbclid,
    referrer, language, notes)
  values (
    v_bid, v_name, v_phone, v_occasion, v_event, v_length,
    null, null, v_units, v_price, v_follower, v_total, 'Pending', null,
    public.tts_clean(p->>'utm_source', 60),
    public.tts_clean(p->>'utm_medium', 60),
    public.tts_clean(p->>'utm_campaign', 80),
    public.tts_clean(p->>'utm_content', 80),
    public.tts_clean(p->>'ad_id', 60),
    public.tts_clean(p->>'fbclid', 200),
    public.tts_clean(p->>'referrer', 200),
    public.tts_clean(p->>'language', 8),
    public.tts_clean(p->>'notes', 300));

  return jsonb_build_object(
    'ok', true, 'bookingId', v_bid, 'total', v_total, 'price', v_price,
    'discount', v_discount, 'units', v_units);
end;
$fn$;

grant execute on function public.tts_create_lead(jsonb) to anon, authenticated;

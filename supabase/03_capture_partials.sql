-- ============================================================================
-- Timetoshoot — capture the lead at step one, not step three
-- ----------------------------------------------------------------------------
-- Run this AFTER 02_no_calendar.sql, in Supabase → SQL Editor.
--
-- Until now a name and number only reached you if someone pressed Book now at
-- the very end. Everyone who typed their number and then wandered off was
-- invisible, even though they had already told you who they were.
--
-- Now every step writes. One visitor is one row, updated as they go, so you
-- see the number as soon as it is typed and you can see exactly where each
-- person stopped.
-- ============================================================================

create table if not exists public.partials (
  id           bigint generated always as identity primary key,
  session_id   text unique not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  name         text default '',
  phone        text default '',
  occasion     text default '',
  event_date   date,
  film_length  text default '',
  follower     boolean not null default false,
  price        int not null default 0,
  step_reached int  not null default 1,
  completed    boolean not null default false,
  booking_id   text default '',
  language     text default '',
  utm_source   text default '',
  utm_medium   text default '',
  utm_campaign text default '',
  utm_content  text default '',
  ad_id        text default '',
  fbclid       text default '',
  referrer     text default ''
);

create index if not exists partials_updated_idx   on public.partials (updated_at desc);
create index if not exists partials_phone_idx     on public.partials (phone);
create index if not exists partials_completed_idx on public.partials (completed);

alter table public.partials enable row level security;
revoke all on public.partials from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Upsert on the visit, so one person leaves one row however many steps they
-- take. A later step never blanks what an earlier one captured: a field only
-- moves when the new value is non-empty, and step_reached only goes forward.
-- ---------------------------------------------------------------------------
create or replace function public.tts_save_partial(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  v_sid   text := public.tts_clean(p->>'sessionId', 40);
  v_phone text := public.tts_phone(p->>'phone');
  v_step  int  := greatest(1, least(4, coalesce((p->>'step')::int, 1)));
  v_event date;
begin
  if v_sid = '' then return jsonb_build_object('ok', false, 'code', 'NO_SESSION'); end if;

  -- A half-typed number is not a number. Keep the row, leave phone empty.
  begin v_event := nullif(btrim(coalesce(p->>'eventDate','')), '')::date;
  exception when others then v_event := null; end;

  insert into public.partials (
    session_id, name, phone, occasion, event_date, film_length, follower,
    price, step_reached, language,
    utm_source, utm_medium, utm_campaign, utm_content, ad_id, fbclid, referrer)
  values (
    v_sid,
    public.tts_clean(p->>'name', 80),
    v_phone,
    public.tts_clean(p->>'occasion', 40),
    v_event,
    public.tts_clean(p->>'filmLength', 8),
    coalesce(p->>'follower','false') in ('true','TRUE','t'),
    coalesce((p->>'price')::int, 0),
    v_step,
    public.tts_clean(p->>'language', 8),
    public.tts_clean(p->>'utm_source', 60),
    public.tts_clean(p->>'utm_medium', 60),
    public.tts_clean(p->>'utm_campaign', 80),
    public.tts_clean(p->>'utm_content', 80),
    public.tts_clean(p->>'ad_id', 60),
    public.tts_clean(p->>'fbclid', 200),
    public.tts_clean(p->>'referrer', 200))
  on conflict (session_id) do update set
    updated_at   = now(),
    name         = coalesce(nullif(excluded.name, ''),        public.partials.name),
    phone        = coalesce(nullif(excluded.phone, ''),       public.partials.phone),
    occasion     = coalesce(nullif(excluded.occasion, ''),    public.partials.occasion),
    event_date   = coalesce(excluded.event_date,              public.partials.event_date),
    film_length  = coalesce(nullif(excluded.film_length, ''), public.partials.film_length),
    follower     = excluded.follower,
    price        = greatest(excluded.price, public.partials.price),
    step_reached = greatest(excluded.step_reached, public.partials.step_reached),
    language     = coalesce(nullif(excluded.language, ''),    public.partials.language),
    utm_campaign = coalesce(nullif(excluded.utm_campaign, ''), public.partials.utm_campaign),
    ad_id        = coalesce(nullif(excluded.ad_id, ''),       public.partials.ad_id);

  return jsonb_build_object('ok', true);
end;
$fn$;

grant execute on function public.tts_save_partial(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Finishing the form now closes the loop: the visit's row is marked done and
-- carries the reference, so the Leads tab can tell "gave me a number and left"
-- apart from "gave me a number and finished".
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
  v_sid      text := public.tts_clean(p->>'sessionId', 40);
  v_max_day  int := public.tts_cfg_num('max_per_phone_per_day', 3)::int;
begin
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

  if v_sid <> '' then
    update public.partials
       set completed = true, booking_id = v_bid, step_reached = 4, updated_at = now()
     where session_id = v_sid;
  end if;

  return jsonb_build_object(
    'ok', true, 'bookingId', v_bid, 'total', v_total, 'price', v_price,
    'discount', v_discount, 'units', v_units);
end;
$fn$;

grant execute on function public.tts_create_lead(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Everything the Leads tab needs, behind the same PIN as the rest of admin.
--
-- Kept separate from tts_admin_data rather than folded into it: that function
-- is working and the dashboard already depends on its exact shape.
-- ---------------------------------------------------------------------------
create or replace function public.tts_admin_leads(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $fn$
declare
  v_gate   jsonb := public.tts_admin_check(p_pin);
  v_today  date  := public.tts_today();
  v_week   date  := v_today - 6;
  v_month  date  := v_today - 29;
  v_leads  jsonb;
  v_stages jsonb;
begin
  if not (v_gate->>'ok')::boolean then return v_gate; end if;

  select coalesce(jsonb_agg(row_json order by updated_at desc), '[]'::jsonb) into v_leads
    from (
      select updated_at, jsonb_build_object(
        'sessionId',  session_id,
        'firstSeen',  to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI'),
        'lastSeen',   to_char(updated_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI'),
        'day',        (updated_at at time zone 'Asia/Kolkata')::date,
        'name',       name,
        'phone',      phone,
        'occasion',   occasion,
        'eventDate',  event_date,
        'filmLength', film_length,
        'price',      price,
        'follower',   follower,
        'step',       step_reached,
        'completed',  completed,
        'bookingId',  booking_id,
        'language',   language,
        'campaign',   coalesce(nullif(utm_campaign,''), '(none)'),
        'source',     utm_source,
        'adId',       ad_id) as row_json
        from public.partials
       where phone <> '' or name <> ''
       order by updated_at desc
       limit 500
    ) t;

  with p as (
    select *, (updated_at at time zone 'Asia/Kolkata')::date as d from public.partials
  ),
  counts as (
    select
      'all'   as win, count(*) filter (where phone <> '')        as gave_number,
                      count(*) filter (where step_reached >= 2)  as chose_occasion,
                      count(*) filter (where step_reached >= 3)  as saw_price,
                      count(*) filter (where completed)          as finished,
                      coalesce(sum(price) filter (where completed), 0) as value_finished,
                      coalesce(sum(price) filter (where not completed and phone <> ''), 0) as value_left
      from p
    union all
    select 'today', count(*) filter (where phone <> '' and d = v_today),
                    count(*) filter (where step_reached >= 2 and d = v_today),
                    count(*) filter (where step_reached >= 3 and d = v_today),
                    count(*) filter (where completed and d = v_today),
                    coalesce(sum(price) filter (where completed and d = v_today), 0),
                    coalesce(sum(price) filter (where not completed and phone <> '' and d = v_today), 0)
      from p
    union all
    select 'last7', count(*) filter (where phone <> '' and d >= v_week),
                    count(*) filter (where step_reached >= 2 and d >= v_week),
                    count(*) filter (where step_reached >= 3 and d >= v_week),
                    count(*) filter (where completed and d >= v_week),
                    coalesce(sum(price) filter (where completed and d >= v_week), 0),
                    coalesce(sum(price) filter (where not completed and phone <> '' and d >= v_week), 0)
      from p
    union all
    select 'last30', count(*) filter (where phone <> '' and d >= v_month),
                     count(*) filter (where step_reached >= 2 and d >= v_month),
                     count(*) filter (where step_reached >= 3 and d >= v_month),
                     count(*) filter (where completed and d >= v_month),
                     coalesce(sum(price) filter (where completed and d >= v_month), 0),
                     coalesce(sum(price) filter (where not completed and phone <> '' and d >= v_month), 0)
      from p
  )
  select jsonb_object_agg(win, jsonb_build_object(
           'gaveNumber',    gave_number,
           'choseOccasion', chose_occasion,
           'sawPrice',      saw_price,
           'finished',      finished,
           'abandoned',     gave_number - finished,
           'valueFinished', value_finished,
           'valueLeft',     value_left))
    into v_stages from counts;

  return jsonb_build_object('ok', true, 'leads', v_leads, 'stages', v_stages,
                            'today', v_today);
end;
$fn$;

grant execute on function public.tts_admin_leads(text) to anon, authenticated;

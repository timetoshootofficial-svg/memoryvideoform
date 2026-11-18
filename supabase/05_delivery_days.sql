-- ============================================================================
-- Timetoshoot — make the delivery figure in the hero editable
-- ----------------------------------------------------------------------------
-- Optional. The site already shows 5 days from its built-in fallback; running
-- this lets you change it from Table Editor → config like every other number.
-- ============================================================================

insert into public.config (key, value) values ('delivery_days','5')
on conflict (key) do nothing;

-- Add the one key to what the page is told. Everything else is unchanged.
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
    'delivery_days',       public.tts_cfg_num('delivery_days', 5),
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

grant execute on function public.tts_bootstrap(date, date) to anon, authenticated;

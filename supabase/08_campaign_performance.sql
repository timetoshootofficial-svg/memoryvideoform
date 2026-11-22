-- ============================================================================
-- Timetoshoot — which advertisement actually brings money
-- ----------------------------------------------------------------------------
-- Run after 04_fix_stage_counts.sql. It only replaces a function.
--
-- The Meta Pixel tells Meta who booked. It cannot tell you who PAID, because
-- payment happens in a WhatsApp conversation Meta never sees. That number
-- only exists in this database, in the status you set by hand.
--
-- So the Leads view now also returns, per campaign: how many numbers it
-- captured, how many finished the form, how many you marked Paid, and what
-- that was worth. That is the column that decides which advertisement to keep.
-- ============================================================================

create or replace function public.tts_admin_leads(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $fn$
declare
  v_gate      jsonb := public.tts_admin_check(p_pin);
  v_today     date  := public.tts_today();
  v_week      date  := v_today - 6;
  v_month     date  := v_today - 29;
  v_leads     jsonb;
  v_stages    jsonb;
  v_campaigns jsonb;
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
        'price',      case when step_reached >= 3 or completed then price else 0 end,
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
    select *,
           (updated_at at time zone 'Asia/Kolkata')::date as d,
           (phone <> '')                    as did_give_number,
           (occasion <> '')                 as did_choose_occasion,
           (step_reached >= 3 or completed) as did_see_price,
           case when step_reached >= 3 or completed then price else 0 end as real_price
      from public.partials
  ),
  w(win, lo) as (
    values ('all', date '1970-01-01'), ('today', v_today), ('last7', v_week), ('last30', v_month)
  ),
  counts as (
    select w.win,
           count(*) filter (where p.did_give_number)     as gave_number,
           count(*) filter (where p.did_choose_occasion) as chose_occasion,
           count(*) filter (where p.did_see_price)       as saw_price,
           count(*) filter (where p.completed)           as finished,
           coalesce(sum(p.real_price) filter (where p.completed), 0) as value_finished,
           coalesce(sum(p.real_price) filter
             (where not p.completed and p.did_give_number), 0)       as value_left
      from w left join p on p.d >= w.lo
     group by w.win
  )
  select jsonb_object_agg(win, jsonb_build_object(
           'gaveNumber', gave_number, 'choseOccasion', chose_occasion,
           'sawPrice', saw_price, 'finished', finished,
           'abandoned', gave_number - finished,
           'valueFinished', value_finished, 'valueLeft', value_left))
    into v_stages from counts;

  -- ---- which advertisement pays for itself -------------------------------
  with lead_side as (
    select coalesce(nullif(utm_campaign,''), '(none)') as campaign,
           count(*) filter (where phone <> '')  as numbers,
           count(*) filter (where completed)    as finished
      from public.partials
     group by 1
  ),
  booking_side as (
    select coalesce(nullif(utm_campaign,''), '(none)') as campaign,
           count(*)                                           as bookings,
           count(*) filter (where status = 'Paid')            as paid,
           count(*) filter (where status = 'Confirmed')       as confirmed,
           coalesce(sum(total) filter (where status = 'Paid'), 0)      as revenue,
           coalesce(sum(total) filter (where status = 'Confirmed'), 0) as pipeline
      from public.bookings
     group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'campaign',  c,
           'numbers',   coalesce(l.numbers, 0),
           'finished',  coalesce(l.finished, 0),
           'bookings',  coalesce(b.bookings, 0),
           'confirmed', coalesce(b.confirmed, 0),
           'paid',      coalesce(b.paid, 0),
           'revenue',   coalesce(b.revenue, 0),
           'pipeline',  coalesce(b.pipeline, 0)
         ) order by coalesce(b.revenue,0) desc, coalesce(l.numbers,0) desc), '[]'::jsonb)
    into v_campaigns
    from (select campaign from lead_side union select campaign from booking_side) u(c)
    left join lead_side l    on l.campaign = u.c
    left join booking_side b on b.campaign = u.c;

  return jsonb_build_object('ok', true, 'leads', v_leads, 'stages', v_stages,
                            'campaigns', v_campaigns, 'today', v_today);
end;
$fn$;

grant execute on function public.tts_admin_leads(text) to anon, authenticated;

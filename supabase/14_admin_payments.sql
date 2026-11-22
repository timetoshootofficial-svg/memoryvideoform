-- ============================================================================
-- Timetoshoot — show the money that actually arrived
-- ----------------------------------------------------------------------------
-- Run after 12_payments.sql. It adds one function and replaces nothing.
--
-- A ₹99 hold moves a booking to Confirmed, and until now that is all the admin
-- page could see: a word. It could not say whether anything was received, how
-- much, or when — the only numbers it had were the ones typed in by hand.
--
-- This returns, per booking, what has genuinely been captured, straight from
-- the payments table. Nobody has to remember to tick anything for it to be
-- right.
-- ============================================================================

create or replace function public.tts_admin_payments(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $fn$
declare
  v_gate   jsonb := public.tts_admin_check(p_pin);
  v_today  date  := public.tts_today();
  v_byb    jsonb;
  v_recent jsonb;
begin
  if not (v_gate->>'ok')::boolean then return v_gate; end if;

  -- booking_id -> paise captured against it
  select coalesce(jsonb_object_agg(booking_id, paid), '{}'::jsonb) into v_byb
    from (
      select booking_id, sum(amount_paise)::bigint as paid
        from public.payments
       where status = 'captured' and coalesce(booking_id,'') <> ''
       group by booking_id
    ) t;

  -- the last 50, so a payment with no booking attached is still visible
  select coalesce(jsonb_agg(j order by created_at desc), '[]'::jsonb) into v_recent
    from (
      select created_at, jsonb_build_object(
        'paymentId', razorpay_payment_id,
        'bookingId', booking_id,
        'kind',      kind,
        'paise',     amount_paise,
        'method',    method,
        'at', to_char(created_at at time zone 'Asia/Kolkata', 'DD Mon HH24:MI')) as j
        from public.payments
       where status = 'captured'
       order by created_at desc
       limit 50
    ) t;

  return jsonb_build_object(
    'ok', true,
    'byBooking', v_byb,
    'recent',    v_recent,
    'totals', jsonb_build_object(
      'feesPaise', coalesce((select sum(amount_paise) from public.payments
                              where status = 'captured'), 0),
      'count',     coalesce((select count(*) from public.payments
                              where status = 'captured'), 0),
      'todayPaise', coalesce((select sum(amount_paise) from public.payments
                               where status = 'captured'
                                 and (created_at at time zone 'Asia/Kolkata')::date = v_today), 0)
    ));
end; $fn$;

grant execute on function public.tts_admin_payments(text) to anon, authenticated;

select 'tts_admin_payments installed' as done;

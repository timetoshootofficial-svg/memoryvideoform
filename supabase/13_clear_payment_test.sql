-- ============================================================================
-- Timetoshoot — remove the one test booking made while checking Razorpay
-- ----------------------------------------------------------------------------
-- On 22 Nov 2026 a real ₹99 test payment was carried end to end against the
-- Razorpay TEST keys. No real money moved, but it left a genuine booking and
-- a genuine payment row in this database.
--
--   name  ZZ PAYMENT TEST
--   phone 9000000001
--   ref   TTS-0012
--
-- Run in Supabase -> SQL Editor. Nothing else is touched.
-- ============================================================================

-- 1. Look first.
select 'booking' as kind, booking_id as ref, name, phone, total, status
  from public.bookings where phone = '9000000001'
union all
select 'payment', razorpay_payment_id, kind, status, amount_paise, booking_id
  from public.payments where booking_id in
       (select booking_id from public.bookings where phone = '9000000001');

-- 2. Remove it. Payments first: they point at the booking.
delete from public.payments
 where booking_id in (select booking_id from public.bookings where phone = '9000000001');

delete from public.funnel_events
 where session_id in (select session_id from public.partials
                       where phone = '9000000001' and session_id <> '');

delete from public.partials where phone = '9000000001';
delete from public.bookings where phone = '9000000001';

-- 3. Confirm.
select 'AFTER' as when, 'bookings'  as table_name, count(*) from public.bookings
union all select 'AFTER', 'payments', count(*) from public.payments
union all select 'AFTER', 'leads (partials)', count(*) from public.partials;

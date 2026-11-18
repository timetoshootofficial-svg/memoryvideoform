-- Removes the rows created while verifying the migration (names start "ZZ ")
-- and the probe funnel event, then puts the booking counter back to 1 so your
-- first real booking is TTS-0001.
--
-- Run this ONCE, before the site goes live on Supabase.

delete from public.bookings where name like 'ZZ %';
delete from public.funnel_events where session_id = 'probe';
delete from public.admin_attempts;

select setval('public.booking_seq', 1, false);

select count(*) as bookings_left from public.bookings;

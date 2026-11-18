-- Removes everything created while building and testing, across both tables,
-- and puts the booking counter back to 1 so your first real customer is
-- TTS-0001.
--
-- Run this ONCE, in Supabase → SQL Editor, before the site goes live.
-- It touches only rows made by testing: every one of them was given a name
-- beginning "ZZ ", or a session id used only by the probes.

-- what is about to go, so you can see it first
select 'bookings' as table, count(*) from public.bookings where name like 'ZZ %'
union all
select 'partials', count(*) from public.partials
 where name like 'ZZ %' or session_id in ('probe','audit','audit-probe','audit-final','final-audit','audit2')
union all
select 'funnel_events', count(*) from public.funnel_events
 where session_id in ('probe','audit','final','audit2');

delete from public.bookings where name like 'ZZ %';

delete from public.partials
 where name like 'ZZ %'
    or session_id in ('probe','audit','audit-probe','audit-final','final-audit','audit2');

delete from public.funnel_events
 where session_id in ('probe','audit','final','audit2');

delete from public.admin_attempts;

select setval('public.booking_seq', 1, false);

-- what is left: this should be your real customers only
select 'bookings left'  as what, count(*) from public.bookings
union all
select 'leads left', count(*) from public.partials;

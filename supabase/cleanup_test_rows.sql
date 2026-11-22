-- ============================================================================
-- Timetoshoot — clear everything that testing created
-- ----------------------------------------------------------------------------
--
--   ####  DO NOT RUN THIS ONCE REAL CUSTOMERS EXIST.  ####
--
--   The deletes below carry no WHERE clause. They empty the tables. Real
--   bookings, real leads and every visit recorded in the drop-off chart go
--   with the test rows, and none of it can be brought back.
--
--   To remove only your own test rows, use 10_remove_test_rows_only.sql,
--   which deletes by phone number and leaves everything else standing.
--
-- ----------------------------------------------------------------------------
-- Paste the whole file into Supabase → SQL Editor → Run.
--
-- The site went live only minutes ago, so every row in these three tables was
-- made while building and testing it. This empties all three and sets the
-- counter back, so your first real customer is TTS-0001 and the Leads tab
-- opens clean.
--
-- It does NOT touch `config` (your prices) or `app_secrets` (your admin PIN).
-- ============================================================================

-- 1. what is there right now
select 'BEFORE' as when, 'bookings' as table_name, count(*) from public.bookings
union all select 'BEFORE', 'leads (partials)', count(*) from public.partials
union all select 'BEFORE', 'funnel events',    count(*) from public.funnel_events;

-- 2. clear them
delete from public.bookings;
delete from public.partials;
delete from public.funnel_events;
delete from public.admin_attempts;

-- 3. the next booking reference becomes TTS-0001
select setval('public.booking_seq', 1, false);

-- 4. confirm
select 'AFTER' as when, 'bookings' as table_name, count(*) from public.bookings
union all select 'AFTER', 'leads (partials)', count(*) from public.partials
union all select 'AFTER', 'funnel events',    count(*) from public.funnel_events;

-- 5. your prices and PIN are untouched
select 'kept' as what, key, value from public.config
 where key in ('clients_count','price_1m','price_3m','whatsapp_number')
 order by key;

-- ============================================================================
-- Timetoshoot — remove ONLY your own test rows
-- ----------------------------------------------------------------------------
-- Use this instead of cleanup_test_rows.sql once real customers exist.
--
--   cleanup_test_rows.sql  = empties the tables completely. Everything goes,
--                            including the last five days of real traffic.
--   this file              = removes only the phone numbers you name.
--
-- Run the three steps ONE AT A TIME. In the Supabase SQL editor you can
-- highlight a block and press Run to execute just that block.
--
-- Nothing here touches `config` (your prices) or `app_secrets` (your PIN),
-- and the booking counter is deliberately NOT reset — resetting it while real
-- bookings exist would hand the next customer a reference somebody already has.
-- ============================================================================


-- ====================  STEP 1 — look before you delete  =====================
-- Read-only. Nothing is removed. Find your test rows and note their phones.

-- 1a. Bookings, newest first.
select booking_id, created_at::date as day,
       to_char(created_at at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') as made,
       name, phone, occasion, film_length, total, status,
       coalesce(nullif(utm_campaign,''),'(none)') as campaign
  from public.bookings
 order by created_at desc;

-- 1b. Leads, newest first. step_reached 1-3, completed = pressed Book now.
select to_char(updated_at at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') as seen,
       name, phone, occasion, film_length, price, step_reached, completed,
       coalesce(nullif(utm_campaign,''),'(none)') as campaign
  from public.partials
 order by updated_at desc;

-- 1c. How many rows each day holds, so you can see where testing stopped
--     and real traffic began.
select (created_at at time zone 'Asia/Kolkata')::date as day,
       count(*) filter (where phone <> '')  as gave_a_number,
       count(*) filter (where completed)    as pressed_book_now
  from public.partials
 group by 1 order by 1 desc;


-- ===============  STEP 2 — name the test numbers, then preview  =============
-- Put YOUR OWN test numbers between the brackets, one per line, with a comma
-- after each except the last. Any format works: 9876543210, +91 98765 43210,
-- 09876543210 — they are normalised the same way the form normalises them.
--
-- Run STEP 2 and STEP 3 together in the same Run: the list is temporary and
-- disappears when the editor's session ends.

-- pg_temp. is spelled out so this can never drop a real table of that name.
drop table if exists pg_temp.tts_test_phones;
create temporary table tts_test_phones as
select public.tts_phone(p) as phone
  from (values
          ('9876543210'),
          ('9000011122')
       ) as v(p)
 where public.tts_phone(p) <> '';

-- What would go. Check this list carefully before running STEP 3.
select 'booking' as kind, booking_id as ref, name, phone,
       to_char(created_at at time zone 'Asia/Kolkata','DD Mon HH24:MI') as made
  from public.bookings where phone in (select phone from tts_test_phones)
union all
select 'lead', session_id, name, phone,
       to_char(updated_at at time zone 'Asia/Kolkata','DD Mon HH24:MI')
  from public.partials where phone in (select phone from tts_test_phones)
 order by 1, 5;


-- ======================  STEP 3 — delete just those  ========================
-- Only run this once STEP 2's list is exactly what you want gone.

-- The visits those test sessions made, so the drop-off chart is not inflated.
-- Sessions that never typed a number are left alone: they are real visitors.
delete from public.funnel_events
 where session_id in (
   select session_id from public.partials
    where phone in (select phone from tts_test_phones) and session_id <> ''
 );

delete from public.partials where phone in (select phone from tts_test_phones);
delete from public.bookings where phone in (select phone from tts_test_phones);

-- What is left.
select 'AFTER' as when, 'bookings' as table_name, count(*) from public.bookings
union all select 'AFTER', 'leads (partials)', count(*) from public.partials
union all select 'AFTER', 'funnel events',    count(*) from public.funnel_events;

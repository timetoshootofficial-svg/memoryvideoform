-- ============================================================================
-- Timetoshoot — close the follower discount on the server as well
-- ----------------------------------------------------------------------------
-- The page no longer offers ₹200 off for following on Instagram, and no longer
-- sends the flag. But `tts_create_lead` still reads it:
--
--     v_follower := coalesce(p->>'follower','false') in ('true','TRUE','t');
--     v_discount := case when v_follower then tts_cfg_num('follower_discount',200) ...
--
-- so a request built by hand could still claim ₹200 off a booking. While the
-- page offered it that was the intended behaviour. Now it is a hole.
--
-- Setting the amount to 0 shuts it at the only place that decides a price. The
-- functions are left alone: nothing calls them with the flag any more, and the
-- column keeps the record of the bookings that genuinely had the discount.
--
-- Paste into Supabase -> SQL Editor -> Run. Safe to run twice.
-- ============================================================================

select 'BEFORE' as when, key, value from public.config where key = 'follower_discount';

update public.config set value = '0' where key = 'follower_discount';

select 'AFTER' as when, key, value from public.config where key = 'follower_discount';

-- Bookings that really were given the discount. These stay as they are: it is
-- what the customer was actually charged.
select count(*) as bookings_that_had_the_discount
  from public.bookings where follower;

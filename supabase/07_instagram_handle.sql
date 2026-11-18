-- The Instagram account the footer links to. Only the handle is stored: the
-- tracking parameters on a shared profile link (obrf, utm_source=qr) identify
-- the share, not the account, and do not belong in a link everyone follows.
update public.config set value = 'timetoshoot_' where key = 'instagram_handle';
select key, value from public.config where key = 'instagram_handle';

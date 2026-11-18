-- The figure in the hero. Change it here, or in Table Editor → config.
-- Only claim what you have actually done: an inflated number is what Meta
-- rejects an advertisement for, and what a customer remembers if they find out.
update public.config set value = '500+' where key = 'clients_count';
select key, value from public.config where key = 'clients_count';

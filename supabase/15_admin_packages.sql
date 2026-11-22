-- ============================================================================
-- Timetoshoot — let the owner run the packages from the admin page
-- ----------------------------------------------------------------------------
-- Run in Supabase → SQL Editor. Safe to run twice.
--
-- The prices already live in the config table; the page already hides a length
-- whose price is 0, and already strikes through a list price higher than the
-- real one. What was missing is a way to change those values without opening
-- Supabase.
--
-- This is the narrowest function that does it: it writes ONLY the twelve
-- package keys, only whole numbers, and silently ignores everything else. A
-- bug here cannot rewrite the WhatsApp number or the admin PIN.
--
-- It also checks the WHOLE result before writing anything, so a save that
-- would leave the page with nothing to sell changes nothing at all.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Reading them back. The admin payload carries the WhatsApp number and the
-- slots but never the prices, so the Packages tab had nothing to show.
-- ---------------------------------------------------------------------------
create or replace function public.tts_admin_packages(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $fn$
declare
  v_gate jsonb := public.tts_admin_check(p_pin);
  v_lens text[] := array['30s','1m','2m','3m','4m','5m'];
  v_len  text;
  v_out  jsonb := '[]'::jsonb;
begin
  if not (v_gate->>'ok')::boolean then return v_gate; end if;

  foreach v_len in array v_lens loop
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'code',  v_len,
      'price', public.tts_cfg_num('price_' || v_len, 0)::int,
      'list',  public.tts_cfg_num('list_price_' || v_len, 0)::int));
  end loop;

  return jsonb_build_object('ok', true, 'packages', v_out);
end; $fn$;

grant execute on function public.tts_admin_packages(text) to anon, authenticated;

create or replace function public.tts_admin_set_packages(p_pin text, p jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $fn$
declare
  v_gate jsonb := public.tts_admin_check(p_pin);
  v_lens text[] := array['30s','1m','2m','3m','4m','5m'];
  v_len  text;
  v_new  numeric;
  v_live int := 0;
  v_done int := 0;
begin
  if not (v_gate->>'ok')::boolean then return v_gate; end if;

  -- 1. What would the six prices be after this save?
  foreach v_len in array v_lens loop
    v_new := case
      when p ? ('price_' || v_len) and (p->>('price_' || v_len)) ~ '^[0-9]+$'
        then (p->>('price_' || v_len))::numeric
      else public.tts_cfg_num('price_' || v_len, 0)
    end;
    if v_new > 0 then v_live := v_live + 1; end if;
  end loop;

  if v_live = 0 then
    return jsonb_build_object('ok', false, 'code', 'ALL_OFF',
      'message', 'At least one package has to stay on, or the page has nothing to sell.');
  end if;

  -- 2. Only now write, and only the keys that belong to a package.
  foreach v_len in array v_lens loop
    if p ? ('price_' || v_len) and (p->>('price_' || v_len)) ~ '^[0-9]{1,7}$' then
      insert into public.config (key, value)
      values ('price_' || v_len, (p->>('price_' || v_len))::bigint::text)
      on conflict (key) do update set value = excluded.value;
      v_done := v_done + 1;
    end if;

    if p ? ('list_price_' || v_len) and (p->>('list_price_' || v_len)) ~ '^[0-9]{1,7}$' then
      insert into public.config (key, value)
      values ('list_price_' || v_len, (p->>('list_price_' || v_len))::bigint::text)
      on conflict (key) do update set value = excluded.value;
      v_done := v_done + 1;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'written', v_done, 'live', v_live);
end; $fn$;

grant execute on function public.tts_admin_set_packages(text, jsonb) to anon, authenticated;

select 'tts_admin_set_packages installed' as done;

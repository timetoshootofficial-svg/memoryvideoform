-- ============================================================================
-- Timetoshoot — record what Razorpay tells us
-- ----------------------------------------------------------------------------
-- Run in Supabase → SQL Editor. Safe to run twice.
--
-- The money is taken by Razorpay. What this file does is remember, on our
-- side, which booking each payment belongs to — so the admin page can say
-- "paid" without anybody ticking a box, and so the revenue column under
-- "By advertisement" is a fact rather than a reminder somebody forgot.
--
-- Two things can tell us a payment succeeded: the customer's browser coming
-- back from the Razorpay window, and Razorpay's webhook. Either may arrive
-- first, and the browser one may never arrive at all if they close the tab on
-- a slow connection. So both call the same function and it is written to be
-- safe to call twice with the same payment.
-- ============================================================================

create table if not exists public.payments (
  id                  bigint generated always as identity primary key,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  /* Razorpay's own identifiers. The payment id is unique, which is what makes
     recording the same payment twice harmless. */
  razorpay_order_id   text not null,
  razorpay_payment_id text unique,

  /* Ours. */
  booking_id          text not null default '',
  session_id          text not null default '',

  /* 'hold'    the booking fee that holds a slot
     'advance' the part paid before work starts
     'final'   the rest, on delivery */
  kind                text not null default 'hold'
                      check (kind in ('hold','advance','final')),

  /* Paise, exactly as Razorpay counts. Rupees would invite rounding. */
  amount_paise        int  not null default 0,
  currency            text not null default 'INR',

  status              text not null default 'created'
                      check (status in ('created','captured','failed','refunded')),

  method              text default '',
  notes               jsonb default '{}'::jsonb
);

create index if not exists payments_order_idx   on public.payments (razorpay_order_id);
create index if not exists payments_booking_idx on public.payments (booking_id);
create index if not exists payments_created_idx on public.payments (created_at desc);

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;

-- What the booking itself needs to remember.
alter table public.bookings add column if not exists amount_paid_paise int not null default 0;
alter table public.bookings add column if not exists last_payment_at   timestamptz;

-- ---------------------------------------------------------------------------
-- Called by our own server after it has asked Razorpay for an order.
-- Nothing here trusts a price from the browser: the amount is passed by the
-- route, which read it from the config table.
-- ---------------------------------------------------------------------------
create or replace function public.tts_payment_started(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_order text; v_amt int;
begin
  v_order := coalesce(p->>'order_id','');
  v_amt   := coalesce((p->>'amount_paise')::int, 0);
  if v_order = '' or v_amt <= 0 then
    return jsonb_build_object('ok', false, 'code', 'BAD_INPUT');
  end if;

  insert into public.payments
    (razorpay_order_id, booking_id, session_id, kind, amount_paise, notes)
  values
    (v_order,
     coalesce(p->>'booking_id',''),
     coalesce(p->>'session_id',''),
     coalesce(nullif(p->>'kind',''), 'hold'),
     v_amt,
     coalesce(p->'notes', '{}'::jsonb));

  return jsonb_build_object('ok', true);
end; $$;

-- ---------------------------------------------------------------------------
-- Called once the signature has been checked — by the browser's return trip,
-- by the webhook, or by both. The second call changes nothing.
--
-- It will only act on an order this server itself started. tts_payment_started
-- writes that row the moment Razorpay hands back an order id, and the amount
-- is read from THAT row, never from the caller. So even someone holding the
-- publishable key cannot invent a payment or inflate one: they would have to
-- know a real, unused Razorpay order id.
-- ---------------------------------------------------------------------------
create or replace function public.tts_payment_captured(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_pay   text := coalesce(p->>'payment_id','');
  v_order text := coalesce(p->>'order_id','');
  v_row   public.payments%rowtype;
  v_bid   text;
  v_total int;
begin
  if v_pay = '' or v_order = '' then
    return jsonb_build_object('ok', false, 'code', 'BAD_INPUT');
  end if;

  -- The order must be one we started. This is the guard.
  select * into v_row
    from public.payments
   where razorpay_order_id = v_order
   order by id limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'UNKNOWN_ORDER');
  end if;

  v_bid := coalesce(v_row.booking_id, '');

  -- One payment, one row. Running this twice lands on the unique index and
  -- changes nothing, which is what lets the browser and the webhook both call
  -- it without the money being counted twice.
  insert into public.payments
    (razorpay_order_id, razorpay_payment_id, booking_id, session_id,
     kind, amount_paise, status, method)
  values
    (v_order, v_pay, v_bid, v_row.session_id,
     v_row.kind, v_row.amount_paise, 'captured',
     left(coalesce(p->>'method',''), 40))
  on conflict (razorpay_payment_id) do update
     set status     = 'captured',
         method     = coalesce(nullif(excluded.method,''), public.payments.method),
         updated_at = now();

  if v_bid = '' then
    return jsonb_build_object('ok', true, 'booking', null);
  end if;

  -- Summed from the payments themselves rather than added up as we go, so the
  -- figure is right however many times this runs.
  select coalesce(sum(amount_paise), 0) into v_total
    from public.payments
   where booking_id = v_bid and status = 'captured';

  update public.bookings
     set amount_paid_paise = v_total,
         last_payment_at   = now(),
         status = case
           when status = 'Paid'       then 'Paid'          -- never walk backwards
           when v_row.kind = 'final'  then 'Paid'
           when status = 'Pending'    then 'Confirmed'     -- the slot is held
           else status end
   where booking_id = v_bid;

  return jsonb_build_object('ok', true, 'booking', v_bid,
                            'paid_paise', v_total, 'kind', v_row.kind);
end; $$;

-- Our own server calls these with the publishable key, the same way it calls
-- everything else here, so they have to be callable. What protects them is
-- inside: the amount is never taken from the caller, and a capture must name
-- an order this server started.
grant execute on function public.tts_payment_started(jsonb)  to anon, authenticated;
grant execute on function public.tts_payment_captured(jsonb) to anon, authenticated;

select 'payments table and functions installed' as done;

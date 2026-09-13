-- Run this in the Supabase SQL Editor after 009_history_integrity.sql.
--
-- Three additions, all aimed at the gap a plain "remind me on the 5th"
-- doesn't close:
--
-- 1. amount_is_variable - the utility problem. Luz, agua and gas change
--    every month, so the stored amount is an estimate, not the truth. The
--    flag lets the app ask what actually arrived when you mark it paid, so
--    "Gastado este mes" stops being fiction for exactly the bills where it
--    matters most.
--
-- 2. notes - the account/reference number you have to look up every single
--    month, kept next to the bill instead of in your head.
--
-- 3. payment_url - where you actually go to pay it. Surfaced as a button in
--    the app and inside the Telegram reminder, so the reminder is one tap
--    from the action instead of a dead end.

alter table public.payments
  add column if not exists amount_is_variable boolean not null default false;

alter table public.payments
  add column if not exists notes text;

alter table public.payments
  add column if not exists payment_url text;

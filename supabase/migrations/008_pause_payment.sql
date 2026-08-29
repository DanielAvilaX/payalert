-- Run this in the Supabase SQL Editor after 007_more_recurrences.sql.
-- Lets a payment be paused - no reminders, no recurring rollover - without
-- deleting it or losing its history. payments already has a full-CRUD
-- "payments_update_own" RLS policy, so no new policy is needed here.

alter table public.payments
  add column if not exists is_paused boolean not null default false;

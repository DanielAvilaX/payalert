-- Run this in the Supabase SQL Editor after 006_bugfix_rls_and_notification_log.sql.
-- Adds bimonthly/quarterly/semiannual as valid recurrence values.

alter table public.payments drop constraint if exists payments_recurrence_check;

alter table public.payments
  add constraint payments_recurrence_check
  check (recurrence in ('none', 'weekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'yearly'));

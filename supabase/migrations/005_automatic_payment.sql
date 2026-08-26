-- Run this in the Supabase SQL Editor after 004_reminder_rules.sql.
-- Purely informational: marks a payment as enrolled in automatic debit.
-- Doesn't affect reminders or the paid/unpaid flow at all - you still mark
-- it paid manually either way.

alter table public.payments
  add column if not exists is_automatic boolean not null default false;

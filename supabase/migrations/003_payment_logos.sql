-- Run this in the Supabase SQL Editor after 002_categories_and_history.sql.
-- Replaces the broad "category" field with a specific "logo" per payment
-- (auto-detected from the payment name, editable via the logo picker).

alter table public.payments
  add column if not exists logo text not null default 'money';

alter table public.payments
  drop column if exists category;

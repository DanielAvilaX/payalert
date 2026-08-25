-- Run this in the Supabase SQL Editor after the initial schema.sql.

alter table public.payments
  add column if not exists category text not null default 'otro';

-- Snapshot of every time a payment gets marked paid, so the dashboard can
-- show "pagos completados este mes" without losing history when a
-- recurring payment's due_date rolls forward.
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(12, 2),
  due_date date not null,
  completed_at timestamptz not null default now()
);

create index if not exists payment_events_user_completed_idx
  on public.payment_events (user_id, completed_at);

alter table public.payment_events enable row level security;

create policy "payment_events_select_own" on public.payment_events
  for select using (auth.uid() = user_id);
create policy "payment_events_insert_own" on public.payment_events
  for insert with check (auth.uid() = user_id);

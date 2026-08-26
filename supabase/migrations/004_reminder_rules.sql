-- Run this in the Supabase SQL Editor after 003_payment_logos.sql.
-- Lets a payment have a custom escalating reminder schedule instead of the
-- single "N days before" default. Times are in Colombia local time
-- (UTC-5, no DST) - the cron job converts to UTC when evaluating.

create table if not exists public.reminder_rules (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Which day this rule applies to, counting back from the due date
  -- (0 = due day itself, 1 = the day before, 2 = two days before, ...).
  days_before_due integer not null check (days_before_due >= 0),
  -- Local (Colombia) time the rule starts firing on that day.
  start_time time not null default '09:00',
  -- If set (together with repeat_interval_minutes), the rule fires
  -- repeatedly from start_time up to end_time instead of just once.
  end_time time,
  repeat_interval_minutes integer check (repeat_interval_minutes is null or repeat_interval_minutes >= 15),
  created_at timestamptz not null default now()
);

create index if not exists reminder_rules_payment_idx on public.reminder_rules (payment_id);

alter table public.reminder_rules enable row level security;

create policy "reminder_rules_select_own" on public.reminder_rules
  for select using (auth.uid() = user_id);
create policy "reminder_rules_insert_own" on public.reminder_rules
  for insert with check (auth.uid() = user_id);
create policy "reminder_rules_delete_own" on public.reminder_rules
  for delete using (auth.uid() = user_id);

-- Dedupe log for rule-based sends, keyed on the exact intended timestamp so
-- a rule that repeats every N minutes doesn't double-send if the cron runs
-- more than once inside the same window.
create table if not exists public.reminder_fires (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.reminder_rules (id) on delete cascade,
  payment_id uuid not null references public.payments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  due_date date not null,
  fire_at timestamptz not null,
  sent_at timestamptz not null default now(),
  unique (rule_id, due_date, fire_at)
);

alter table public.reminder_fires enable row level security;

create policy "reminder_fires_select_own" on public.reminder_fires
  for select using (auth.uid() = user_id);

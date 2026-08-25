-- PayAlert schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query).

create extension if not exists pgcrypto;

-- Payments the user wants to be reminded about.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(12, 2),
  currency text not null default 'USD',
  due_date date not null,
  recurrence text not null default 'none' check (recurrence in ('none', 'weekly', 'monthly', 'yearly')),
  remind_days_before integer not null default 3 check (remind_days_before >= 0),
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_due_date_idx on public.payments (due_date) where not is_paid;

-- One row per user linking them to a Telegram chat (set by the bot webhook).
create table if not exists public.telegram_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  chat_id bigint not null,
  telegram_username text,
  connected_at timestamptz not null default now()
);

-- Short-lived tokens used for the /login -> Telegram deep-link handshake.
create table if not exists public.telegram_link_tokens (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  used_at timestamptz
);

-- Dedupe log so the cron job never sends the same reminder twice for the same due date.
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('upcoming', 'due', 'overdue')),
  due_date date not null,
  sent_at timestamptz not null default now(),
  unique (payment_id, kind, due_date)
);

alter table public.payments enable row level security;
alter table public.telegram_connections enable row level security;
alter table public.telegram_link_tokens enable row level security;
alter table public.notification_log enable row level security;

-- payments: full CRUD, scoped to the owning user.
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);
create policy "payments_insert_own" on public.payments
  for insert with check (auth.uid() = user_id);
create policy "payments_update_own" on public.payments
  for update using (auth.uid() = user_id);
create policy "payments_delete_own" on public.payments
  for delete using (auth.uid() = user_id);

-- telegram_connections: users can read/remove their own link; only the
-- webhook (using the service role key, which bypasses RLS) creates rows.
create policy "telegram_connections_select_own" on public.telegram_connections
  for select using (auth.uid() = user_id);
create policy "telegram_connections_delete_own" on public.telegram_connections
  for delete using (auth.uid() = user_id);

-- telegram_link_tokens: users can create/read their own tokens; the webhook
-- (service role) is the only writer that marks them used.
create policy "telegram_link_tokens_select_own" on public.telegram_link_tokens
  for select using (auth.uid() = user_id);
create policy "telegram_link_tokens_insert_own" on public.telegram_link_tokens
  for insert with check (auth.uid() = user_id);

-- notification_log: read-only for the owning user; the cron job (service
-- role) is the only writer.
create policy "notification_log_select_own" on public.notification_log
  for select using (auth.uid() = user_id);

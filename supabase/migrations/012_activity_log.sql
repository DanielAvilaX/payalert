-- Run this in the Supabase SQL Editor after 011_shared_payments.sql.
--
-- Who did what. Once several people can edit, settle and delete the same
-- payment, "it says $0 and I didn't touch it" needs an answer - and nothing
-- in the app recorded one: there wasn't so much as an updated_at anywhere.
--
-- Two details worth knowing:
--
-- * payment_name is denormalized and payment_id goes null when the payment
--   is deleted, so "Alejandra eliminó Arriendo" survives the very deletion
--   it describes. That's the entry you most need to keep.
--
-- * audience is the set of accounts that could see the payment at the time,
--   captured on write. It's what keeps a deleted payment's history visible
--   to the people who were on it, since access can no longer be derived
--   from a row that doesn't exist. While the payment is alive, current
--   access wins instead - so someone invited today can read back the whole
--   story, not just what happened after they arrived.

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments (id) on delete set null,
  payment_name text not null,
  -- Null means the system did it (the cron rolling a recurring bill over).
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (action in (
    'created', 'updated', 'paid', 'unpaid', 'paused', 'resumed', 'deleted',
    'rolled_over', 'shared', 'share_accepted', 'share_rejected',
    'share_revoked', 'share_left'
  )),
  -- Shape depends on the action: changed fields with before/after for
  -- 'updated', the settled amount for 'paid', the other person for shares.
  details jsonb,
  audience uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists activity_log_audience_idx on public.activity_log using gin (audience);
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
create index if not exists activity_log_payment_idx on public.activity_log (payment_id, created_at desc);

alter table public.activity_log enable row level security;

create policy activity_log_select on public.activity_log
  for select using (
    auth.uid() = any (audience)
    or public.has_payment_access(payment_id, auth.uid())
  );

-- Entries are written as the person doing the thing; the cron writes its
-- own (actor_id null) with the service role, which bypasses this.
create policy activity_log_insert on public.activity_log
  for insert with check (
    actor_id = auth.uid()
    and (payment_id is null or public.has_payment_access(payment_id, auth.uid()))
  );

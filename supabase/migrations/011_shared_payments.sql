-- Run this in the Supabase SQL Editor after 010_variable_amounts_notes_links.sql.
--
-- Shared payments: one payment row that several accounts can see, edit,
-- settle and get reminded about. Everything below exists because the app
-- was built on "every row belongs to exactly one user", and that assumption
-- is wired into the security rules, the reminder de-duplication and the
-- completion history.
--
-- 1. profiles - auth.users isn't readable by the app, so there was no way
--    to invite "alejandra@correo.com" or to show who marked something as
--    paid. This mirrors the two fields the app needs, kept in sync by a
--    trigger so a name change propagates everywhere by itself.
--
-- 2. payment_shares - the invitations themselves. Anyone with access can
--    invite someone else; the owner is never a row here (their access comes
--    from payments.user_id), which is exactly what makes it impossible to
--    revoke the owner.
--
-- 3. has_payment_access() - one security-definer function every policy
--    below calls. Written this way on purpose: a policy on payments that
--    queried payment_shares, whose own policy queried payments, would
--    recurse forever and take every query down with it.
--
-- 4. notification_log's unique key gains user_id. Without that, the second
--    person to be notified about a shared payment is silently swallowed as
--    "already sent" - the reminder simply never arrives.
--
-- 5. telegram_connections.notifications_enabled - pause reminders without
--    tearing down the Telegram link and having to re-pair the chat.

-- --------------------------------------------------------------------------
-- 1. profiles
-- --------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email)) where email is not null;

alter table public.profiles enable row level security;

create or replace function public.sync_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, updated_at)
  values (
    new.id,
    -- Stored lower-cased so an invitation can be matched on an exact
    -- comparison: "Ale@Correo.com" and "ale@correo.com" are one account.
    lower(new.email),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        updated_at = now();
  return new;
exception when others then
  -- Profile bookkeeping must never be able to block a signup or a name
  -- change: worst case the mirror is briefly stale.
  return new;
end;
$$;

drop trigger if exists sync_profile_on_auth_user on auth.users;
create trigger sync_profile_on_auth_user
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.sync_profile();

-- Everyone who signed up before this migration.
insert into public.profiles (id, email, full_name)
select u.id, lower(u.email), nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), '')
from auth.users u
on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name;

-- --------------------------------------------------------------------------
-- 2. payment_shares
-- --------------------------------------------------------------------------

create table if not exists public.payment_shares (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  -- The account being given access.
  shared_with uuid not null references auth.users (id) on delete cascade,
  -- Who sent this particular invitation - not necessarily the owner, since
  -- anyone with access can invite someone else.
  invited_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (shared_with <> invited_by),
  unique (payment_id, shared_with)
);

create index if not exists payment_shares_shared_with_idx
  on public.payment_shares (shared_with, status);
create index if not exists payment_shares_payment_idx
  on public.payment_shares (payment_id);

alter table public.payment_shares enable row level security;

-- --------------------------------------------------------------------------
-- 3. Access helpers
-- --------------------------------------------------------------------------

-- SECURITY DEFINER so it reads past RLS: every policy below calls it, and a
-- policy that re-entered the policies it is evaluating would recurse.
create or replace function public.has_payment_access(p_payment_id uuid, p_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.payments p
    where p.id = p_payment_id and p.user_id = p_user
  ) or exists (
    select 1 from public.payment_shares s
    where s.payment_id = p_payment_id
      and s.shared_with = p_user
      and s.status = 'accepted'
  );
$$;

-- "Is this person someone I actually share something with?" - the only
-- reason one account may read another's name and email.
create or replace function public.shares_payment_with(p_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.payments p
    where p.user_id = p_user and public.has_payment_access(p.id, auth.uid())
  ) or exists (
    select 1 from public.payment_shares s
    where s.shared_with = p_user and public.has_payment_access(s.payment_id, auth.uid())
  ) or exists (
    select 1 from public.payment_shares s2
    where s2.invited_by = p_user and s2.shared_with = auth.uid()
  );
$$;

-- --------------------------------------------------------------------------
-- 4. Policies
-- --------------------------------------------------------------------------

-- Dropped by lookup rather than by name: the original schema was applied by
-- hand and its policy names aren't recorded in any migration here.
do $$
declare
  target text;
  policy_name text;
begin
  foreach target in array array['payments', 'payment_events', 'reminder_rules', 'payment_shares', 'profiles']
  loop
    for policy_name in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = target
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, target);
    end loop;
  end loop;
end $$;

-- payments: anyone with access can read, edit and delete - including the
-- invited side, which is the behaviour that was asked for. Only the row's
-- own owner can create one.
create policy payments_select_shared on public.payments
  for select using (public.has_payment_access(id, auth.uid()));
create policy payments_insert_own on public.payments
  for insert with check (user_id = auth.uid());
create policy payments_update_shared on public.payments
  for update using (public.has_payment_access(id, auth.uid()));
create policy payments_delete_shared on public.payments
  for delete using (public.has_payment_access(id, auth.uid()));

-- payment_events: one completion per cycle, visible to everyone on the
-- payment. The `user_id = auth.uid()` arm keeps old events readable after
-- their payment is deleted (payment_id goes null, access can't be resolved).
create policy payment_events_select_shared on public.payment_events
  for select using (
    user_id = auth.uid() or public.has_payment_access(payment_id, auth.uid())
  );
create policy payment_events_insert_shared on public.payment_events
  for insert with check (public.has_payment_access(payment_id, auth.uid()));
create policy payment_events_delete_shared on public.payment_events
  for delete using (
    user_id = auth.uid() or public.has_payment_access(payment_id, auth.uid())
  );

-- reminder_rules stay personal: a shared bill can be one person's "warn me
-- three days out" and the other's "nag me every two hours on the day".
create policy reminder_rules_select_own on public.reminder_rules
  for select using (user_id = auth.uid());
create policy reminder_rules_insert_own on public.reminder_rules
  for insert with check (
    user_id = auth.uid() and public.has_payment_access(payment_id, auth.uid())
  );
create policy reminder_rules_update_own on public.reminder_rules
  for update using (user_id = auth.uid());
create policy reminder_rules_delete_own on public.reminder_rules
  for delete using (user_id = auth.uid());

-- payment_shares: you see invitations addressed to you, plus every share on
-- a payment you can access (so the owner sees exactly who is on it).
create policy payment_shares_select on public.payment_shares
  for select using (
    shared_with = auth.uid()
    or invited_by = auth.uid()
    or public.has_payment_access(payment_id, auth.uid())
  );
create policy payment_shares_insert on public.payment_shares
  for insert with check (
    invited_by = auth.uid() and public.has_payment_access(payment_id, auth.uid())
  );
-- Accepting/rejecting is the invitee's; revoking is anyone's on the payment.
create policy payment_shares_update on public.payment_shares
  for update using (
    shared_with = auth.uid() or public.has_payment_access(payment_id, auth.uid())
  );
create policy payment_shares_delete on public.payment_shares
  for delete using (
    shared_with = auth.uid() or public.has_payment_access(payment_id, auth.uid())
  );

create policy profiles_select_related on public.profiles
  for select using (id = auth.uid() or public.shares_payment_with(id));

-- --------------------------------------------------------------------------
-- 5. Reminders for more than one person
-- --------------------------------------------------------------------------

alter table public.notification_log
  drop constraint if exists notification_log_payment_id_kind_due_date_sent_on_key;

alter table public.notification_log
  add constraint notification_log_payment_user_kind_due_sent_key
  unique (payment_id, user_id, kind, due_date, sent_on);

alter table public.telegram_connections
  add column if not exists notifications_enabled boolean not null default true;

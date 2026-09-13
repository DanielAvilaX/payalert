-- Run this in the Supabase SQL Editor after 008_pause_payment.sql.
--
-- 1. Deleting a payment used to cascade-delete its completion events, so
--    "Gastado este mes" / "Historial reciente" changed retroactively months
--    after the fact just because you cleaned up a bill you no longer track.
--    payment_events already denormalizes name + amount + due_date, so the
--    row stands on its own: keep it and just detach the foreign key.
--
-- 2. One completion per payment per billing cycle, enforced by the database
--    instead of only by application code. markPaid is now written to be
--    idempotent, and this is the backstop for the double-submit that
--    already produced a real duplicate in production (a $600.000 charge
--    counted twice in August).
--
-- 3. notification_log grows forever; the cron now prunes it, and this index
--    keeps that prune cheap.

alter table public.payment_events
  drop constraint if exists payment_events_payment_id_fkey;

alter table public.payment_events
  alter column payment_id drop not null;

alter table public.payment_events
  add constraint payment_events_payment_id_fkey
  foreign key (payment_id) references public.payments (id) on delete set null;

-- NULL payment_id (an event whose payment was deleted) is exempt: Postgres
-- treats NULLs as distinct in a unique index, which is what we want here.
create unique index if not exists payment_events_payment_cycle_key
  on public.payment_events (payment_id, due_date);

create index if not exists notification_log_sent_on_idx
  on public.notification_log (sent_on);

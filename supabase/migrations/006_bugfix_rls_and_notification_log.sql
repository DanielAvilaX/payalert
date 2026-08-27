-- Run this in the Supabase SQL Editor after 005_automatic_payment.sql.
-- Fixes three gaps found during a bug review:
--
-- 1. reminder_rules had no UPDATE policy, so editing a custom reminder
--    rule silently failed to persist (RLS blocked the write; no error was
--    raised, so the UI looked like it saved).
--
-- 2. payment_events had no DELETE policy, so reverting a payment from paid
--    back to pending silently failed to remove its completion event,
--    leaving "Completados" / "Gastado este mes" / "Historial reciente"
--    overcounting it.
--
-- 3. notification_log's dedupe key (payment_id, kind, due_date) has no
--    "which day was this sent" component, so kinds meant to repeat once a
--    day - "overdue", and "gen-far" for payments with remind_days_before
--    set past 2 days - could only ever fire once total per due date
--    instead of daily. Also widens the "kind" check constraint, which
--    only allowed ('upcoming', 'due', 'overdue') and never matched the
--    escalating schedule's actual kind values (gen-0, gen-1-a, ...).

create policy "reminder_rules_update_own" on public.reminder_rules
  for update using (auth.uid() = user_id);

create policy "payment_events_delete_own" on public.payment_events
  for delete using (auth.uid() = user_id);

alter table public.notification_log drop constraint if exists notification_log_kind_check;

alter table public.notification_log
  add column if not exists sent_on date not null default current_date;

alter table public.notification_log
  drop constraint if exists notification_log_payment_id_kind_due_date_key;

alter table public.notification_log
  add constraint notification_log_payment_id_kind_due_date_sent_on_key
  unique (payment_id, kind, due_date, sent_on);

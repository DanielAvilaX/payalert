import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { escapeHtml, sendTelegramMessage, type InlineButton } from "@/lib/telegram";
import {
  nextDueDate,
  colombiaToday,
  colombiaLocalToUtc,
  daysUntil,
  type Recurrence,
} from "@/lib/dates";

type Payment = {
  id: string;
  user_id: string;
  name: string;
  amount: number | null;
  currency: string;
  due_date: string;
  remind_days_before: number;
  payment_url: string | null;
};

/**
 * A reminder you can act on beats a reminder you have to remember to act
 * on later: the whole point of the nudge is the payment, and making the
 * user go find the app to confirm is where the loop usually breaks.
 */
function actionButtons(payment: Payment): InlineButton[][] {
  const row: InlineButton[] = [{ text: "✅ Ya lo pagué", callback_data: `paid:${payment.id}` }];
  if (payment.payment_url) row.push({ text: "🔗 Pagar", url: payment.payment_url });
  return [row];
}

/**
 * How often an overdue bill keeps nagging. It never stops - the money is
 * still owed and the payment deliberately doesn't roll to the next cycle
 * until it's settled - but a daily message forever is how notifications
 * become wallpaper. So: daily for the first week, every third day for the
 * first month, then weekly.
 */
function shouldNagOverdue(daysOverdue: number): boolean {
  if (daysOverdue <= 7) return true;
  if (daysOverdue <= 30) return daysOverdue % 3 === 0;
  return daysOverdue % 7 === 0;
}

type ReminderRule = {
  id: string;
  payment_id: string;
  days_before_due: number;
  start_time: string;
  end_time: string | null;
  repeat_interval_minutes: number | null;
};

// How late a fire time is allowed to be and still go out - covers gaps
// between cron runs. GitHub Actions' `schedule` trigger is best-effort and
// can lag for hours under load (observed gaps over 11h in practice), so
// this is intentionally generous rather than tuned to the nominal 15-minute
// cadence. It's safe to be generous: `fireAt` is always built from *today's*
// slot times (recomputed fresh each run from the current date), so a stale
// run can never reach back and fire yesterday's schedule - the window just
// controls how late in the same day a delayed send is still allowed to go.
const CATCH_UP_WINDOW_MS = 12 * 60 * 60 * 1000;

function subtractDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt.toISOString().slice(0, 10);
}

const localToUtc = colombiaLocalToUtc;

function formatAmount(payment: Payment): string {
  return payment.amount != null ? ` ($${Number(payment.amount).toLocaleString("es-CO")})` : "";
}

// --- Custom per-payment rules (reminder_rules) ---

function fireTimesForRule(rule: ReminderRule, dueDate: string): Date[] {
  const targetDate = subtractDays(dueDate, rule.days_before_due);

  if (!rule.end_time || !rule.repeat_interval_minutes) {
    return [localToUtc(targetDate, rule.start_time)];
  }

  const times: Date[] = [];
  const end = localToUtc(targetDate, rule.end_time);
  let t = localToUtc(targetDate, rule.start_time);
  while (t <= end) {
    times.push(new Date(t));
    t = new Date(t.getTime() + rule.repeat_interval_minutes * 60_000);
  }
  return times;
}

// Escalates tone/urgency the closer `fireAt` is to the due date - and, for
// a repeating rule on the due day itself, the further into that day's
// window it fires.
function ruleMessage(payment: Payment, rule: ReminderRule, fireAt: Date): string {
  const amountText = formatAmount(payment);
  const name = `<b>${escapeHtml(payment.name)}</b>${amountText}`;

  if (rule.days_before_due === 0) {
    if (rule.end_time && rule.repeat_interval_minutes) {
      const start = localToUtc(payment.due_date, rule.start_time).getTime();
      const end = localToUtc(payment.due_date, rule.end_time).getTime();
      const progress = end > start ? (fireAt.getTime() - start) / (end - start) : 1;
      if (progress > 0.75) {
        return `🚨 ¡ÚLTIMA LLAMADA! ${name} vence HOY y se está acabando el tiempo.`;
      }
      if (progress > 0.35) {
        return `⚠️ ${name} vence HOY. No lo olvides.`;
      }
    }
    return `📅 Hoy vence ${name}.`;
  }

  if (rule.days_before_due === 1) {
    return `⏰ ${name} vence mañana.`;
  }

  return `🔔 ${name} vence en ${rule.days_before_due} días (${payment.due_date}).`;
}

// --- Default schedule (no custom rules) ---
//
// Without custom rules, reminders still escalate on their own: starting at
// `remind_days_before`, once a day, getting more frequent and more urgent
// as the due date gets closer. The due day itself is the most urgent of
// all, so it repeats the same fixed-tone notice every 2 hours from 8am to
// 8pm instead of escalating the wording further - overdue is handled
// separately below and keeps repeating once a day until paid.

const DUE_DAY_TIMES = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

type GeneralSlot = { time: string; kind: string; text: (payment: Payment, remaining: number) => string };

function generalSchedule(remaining: number): GeneralSlot[] {
  if (remaining === 0) {
    return DUE_DAY_TIMES.map((time, i) => ({
      time,
      kind: `gen-0-${i}`,
      text: (p) => `🚨 <b>${escapeHtml(p.name)}</b>${formatAmount(p)} vence HOY. ¡No lo dejes pasar!`,
    }));
  }

  if (remaining === 1) {
    return [
      {
        time: "09:00",
        kind: "gen-1-a",
        text: (p) => `⚠️ <b>${escapeHtml(p.name)}</b>${formatAmount(p)} vence mañana.`,
      },
      {
        time: "14:00",
        kind: "gen-1-b",
        text: (p) => `⚠️ <b>${escapeHtml(p.name)}</b>${formatAmount(p)} vence mañana. Prepáralo hoy.`,
      },
      {
        time: "20:00",
        kind: "gen-1-c",
        text: (p) =>
          `🚨 <b>${escapeHtml(p.name)}</b>${formatAmount(p)} vence mañana temprano. ¡Últimas horas para prepararlo!`,
      },
    ];
  }

  if (remaining === 2) {
    return [
      {
        time: "09:00",
        kind: "gen-2-a",
        text: (p) => `⏰ <b>${escapeHtml(p.name)}</b>${formatAmount(p)} vence en 2 días (${p.due_date}).`,
      },
      {
        time: "18:00",
        kind: "gen-2-b",
        text: (p) => `⏰ <b>${escapeHtml(p.name)}</b>${formatAmount(p)} vence en 2 días. No lo dejes para el final.`,
      },
    ];
  }

  return [
    {
      time: "09:00",
      kind: "gen-far",
      text: (p, r) => `🔔 <b>${escapeHtml(p.name)}</b>${formatAmount(p)} vence en ${r} días (${p.due_date}).`,
    },
  ];
}

// Postgres unique_violation - here it means another concurrent run already
// claimed this exact notification.
const UNIQUE_VIOLATION = "23505";

// Sent notifications are only kept long enough to serve as a dedupe ledger;
// after this they're dead weight in a table that would otherwise grow
// forever (a single payment can log ~10 rows on its due day alone).
const LEDGER_RETENTION_DAYS = 120;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();
  const todayStr = colombiaToday(now);
  // One payment failing (bot blocked, Telegram 5xx, a bad row) must not
  // abort the whole run and silently starve every payment after it.
  const errors: string[] = [];

  // Recurring payments that were marked paid stay that way (green check,
  // no reminders) until their due date actually passes - only then do they
  // roll forward to the next cycle and reopen as unpaid. Paying early
  // shouldn't instantly reopen next month's bill.
  const { data: dueRollovers } = await supabase
    .from("payments")
    .select("id, due_date, recurrence")
    .eq("is_paid", true)
    .eq("is_paused", false)
    .neq("recurrence", "none")
    .lt("due_date", todayStr);

  let rolledOver = 0;
  for (const payment of dueRollovers ?? []) {
    const { error: rollError } = await supabase
      .from("payments")
      .update({
        due_date: nextDueDate(payment.due_date, payment.recurrence as Recurrence),
        is_paid: false,
      })
      .eq("id", payment.id);
    if (rollError) errors.push(`rollover ${payment.id}: ${rollError.message}`);
    else rolledOver += 1;
  }

  const { data: paymentsData, error } = await supabase
    .from("payments")
    // `*` rather than a column list so a deploy that lands before its
    // migration degrades instead of breaking: a column this route reads but
    // that doesn't exist yet comes back undefined (and its feature stays
    // dormant) instead of failing the query and stopping every reminder.
    .select("*")
    .eq("is_paid", false)
    .eq("is_paused", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payments = (paymentsData ?? []) as Payment[];
  const paymentIds = payments.map((p) => p.id);

  const { data: rulesData } = paymentIds.length
    ? await supabase.from("reminder_rules").select("*").in("payment_id", paymentIds)
    : { data: [] };

  const rulesByPayment = new Map<string, ReminderRule[]>();
  for (const rule of (rulesData ?? []) as ReminderRule[]) {
    const list = rulesByPayment.get(rule.payment_id) ?? [];
    list.push(rule);
    rulesByPayment.set(rule.payment_id, list);
  }

  const connectionCache = new Map<string, number | null>();
  async function chatIdFor(userId: string): Promise<number | null> {
    if (connectionCache.has(userId)) return connectionCache.get(userId)!;
    const { data } = await supabase
      .from("telegram_connections")
      .select("chat_id")
      .eq("user_id", userId)
      .maybeSingle();
    const chatId = data?.chat_id ?? null;
    connectionCache.set(userId, chatId);
    return chatId;
  }

  /**
   * Claim-then-send. The ledger row is written *before* the Telegram call,
   * so the database's unique constraint - not a prior SELECT - is what
   * decides who gets to send. A read-then-send has a window between the two
   * where a second run sees nothing and sends a duplicate, and this app has
   * two independent pingers hitting the endpoint (cron-job.org every 15 min
   * plus the GitHub Actions workflow), so that window is genuinely reachable.
   *
   * If the send then fails, the claim is released so a later run retries
   * instead of the notification being silently lost forever.
   *
   * The claim is keyed on the Colombia calendar day it's sent, not just
   * payment+kind+due_date - kinds like "overdue" and "gen-far" are meant to
   * repeat once a day for as long as their window lasts, and due_date
   * doesn't change while that's happening.
   */
  async function sendOnce(payment: Payment, kind: string, text: string): Promise<boolean> {
    const chatId = await chatIdFor(payment.user_id);
    if (!chatId) return false;

    const { data: claim, error: claimError } = await supabase
      .from("notification_log")
      .insert({
        payment_id: payment.id,
        user_id: payment.user_id,
        kind,
        due_date: payment.due_date,
        sent_on: todayStr,
      })
      .select("id")
      .single();

    if (claimError) {
      // Someone else already claimed it (or is mid-send) - not an error.
      if (claimError.code !== UNIQUE_VIOLATION) {
        errors.push(`claim ${payment.name}/${kind}: ${claimError.message}`);
      }
      return false;
    }

    try {
      await sendTelegramMessage(chatId, text, actionButtons(payment));
      return true;
    } catch (e) {
      await supabase.from("notification_log").delete().eq("id", claim.id);
      throw e;
    }
  }

  /** Same claim-then-send contract as sendOnce, for custom rule schedules. */
  async function fireRuleOnce(
    payment: Payment,
    rule: ReminderRule,
    fireAt: Date
  ): Promise<boolean> {
    const chatId = await chatIdFor(payment.user_id);
    if (!chatId) return false;

    const { data: claim, error: claimError } = await supabase
      .from("reminder_fires")
      .insert({
        rule_id: rule.id,
        payment_id: payment.id,
        user_id: payment.user_id,
        due_date: payment.due_date,
        fire_at: fireAt.toISOString(),
      })
      .select("id")
      .single();

    if (claimError) {
      if (claimError.code !== UNIQUE_VIOLATION) {
        errors.push(`claim rule ${rule.id}: ${claimError.message}`);
      }
      return false;
    }

    try {
      await sendTelegramMessage(chatId, ruleMessage(payment, rule, fireAt), actionButtons(payment));
      return true;
    } catch (e) {
      await supabase.from("reminder_fires").delete().eq("id", claim.id);
      throw e;
    }
  }

  let sent = 0;

  for (const payment of payments) {
    try {
      const remaining = daysUntil(payment.due_date, todayStr);
      const rules = rulesByPayment.get(payment.id) ?? [];

      // Overdue fires regardless of custom rules - the escalating schedules
      // only cover up to the due day itself - but at a decaying cadence so
      // a long-unpaid bill doesn't turn into daily wallpaper.
      if (remaining < 0 && shouldNagOverdue(-remaining)) {
        const days = -remaining;
        const sentNow = await sendOnce(
          payment,
          "overdue",
          `⚠️ <b>${escapeHtml(payment.name)}</b>${formatAmount(payment)} venció hace ${days} día${days === 1 ? "" : "s"} (${payment.due_date}) y sigue sin marcarse como pagado.`
        );
        if (sentNow) sent += 1;
      }

      if (rules.length === 0) {
        // No custom schedule - use the automatic default: starting at
        // remind_days_before, escalating in frequency/urgency each day.
        if (remaining >= 0 && remaining <= payment.remind_days_before) {
          for (const slot of generalSchedule(remaining)) {
            const fireAt = localToUtc(todayStr, slot.time);
            if (fireAt > now) continue;
            if (now.getTime() - fireAt.getTime() > CATCH_UP_WINDOW_MS) continue;

            const sentNow = await sendOnce(payment, slot.kind, slot.text(payment, remaining));
            if (sentNow) sent += 1;
          }
        }
        continue;
      }

      // Custom escalating schedule.
      for (const rule of rules) {
        for (const fireAt of fireTimesForRule(rule, payment.due_date)) {
          if (fireAt > now) continue;
          if (now.getTime() - fireAt.getTime() > CATCH_UP_WINDOW_MS) continue;

          if (await fireRuleOnce(payment, rule, fireAt)) sent += 1;
        }
      }
    } catch (e) {
      errors.push(`${payment.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Prune the dedupe ledgers. Cheap no-op on most runs thanks to the
  // sent_on / due_date indexes, so it doesn't need its own schedule.
  const cutoff = subtractDays(todayStr, LEDGER_RETENTION_DAYS);
  await supabase.from("notification_log").delete().lt("sent_on", cutoff);
  await supabase.from("reminder_fires").delete().lt("due_date", cutoff);

  return NextResponse.json({
    ok: errors.length === 0,
    checked: payments.length,
    sent,
    rolledOver,
    ...(errors.length ? { errors } : {}),
  });
}

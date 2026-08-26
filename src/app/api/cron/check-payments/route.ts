import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";
import { nextDueDate, type Recurrence } from "@/lib/dates";

type Payment = {
  id: string;
  user_id: string;
  name: string;
  amount: number | null;
  currency: string;
  due_date: string;
  remind_days_before: number;
};

type ReminderRule = {
  id: string;
  payment_id: string;
  days_before_due: number;
  start_time: string;
  end_time: string | null;
  repeat_interval_minutes: number | null;
};

// How late a fire time is allowed to be and still go out - covers gaps
// between cron runs (GitHub Actions schedules can lag under load).
const CATCH_UP_WINDOW_MS = 90 * 60 * 1000;
// Colombia is UTC-5 year-round (no DST).
const COLOMBIA_OFFSET_MINUTES = 5 * 60;

function daysUntil(dueDate: string): number {
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const [year, month, day] = dueDate.split("-").map(Number);
  const dueUtc = Date.UTC(year, month - 1, day);
  return Math.round((dueUtc - todayUtc) / 86_400_000);
}

function subtractDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt.toISOString().slice(0, 10);
}

// `dateStr` + `timeStr` are Colombia local time; returns the UTC instant.
function localToUtc(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) + COLOMBIA_OFFSET_MINUTES * 60 * 1000);
}

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
  const name = `<b>${payment.name}</b>${amountText}`;

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
// as the due date gets closer. The due day itself is always a single,
// fixed-tone notice (no escalation within that day) - overdue is handled
// separately below and keeps repeating once a day until paid.

type GeneralSlot = { time: string; kind: string; text: (payment: Payment, remaining: number) => string };

function generalSchedule(remaining: number): GeneralSlot[] {
  if (remaining === 0) {
    return [
      {
        time: "09:00",
        kind: "gen-0",
        text: (p) => `📅 <b>${p.name}</b>${formatAmount(p)} vence HOY.`,
      },
    ];
  }

  if (remaining === 1) {
    return [
      {
        time: "09:00",
        kind: "gen-1-a",
        text: (p) => `⚠️ <b>${p.name}</b>${formatAmount(p)} vence mañana.`,
      },
      {
        time: "14:00",
        kind: "gen-1-b",
        text: (p) => `⚠️ <b>${p.name}</b>${formatAmount(p)} vence mañana. Prepáralo hoy.`,
      },
      {
        time: "20:00",
        kind: "gen-1-c",
        text: (p) =>
          `🚨 <b>${p.name}</b>${formatAmount(p)} vence mañana temprano. ¡Últimas horas para prepararlo!`,
      },
    ];
  }

  if (remaining === 2) {
    return [
      {
        time: "09:00",
        kind: "gen-2-a",
        text: (p) => `⏰ <b>${p.name}</b>${formatAmount(p)} vence en 2 días (${p.due_date}).`,
      },
      {
        time: "18:00",
        kind: "gen-2-b",
        text: (p) => `⏰ <b>${p.name}</b>${formatAmount(p)} vence en 2 días. No lo dejes para el final.`,
      },
    ];
  }

  return [
    {
      time: "09:00",
      kind: "gen-far",
      text: (p, r) => `🔔 <b>${p.name}</b>${formatAmount(p)} vence en ${r} días (${p.due_date}).`,
    },
  ];
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Recurring payments that were marked paid stay that way (green check,
  // no reminders) until their due date actually passes - only then do they
  // roll forward to the next cycle and reopen as unpaid. Paying early
  // shouldn't instantly reopen next month's bill.
  const { data: dueRollovers } = await supabase
    .from("payments")
    .select("id, due_date, recurrence")
    .eq("is_paid", true)
    .neq("recurrence", "none")
    .lt("due_date", todayStr);

  for (const payment of dueRollovers ?? []) {
    await supabase
      .from("payments")
      .update({
        due_date: nextDueDate(payment.due_date, payment.recurrence as Recurrence),
        is_paid: false,
      })
      .eq("id", payment.id);
  }

  const { data: paymentsData, error } = await supabase
    .from("payments")
    .select("id, user_id, name, amount, currency, due_date, remind_days_before")
    .eq("is_paid", false);

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

  async function sendOnce(payment: Payment, kind: string, text: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from("notification_log")
      .select("id")
      .eq("payment_id", payment.id)
      .eq("kind", kind)
      .eq("due_date", payment.due_date)
      .maybeSingle();
    if (existing) return false;

    const chatId = await chatIdFor(payment.user_id);
    if (!chatId) return false;

    await sendTelegramMessage(chatId, text);
    await supabase.from("notification_log").insert({
      payment_id: payment.id,
      user_id: payment.user_id,
      kind,
      due_date: payment.due_date,
    });
    return true;
  }

  let sent = 0;

  for (const payment of payments) {
    const remaining = daysUntil(payment.due_date);
    const rules = rulesByPayment.get(payment.id) ?? [];

    // Overdue always fires (once a day) regardless of custom rules - the
    // escalating schedules only cover up to the due day itself.
    if (remaining < 0) {
      const sentNow = await sendOnce(
        payment,
        "overdue",
        `⚠️ <b>${payment.name}</b>${formatAmount(payment)} venció el ${payment.due_date} y sigue sin marcarse como pagado.`
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

        const { data: existing } = await supabase
          .from("reminder_fires")
          .select("id")
          .eq("rule_id", rule.id)
          .eq("due_date", payment.due_date)
          .eq("fire_at", fireAt.toISOString())
          .maybeSingle();
        if (existing) continue;

        const chatId = await chatIdFor(payment.user_id);
        if (!chatId) continue;

        await sendTelegramMessage(chatId, ruleMessage(payment, rule, fireAt));
        await supabase.from("reminder_fires").insert({
          rule_id: rule.id,
          payment_id: payment.id,
          user_id: payment.user_id,
          due_date: payment.due_date,
          fire_at: fireAt.toISOString(),
        });
        sent += 1;
      }
    }
  }

  return NextResponse.json({ ok: true, checked: payments.length, sent });
}

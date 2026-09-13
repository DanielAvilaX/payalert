"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseMoneyInput } from "@/lib/format";
import {
  nearestMonthlyDueDate,
  nearestYearlyDueDate,
  nearestWeekdayDueDate,
  type Recurrence,
} from "@/lib/dates";
import {
  isValidISODate,
  parseIntInRange,
  parseName,
  MAX_AMOUNT,
  MAX_REMIND_DAYS_BEFORE,
} from "@/lib/validation";

export type { Recurrence };
export type ActionState = { error?: string } | undefined;

const RECURRENCES: Recurrence[] = [
  "none",
  "weekly",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "yearly",
];

// Postgres unique_violation. Hit when two submits race for the same row -
// which, for the writes below, means the work is already done.
const UNIQUE_VIOLATION = "23505";

/**
 * Every mutation scopes its query by user_id on top of RLS. RLS alone is
 * enough to *stop* a cross-account write, but scoping here means a missing
 * or mis-edited policy can never silently widen the blast radius, and it
 * makes each query's intent readable on its own.
 */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

function parseRecurrence(raw: unknown): Recurrence | null {
  const value = String(raw ?? "none");
  return (RECURRENCES as string[]).includes(value) ? (value as Recurrence) : null;
}

// The date fields collected depend on how often the payment repeats:
// monthly -> just a day-of-month (unambiguous: this month or next), yearly
// -> day + month, weekly -> day of the week. Bimonthly/quarterly/semiannual
// can't work off a bare day-of-month the way monthly does - day 30 could be
// this month, next month, or the one after, depending on which one actually
// starts the user's billing cycle - so, like único, they collect a full
// date (the next charge) and just step forward by their own month count
// from there.
function resolveDueDate(
  formData: FormData,
  recurrence: Recurrence
): { dueDate: string } | { error: string } {
  switch (recurrence) {
    case "monthly": {
      const dayOfMonth = parseIntInRange(formData.get("day_of_month"), 1, 31);
      if (dayOfMonth === null) return { error: "Día del mes inválido" };
      return { dueDate: nearestMonthlyDueDate(dayOfMonth) };
    }
    case "yearly": {
      const day = parseIntInRange(formData.get("day_of_month"), 1, 31);
      const month = parseIntInRange(formData.get("month"), 1, 12);
      if (day === null || month === null) return { error: "Día o mes inválido" };
      return { dueDate: nearestYearlyDueDate(day, month) };
    }
    case "weekly": {
      const weekday = parseIntInRange(formData.get("weekday"), 0, 6);
      if (weekday === null) return { error: "Falta el día de la semana" };
      return { dueDate: nearestWeekdayDueDate(weekday) };
    }
    default: {
      const dueDate = String(formData.get("due_date") ?? "").trim();
      if (!isValidISODate(dueDate)) return { error: "Fecha inválida" };
      return { dueDate };
    }
  }
}

/** Shared field parsing for create + edit, which take the same form. */
function parsePaymentForm(
  formData: FormData
):
  | { error: string }
  | {
      values: {
        name: string;
        amount: number | null;
        logo: string;
        due_date: string;
        recurrence: Recurrence;
        remind_days_before: number;
        is_automatic: boolean;
      };
    } {
  const name = parseName(formData.get("name"));
  if (!name) return { error: "El nombre es obligatorio (máx. 80 caracteres)" };

  const recurrence = parseRecurrence(formData.get("recurrence"));
  if (!recurrence) return { error: "Frecuencia inválida" };

  const remindDaysBefore = parseIntInRange(
    formData.get("remind_days_before"),
    0,
    MAX_REMIND_DAYS_BEFORE
  );
  if (remindDaysBefore === null) return { error: "Días antes inválido" };

  const amount = parseMoneyInput(String(formData.get("amount") ?? ""));
  if (amount !== null && amount > MAX_AMOUNT) return { error: "El monto es demasiado grande" };

  const resolved = resolveDueDate(formData, recurrence);
  if ("error" in resolved) return resolved;

  return {
    values: {
      name,
      amount,
      logo: String(formData.get("logo") ?? "money"),
      due_date: resolved.dueDate,
      recurrence,
      remind_days_before: remindDaysBefore,
      is_automatic: formData.get("is_automatic") === "on",
    },
  };
}

export async function createPayment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();

  const parsed = parsePaymentForm(formData);
  if ("error" in parsed) return parsed;

  const { error } = await supabase.from("payments").insert({
    user_id: user.id,
    currency: "COP",
    ...parsed.values,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
}

// Edits an existing payment. The recurrence can be changed just like on
// creation, so the due date is derived from whichever fields that recurrence
// asks for (day-of-month, day+month, weekday, or a full date).
export async function updatePayment(
  id: string,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();

  const parsed = parsePaymentForm(formData);
  if ("error" in parsed) return parsed;

  const { error } = await supabase
    .from("payments")
    .update(parsed.values)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
}

export async function deletePayment(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
}

/**
 * Marks a payment as paid, idempotently: the completion event is written
 * first and the database's one-event-per-cycle unique index is what decides
 * whether this is a real completion or a duplicate submit. A double click
 * (or a retry) therefore can't bill the same cycle to the history twice -
 * which previously inflated "Gastado este mes" by a full extra charge.
 *
 * is_paid is set unconditionally so the UI can confirm it (green check,
 * sinks to the bottom) regardless of recurrence. Recurring payments roll
 * forward to their next due date and reopen as unpaid once that due date
 * has actually passed (handled by the cron job) rather than the instant you
 * click - paying early shouldn't immediately reopen next cycle.
 */
export async function markPaid(id: string) {
  const { supabase, user } = await requireUser();

  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("name, amount, due_date")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error: eventError } = await supabase.from("payment_events").insert({
    payment_id: id,
    user_id: user.id,
    name: payment.name,
    amount: payment.amount,
    due_date: payment.due_date,
  });
  // Already recorded for this cycle - fall through and make sure the flag
  // agrees, rather than failing a click the user experiences as harmless.
  if (eventError && eventError.code !== UNIQUE_VIOLATION) {
    throw new Error(eventError.message);
  }

  const { error } = await supabase
    .from("payments")
    .update({ is_paid: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard", "layout");
}

/**
 * Undoes markPaid. Only the event for the cycle currently on the payment is
 * removed - deleting "the most recent event" (as this used to) could erase a
 * genuine completion from an earlier cycle if it ran when the payment was
 * already pending, permanently corrupting past months' totals.
 */
export async function unmarkPaid(id: string) {
  const { supabase, user } = await requireUser();

  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("due_date")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("payments")
    .update({ is_paid: false })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  const { error: deleteError } = await supabase
    .from("payment_events")
    .delete()
    .eq("payment_id", id)
    .eq("user_id", user.id)
    .eq("due_date", payment.due_date);
  if (deleteError) throw new Error(deleteError.message);

  revalidatePath("/dashboard", "layout");
}

// Pausing freezes a payment entirely - no reminders, no recurring rollover
// (see the cron route's is_paused filters) - without deleting it or losing
// its history, for things like a gym membership on hold.
export async function pausePayment(id: string) {
  await setPaused(id, true);
}

export async function resumePayment(id: string) {
  await setPaused(id, false);
}

async function setPaused(id: string, paused: boolean) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("payments")
    .update({ is_paused: paused })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
}

export async function generateTelegramLinkToken(): Promise<string> {
  const { supabase, user } = await requireUser();

  const token = randomUUID();
  const { error } = await supabase.from("telegram_link_tokens").insert({
    token,
    user_id: user.id,
  });
  if (error) throw new Error(error.message);

  return token;
}

export async function disconnectTelegram() {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("telegram_connections")
    .delete()
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
}

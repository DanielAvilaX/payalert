"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseMoneyInput } from "@/lib/format";
import {
  isSameSchedule,
  nearestMonthlyDueDate,
  nearestYearlyDueDate,
  nearestWeekdayDueDate,
  type Recurrence,
} from "@/lib/dates";
import {
  isValidISODate,
  parseIntInRange,
  parseName,
  parseOptionalText,
  parsePaymentUrl,
  MAX_AMOUNT,
  MAX_REMIND_DAYS_BEFORE,
} from "@/lib/validation";
import { settlePayment } from "@/lib/payments";

export type { Recurrence };
export type ActionState = { error?: string } | undefined;

export type PaymentHistoryEntry = {
  id: string;
  completed_at: string;
  amount: number | null;
  due_date: string;
};

const RECURRENCES: Recurrence[] = [
  "none",
  "weekly",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "yearly",
];

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
        amount_is_variable: boolean;
        notes: string | null;
        payment_url: string | null;
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

  const paymentUrl = parsePaymentUrl(formData.get("payment_url"));
  if (paymentUrl === null) return { error: "El enlace de pago no es válido" };

  const notes = formData.get("notes");
  if (String(notes ?? "").trim() && parseOptionalText(notes) === null) {
    return { error: "La nota es demasiado larga (máx. 500 caracteres)" };
  }

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
      amount_is_variable: formData.get("amount_is_variable") === "on",
      notes: parseOptionalText(notes),
      payment_url: paymentUrl ?? null,
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

/**
 * Edits an existing payment. The recurrence can be changed just like on
 * creation, so the due date is re-derived from whichever fields that
 * recurrence asks for - except when the submitted schedule is the one the
 * payment already has, in which case its current date is kept. Otherwise
 * fixing a typo in the name of an overdue monthly bill rolled it forward to
 * next month and silently hid that it was still unpaid.
 */
export async function updatePayment(
  id: string,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();

  const parsed = parsePaymentForm(formData);
  if ("error" in parsed) return parsed;

  const { data: existing, error: fetchError } = await supabase
    .from("payments")
    .select("due_date, recurrence")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "No encontramos ese pago" };

  const values = { ...parsed.values };
  const unchangedSchedule = isSameSchedule(existing, values.recurrence, {
    day: parseIntInRange(formData.get("day_of_month"), 1, 31),
    month: parseIntInRange(formData.get("month"), 1, 12),
    weekday: parseIntInRange(formData.get("weekday"), 0, 6),
  });
  if (unchangedSchedule) values.due_date = existing.due_date;

  const { error } = await supabase
    .from("payments")
    .update(values)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
}

/** One entry point for the shared create/edit form: an `id` means edit. */
export async function savePayment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  return id ? updatePayment(id, formData) : createPayment(undefined, formData);
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
 * Marks a payment as paid for its current cycle. The heavy lifting lives in
 * settlePayment so the Telegram bot settles payments through exactly the
 * same path (see src/lib/payments.ts).
 *
 * `actualAmountRaw` is what a variable bill really came to this month -
 * for luz/agua/gas the stored figure is only an estimate, and recording the
 * real one is what keeps "Gastado este mes" honest.
 *
 * is_paid is set regardless of recurrence so the UI can confirm it (green
 * check, sinks to the bottom). Recurring payments roll forward and reopen
 * as unpaid once the due date has actually passed (handled by the cron job)
 * rather than the instant you click - paying early shouldn't immediately
 * reopen next cycle.
 */
export async function markPaid(id: string, actualAmountRaw?: string) {
  const { supabase, user } = await requireUser();

  let actualAmount: number | null = null;
  if (actualAmountRaw != null && actualAmountRaw.trim() !== "") {
    actualAmount = parseMoneyInput(actualAmountRaw);
    if (actualAmount === null || actualAmount > MAX_AMOUNT) {
      throw new Error("Monto inválido");
    }
  }

  const result = await settlePayment(supabase, user.id, id, actualAmount);
  if ("error" in result) throw new Error(result.error);

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

/** Past completions of one payment, newest first - for its detail sheet. */
export async function listPaymentHistory(paymentId: string): Promise<PaymentHistoryEntry[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("payment_events")
    .select("id, completed_at, amount, due_date")
    .eq("payment_id", paymentId)
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(12);
  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentHistoryEntry[];
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

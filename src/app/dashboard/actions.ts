"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseMoneyInput } from "@/lib/format";

export type Recurrence = "none" | "weekly" | "monthly" | "yearly";
export type ActionState = { error?: string } | undefined;

function toISODate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Adds `months` to a UTC date, clamping the day to the target month's last
// day (e.g. Jan 31 + 1 month -> Feb 28/29, not an overflow into March).
function addMonthsClamped(year: number, monthIndex: number, day: number, months: number): string {
  const targetIndex = monthIndex + months;
  const targetYear = year + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return toISODate(targetYear, targetMonth, Math.min(day, lastDayOfTargetMonth));
}

function nextDueDate(dueDate: string, recurrence: Recurrence): string {
  const [year, month, day] = dueDate.split("-").map(Number);

  switch (recurrence) {
    case "weekly": {
      const date = new Date(Date.UTC(year, month - 1, day));
      date.setUTCDate(date.getUTCDate() + 7);
      return date.toISOString().slice(0, 10);
    }
    case "monthly":
      return addMonthsClamped(year, month - 1, day, 1);
    case "yearly":
      return addMonthsClamped(year, month - 1, day, 12);
    default:
      return dueDate;
  }
}

// Given just a day-of-month (for the common "monthly bill" case), picks the
// nearest occurrence: this month if that day hasn't passed yet, else next.
function nearestMonthlyDueDate(dayOfMonth: number): string {
  const today = new Date();
  const year = today.getUTCFullYear();
  const monthIndex = today.getUTCMonth();
  const todayDay = today.getUTCDate();

  const monthsAhead = dayOfMonth < todayDay ? 1 : 0;
  return addMonthsClamped(year, monthIndex, dayOfMonth, monthsAhead);
}

// Given a day + month (no year), picks the nearest occurrence: this year if
// that date hasn't passed yet, else next year.
function nearestYearlyDueDate(day: number, month: number): string {
  const today = new Date();
  const year = today.getUTCFullYear();
  const monthIndex = month - 1;
  const todayUtc = Date.UTC(year, today.getUTCMonth(), today.getUTCDate());

  const thisYearCandidate = addMonthsClamped(year, monthIndex, day, 0);
  const [cy, cm, cd] = thisYearCandidate.split("-").map(Number);
  const candidateUtc = Date.UTC(cy, cm - 1, cd);

  return candidateUtc >= todayUtc
    ? thisYearCandidate
    : addMonthsClamped(year + 1, monthIndex, day, 0);
}

// Given a day of the week (0 = Sunday .. 6 = Saturday, matching Date#getUTCDay),
// picks the nearest occurrence, counting today if it matches.
function nearestWeekdayDueDate(targetDow: number): string {
  const today = new Date();
  const year = today.getUTCFullYear();
  const monthIndex = today.getUTCMonth();
  const day = today.getUTCDate();
  const currentDow = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();

  let diff = targetDow - currentDow;
  if (diff < 0) diff += 7;

  const date = new Date(Date.UTC(year, monthIndex, day + diff));
  return date.toISOString().slice(0, 10);
}

export async function createPayment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const name = String(formData.get("name") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const recurrence = String(formData.get("recurrence") ?? "none") as Recurrence;
  const remindDaysBefore = Number(formData.get("remind_days_before") ?? 3);

  // The date fields collected depend on how often the payment repeats:
  // monthly -> just a day-of-month, yearly -> day + month, weekly -> day of
  // the week, único -> a full date. Whichever isn't relevant isn't asked for.
  let dueDate: string;
  switch (recurrence) {
    case "monthly": {
      const dayOfMonth = Number(formData.get("day_of_month") ?? "");
      if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) {
        return { error: "Día del mes inválido" };
      }
      dueDate = nearestMonthlyDueDate(dayOfMonth);
      break;
    }
    case "yearly": {
      const day = Number(formData.get("day_of_month") ?? "");
      const month = Number(formData.get("month") ?? "");
      if (!day || day < 1 || day > 31 || !month || month < 1 || month > 12) {
        return { error: "Día o mes inválido" };
      }
      dueDate = nearestYearlyDueDate(day, month);
      break;
    }
    case "weekly": {
      const weekday = formData.get("weekday");
      if (weekday === null || weekday === "") {
        return { error: "Falta el día de la semana" };
      }
      dueDate = nearestWeekdayDueDate(Number(weekday));
      break;
    }
    default:
      dueDate = String(formData.get("due_date") ?? "");
  }

  if (!name || !dueDate) return { error: "Faltan campos requeridos" };

  const { error } = await supabase.from("payments").insert({
    user_id: user.id,
    name,
    amount: parseMoneyInput(amountRaw),
    currency: "COP",
    due_date: dueDate,
    recurrence,
    remind_days_before: remindDaysBefore,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

// Edits an existing payment. Unlike creation, editing always works off a
// concrete date - you already know the due date you're correcting.
export async function updatePayment(
  id: string,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const dueDate = String(formData.get("due_date") ?? "");
  const remindDaysBefore = Number(formData.get("remind_days_before") ?? 3);

  if (!name || !dueDate) return { error: "Faltan campos requeridos" };

  const { error } = await supabase
    .from("payments")
    .update({
      name,
      amount: parseMoneyInput(amountRaw),
      due_date: dueDate,
      remind_days_before: remindDaysBefore,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function deletePayment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

// Marks a payment as paid. Recurring payments roll forward to their next
// due date instead of disappearing, so a fresh reminder cycle can fire.
export async function markPaid(id: string) {
  const supabase = await createClient();

  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("due_date, recurrence")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  if (payment.recurrence === "none") {
    const { error } = await supabase
      .from("payments")
      .update({ is_paid: true })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("payments")
      .update({
        due_date: nextDueDate(payment.due_date, payment.recurrence as Recurrence),
        is_paid: false,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

export async function generateTelegramLinkToken(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const token = randomUUID();
  const { error } = await supabase.from("telegram_link_tokens").insert({
    token,
    user_id: user.id,
  });
  if (error) throw new Error(error.message);

  return token;
}

export async function disconnectTelegram() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("telegram_connections")
    .delete()
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

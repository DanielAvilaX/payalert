"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Recurrence = "none" | "weekly" | "monthly" | "yearly";

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

export async function createPayment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const name = String(formData.get("name") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const recurrence = String(formData.get("recurrence") ?? "none") as Recurrence;
  const remindDaysBefore = Number(formData.get("remind_days_before") ?? 3);

  // Monthly bills only need a day-of-month; every other recurrence needs a
  // full date (a one-time payment or the first occurrence of a weekly/yearly one).
  let dueDate: string;
  if (recurrence === "monthly") {
    const dayOfMonth = Number(formData.get("day_of_month") ?? "");
    if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) {
      throw new Error("Día del mes inválido");
    }
    dueDate = nearestMonthlyDueDate(dayOfMonth);
  } else {
    dueDate = String(formData.get("due_date") ?? "");
  }

  if (!name || !dueDate) throw new Error("Faltan campos requeridos");

  const { error } = await supabase.from("payments").insert({
    user_id: user.id,
    name,
    amount: amountRaw ? Number(amountRaw) : null,
    currency: "COP",
    due_date: dueDate,
    recurrence,
    remind_days_before: remindDaysBefore,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function deletePayment(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

// Marks a payment as paid. Recurring payments roll forward to their next
// due date instead of disappearing, so a fresh reminder cycle can fire.
export async function markPaid(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

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

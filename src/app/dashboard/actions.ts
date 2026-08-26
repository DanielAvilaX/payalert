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

export type { Recurrence };
export type ActionState = { error?: string } | undefined;

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
  const logo = String(formData.get("logo") ?? "money");
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
    logo,
    due_date: dueDate,
    recurrence,
    remind_days_before: remindDaysBefore,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
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
  const logo = String(formData.get("logo") ?? "money");
  const dueDate = String(formData.get("due_date") ?? "");
  const remindDaysBefore = Number(formData.get("remind_days_before") ?? 3);

  if (!name || !dueDate) return { error: "Faltan campos requeridos" };

  const { error } = await supabase
    .from("payments")
    .update({
      name,
      amount: parseMoneyInput(amountRaw),
      logo,
      due_date: dueDate,
      remind_days_before: remindDaysBefore,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
}

export async function deletePayment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
}

// Marks a payment as paid. Always sets is_paid so the UI can confirm it
// (green check, sinks to the bottom of the list) regardless of recurrence.
// Recurring payments roll forward to their next due date + unpaid once that
// due date has actually passed (handled by the cron job) rather than the
// instant you click - paying early shouldn't immediately reopen next cycle.
export async function markPaid(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("name, amount, due_date")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error: eventError } = await supabase.from("payment_events").insert({
    payment_id: id,
    user_id: user.id,
    name: payment.name,
    amount: payment.amount,
    due_date: payment.due_date,
  });
  if (eventError) throw new Error(eventError.message);

  const { error } = await supabase.from("payments").update({ is_paid: true }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard", "layout");
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
  revalidatePath("/dashboard", "layout");
}

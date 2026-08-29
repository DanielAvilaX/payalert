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

// The date fields collected depend on how often the payment repeats:
// monthly -> just a day-of-month, yearly -> day + month, weekly -> day of
// the week, único -> a full date. Whichever isn't relevant isn't asked for.
function resolveDueDate(
  formData: FormData,
  recurrence: Recurrence
): { dueDate: string } | { error: string } {
  switch (recurrence) {
    case "monthly":
    case "bimonthly":
    case "quarterly":
    case "semiannual": {
      const dayOfMonth = Number(formData.get("day_of_month") ?? "");
      if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) {
        return { error: "Día del mes inválido" };
      }
      return { dueDate: nearestMonthlyDueDate(dayOfMonth) };
    }
    case "yearly": {
      const day = Number(formData.get("day_of_month") ?? "");
      const month = Number(formData.get("month") ?? "");
      if (!day || day < 1 || day > 31 || !month || month < 1 || month > 12) {
        return { error: "Día o mes inválido" };
      }
      return { dueDate: nearestYearlyDueDate(day, month) };
    }
    case "weekly": {
      const weekday = formData.get("weekday");
      if (weekday === null || weekday === "") {
        return { error: "Falta el día de la semana" };
      }
      return { dueDate: nearestWeekdayDueDate(Number(weekday)) };
    }
    default:
      return { dueDate: String(formData.get("due_date") ?? "") };
  }
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
  const logo = String(formData.get("logo") ?? "money");
  const recurrence = String(formData.get("recurrence") ?? "none") as Recurrence;
  const remindDaysBefore = Number(formData.get("remind_days_before") ?? 3);
  const isAutomatic = formData.get("is_automatic") === "on";

  const resolved = resolveDueDate(formData, recurrence);
  if ("error" in resolved) return resolved;
  const { dueDate } = resolved;

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
    is_automatic: isAutomatic,
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
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const logo = String(formData.get("logo") ?? "money");
  const isAutomatic = formData.get("is_automatic") === "on";
  const recurrence = String(formData.get("recurrence") ?? "none") as Recurrence;
  const remindDaysBefore = Number(formData.get("remind_days_before") ?? 3);

  const resolved = resolveDueDate(formData, recurrence);
  if ("error" in resolved) return resolved;
  const { dueDate } = resolved;

  if (!name || !dueDate) return { error: "Faltan campos requeridos" };

  const { error } = await supabase
    .from("payments")
    .update({
      name,
      amount: parseMoneyInput(amountRaw),
      logo,
      due_date: dueDate,
      recurrence,
      remind_days_before: remindDaysBefore,
      is_automatic: isAutomatic,
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

// Undoes markPaid - back to pending, and removes the completion event it
// logged so stats/history don't keep a phantom entry for it.
export async function unmarkPaid(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("payments").update({ is_paid: false }).eq("id", id);
  if (error) throw new Error(error.message);

  const { data: lastEvent } = await supabase
    .from("payment_events")
    .select("id")
    .eq("payment_id", id)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastEvent) {
    await supabase.from("payment_events").delete().eq("id", lastEvent.id);
  }

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

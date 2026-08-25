"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Recurrence = "none" | "weekly" | "monthly" | "yearly";

function nextDueDate(dueDate: string, recurrence: Recurrence): string {
  const [year, month, day] = dueDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  switch (recurrence) {
    case "weekly":
      date.setUTCDate(date.getUTCDate() + 7);
      break;
    case "monthly":
      date.setUTCMonth(date.getUTCMonth() + 1);
      break;
    case "yearly":
      date.setUTCFullYear(date.getUTCFullYear() + 1);
      break;
  }

  return date.toISOString().slice(0, 10);
}

export async function createPayment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const name = String(formData.get("name") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const currency = String(formData.get("currency") ?? "USD");
  const dueDate = String(formData.get("due_date") ?? "");
  const recurrence = String(formData.get("recurrence") ?? "none") as Recurrence;
  const remindDaysBefore = Number(formData.get("remind_days_before") ?? 3);

  if (!name || !dueDate) throw new Error("Faltan campos requeridos");

  const { error } = await supabase.from("payments").insert({
    user_id: user.id,
    name,
    amount: amountRaw ? Number(amountRaw) : null,
    currency,
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

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReminderRule = {
  id: string;
  payment_id: string;
  days_before_due: number;
  start_time: string;
  end_time: string | null;
  repeat_interval_minutes: number | null;
};

export async function listReminderRules(paymentId: string): Promise<ReminderRule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reminder_rules")
    .select("*")
    .eq("payment_id", paymentId)
    .order("days_before_due", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addReminderRule(
  paymentId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const daysBeforeDue = Number(formData.get("days_before_due") ?? "");
  const startTime = String(formData.get("start_time") ?? "");
  const repeats = formData.get("repeats") === "on";
  const endTime = repeats ? String(formData.get("end_time") ?? "") : null;
  const repeatInterval = repeats
    ? Number(formData.get("repeat_interval_minutes") ?? "")
    : null;

  if (Number.isNaN(daysBeforeDue) || daysBeforeDue < 0) {
    return { error: "Días antes inválido" };
  }
  if (!startTime) return { error: "Falta la hora de inicio" };
  if (repeats && (!endTime || !repeatInterval || repeatInterval < 15)) {
    return { error: "Completa la hora final y el intervalo (mínimo 15 min)" };
  }

  const { error } = await supabase.from("reminder_rules").insert({
    payment_id: paymentId,
    user_id: user.id,
    days_before_due: daysBeforeDue,
    start_time: startTime,
    end_time: endTime,
    repeat_interval_minutes: repeatInterval,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function deleteReminderRule(ruleId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("reminder_rules").delete().eq("id", ruleId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
}

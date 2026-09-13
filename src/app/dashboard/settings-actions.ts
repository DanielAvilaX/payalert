"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseMoneyInput } from "@/lib/format";
import { MAX_AMOUNT, MAX_REMIND_DAYS_BEFORE, parseIntInRange } from "@/lib/validation";

export type SettingsState = { error?: string; message?: string } | undefined;

export async function updateDefaultReminder(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const days = parseIntInRange(
    formData.get("default_remind_days_before"),
    0,
    MAX_REMIND_DAYS_BEFORE
  );
  if (days === null) return { error: "Valor inválido" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { default_remind_days_before: days },
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return { message: "Preferencia guardada." };
}

/**
 * Monthly income, used for exactly one thing: showing what share of it the
 * fixed payments already take. Optional - clearing the field removes it.
 */
export async function updateMonthlyIncome(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const income = parseMoneyInput(String(formData.get("monthly_income") ?? ""));
  if (income !== null && (income <= 0 || income > MAX_AMOUNT)) {
    return { error: "Ingreso inválido" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { monthly_income: income } });
  if (error) return { error: "No se pudo guardar." };

  revalidatePath("/dashboard", "layout");
  return { message: income === null ? "Ingreso eliminado." : "Ingreso guardado." };
}

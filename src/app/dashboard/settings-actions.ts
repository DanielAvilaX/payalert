"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; message?: string } | undefined;

export async function updateDefaultReminder(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const days = Number(formData.get("default_remind_days_before") ?? "");
  if (Number.isNaN(days) || days < 0) {
    return { error: "Valor inválido" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { default_remind_days_before: days },
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return { message: "Preferencia guardada." };
}

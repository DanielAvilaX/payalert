"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseName } from "@/lib/validation";

export type ProfileState = { error?: string; message?: string } | undefined;

export async function updateProfileName(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const name = parseName(formData.get("full_name"));
  if (!name) return { error: "Escribe tu nombre (máx. 80 caracteres)." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
  if (error) return { error: "No se pudo guardar tu nombre." };

  // The greeting, the avatar initials and the account menu all read it.
  revalidatePath("/dashboard", "layout");
  return { message: "Nombre actualizado." };
}

export async function changePassword(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error: error.message.toLowerCase().includes("different")
        ? "La nueva contraseña debe ser distinta a la actual."
        : "No se pudo cambiar la contraseña.",
    };
  }

  return { message: "Contraseña actualizada." };
}

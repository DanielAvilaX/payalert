"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseIntInRange, parseTimeOfDay } from "@/lib/validation";

// A rule that starts more than a year out would never fire; a repeat
// interval under 15 minutes would be indistinguishable from spam given the
// cron's own cadence.
const MAX_DAYS_BEFORE_DUE = 365;
const MIN_REPEAT_MINUTES = 15;
const MAX_REPEAT_MINUTES = 12 * 60;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export type ReminderRule = {
  id: string;
  payment_id: string;
  days_before_due: number;
  start_time: string;
  end_time: string | null;
  repeat_interval_minutes: number | null;
};

type ParsedRule = {
  days_before_due: number;
  start_time: string;
  end_time: string | null;
  repeat_interval_minutes: number | null;
};

function parseRuleForm(formData: FormData): { error: string } | { rule: ParsedRule } {
  const daysBeforeDue = parseIntInRange(
    formData.get("days_before_due"),
    0,
    MAX_DAYS_BEFORE_DUE
  );
  if (daysBeforeDue === null) return { error: "Días antes inválido" };

  const startTime = parseTimeOfDay(formData.get("start_time"));
  if (!startTime) return { error: "Falta la hora de inicio" };

  if (formData.get("repeats") !== "on") {
    return {
      rule: {
        days_before_due: daysBeforeDue,
        start_time: startTime,
        end_time: null,
        repeat_interval_minutes: null,
      },
    };
  }

  const endTime = parseTimeOfDay(formData.get("end_time"));
  const repeatInterval = parseIntInRange(
    formData.get("repeat_interval_minutes"),
    MIN_REPEAT_MINUTES,
    MAX_REPEAT_MINUTES
  );
  if (!endTime || repeatInterval === null) {
    return { error: "Completa la hora final y el intervalo (mínimo 15 min)" };
  }
  // Without this the cron's fire-time loop produces a single fire at
  // start_time and the "repeat" the user configured silently never happens.
  if (endTime <= startTime) {
    return { error: "La hora final debe ser posterior a la de inicio" };
  }

  return {
    rule: {
      days_before_due: daysBeforeDue,
      start_time: startTime,
      end_time: endTime,
      repeat_interval_minutes: repeatInterval,
    },
  };
}

export async function listReminderRules(paymentId: string): Promise<ReminderRule[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("reminder_rules")
    .select("*")
    .eq("payment_id", paymentId)
    .eq("user_id", user.id)
    .order("days_before_due", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addReminderRule(
  paymentId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();

  const parsed = parseRuleForm(formData);
  if ("error" in parsed) return parsed;

  const { error } = await supabase.from("reminder_rules").insert({
    payment_id: paymentId,
    user_id: user.id,
    ...parsed.rule,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function updateReminderRule(
  ruleId: string,
  formData: FormData
): Promise<{ error?: string; rule?: ParsedRule }> {
  const { supabase, user } = await requireUser();

  const parsed = parseRuleForm(formData);
  if ("error" in parsed) return parsed;

  // .select() so a blocked write surfaces as "no rows" instead of looking
  // like success - this action silently no-opped for weeks when the table
  // was missing its UPDATE policy.
  const { data, error } = await supabase
    .from("reminder_rules")
    .update(parsed.rule)
    .eq("id", ruleId)
    .eq("user_id", user.id)
    .select("id");

  if (error) return { error: error.message };
  if (!data?.length) return { error: "No se pudo guardar la regla" };
  revalidatePath("/dashboard", "layout");
  return { rule: parsed.rule };
}

export async function deleteReminderRule(ruleId: string): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("reminder_rules")
    .delete()
    .eq("id", ruleId)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
}

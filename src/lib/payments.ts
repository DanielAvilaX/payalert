import type { SupabaseClient } from "@supabase/supabase-js";
import { paymentAudience } from "./access.ts";

// Postgres unique_violation: this cycle already has a completion event.
const UNIQUE_VIOLATION = "23505";

export type SettledPayment = {
  name: string;
  amount: number | null;
  due_date: string;
  amount_is_variable: boolean;
  /** The payment's owner - not necessarily whoever settled it. */
  owner_id: string;
};

/**
 * Marks a payment as paid for its current cycle.
 *
 * Lives here rather than in the server action because two very different
 * callers need identical behaviour: the dashboard (acting as the signed-in
 * user through RLS) and the Telegram webhook (acting with the service role,
 * on behalf of whoever owns the chat). Both pass the actor explicitly and
 * are checked against the payment's audience here, so neither can settle a
 * payment they were never given access to even though only one of them has
 * RLS underneath it.
 *
 * Idempotent: the completion event is written first and the one-per-cycle
 * unique index decides whether this is a real completion or a repeat, so a
 * double tap - or both people tapping at once on a shared payment - can't
 * bill the same cycle to the history twice.
 */
export async function settlePayment(
  supabase: SupabaseClient,
  actorId: string,
  paymentId: string,
  actualAmount?: number | null
): Promise<{ error: string } | { payment: SettledPayment; audience: string[] }> {
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("name, amount, due_date, amount_is_variable, user_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!payment) return { error: "No encontramos ese pago" };

  const audience = await paymentAudience(supabase, paymentId);
  if (!audience.includes(actorId)) return { error: "No encontramos ese pago" };

  // The event belongs to the bill, so it's filed under the bill's owner
  // whoever pressed the button - that keeps one cycle to one row, and keeps
  // the row attributable after the payment itself is deleted. Who actually
  // settled it is recorded separately, in the activity log.
  const { error: eventError } = await supabase.from("payment_events").insert({
    payment_id: paymentId,
    user_id: payment.user_id,
    name: payment.name,
    amount: actualAmount ?? payment.amount,
    due_date: payment.due_date,
  });
  if (eventError && eventError.code !== UNIQUE_VIOLATION) {
    return { error: eventError.message };
  }

  // A variable bill settled with a real figure corrects its own estimate,
  // so next month's forecast is based on what actually arrived.
  const updates: Record<string, unknown> = { is_paid: true };
  if (actualAmount != null) updates.amount = actualAmount;

  const { error } = await supabase.from("payments").update(updates).eq("id", paymentId);
  if (error) return { error: error.message };

  return {
    payment: {
      name: payment.name,
      amount: actualAmount ?? payment.amount,
      due_date: payment.due_date,
      amount_is_variable: payment.amount_is_variable,
      owner_id: payment.user_id,
    },
    audience,
  };
}

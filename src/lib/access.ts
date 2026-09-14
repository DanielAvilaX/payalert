import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityAction, ActivityDetails } from "./activity.ts";

/**
 * Everyone who can see a payment: its owner, plus everyone whose invitation
 * was accepted.
 *
 * Every mutation used to pin itself to `user_id = me` on top of RLS, so a
 * mis-edited policy could never widen the blast radius. Sharing makes that
 * filter wrong rather than merely strict - it would lock out the very people
 * the payment was shared with - so this takes over the same job: the
 * explicit, readable check that runs regardless of what the policies say.
 * It matters most for the Telegram webhook, which talks to the database with
 * the service role and has no RLS underneath it at all.
 *
 * Returns an empty list when the payment doesn't exist. Missing tables (a
 * deploy that landed before its migration) degrade to "no shares" rather
 * than throwing, which leaves the app working exactly as it did before.
 */
export async function paymentAudience(
  supabase: SupabaseClient,
  paymentId: string
): Promise<string[]> {
  const [{ data: payment }, { data: shares }] = await Promise.all([
    supabase.from("payments").select("user_id").eq("id", paymentId).maybeSingle(),
    supabase
      .from("payment_shares")
      .select("shared_with")
      .eq("payment_id", paymentId)
      .eq("status", "accepted"),
  ]);

  const audience = new Set<string>();
  if (payment?.user_id) audience.add(payment.user_id as string);
  for (const share of shares ?? []) audience.add(share.shared_with as string);
  return [...audience];
}

export async function hasPaymentAccess(
  supabase: SupabaseClient,
  paymentId: string,
  userId: string
): Promise<boolean> {
  return (await paymentAudience(supabase, paymentId)).includes(userId);
}

/** The audience, having verified the caller is part of it. Throws otherwise. */
export async function requirePaymentAccess(
  supabase: SupabaseClient,
  paymentId: string,
  userId: string
): Promise<string[]> {
  const audience = await paymentAudience(supabase, paymentId);
  if (!audience.includes(userId)) throw new Error("No encontramos ese pago");
  return audience;
}

/**
 * Records who did what. Failures are logged and swallowed on purpose: the
 * history is valuable, but not so valuable that losing a line should undo
 * the edit or the payment the user just made.
 */
export async function logActivity(
  supabase: SupabaseClient,
  entry: {
    paymentId: string | null;
    paymentName: string;
    actorId: string | null;
    action: ActivityAction;
    details?: ActivityDetails;
    audience: string[];
  }
): Promise<void> {
  const { error } = await supabase.from("activity_log").insert({
    payment_id: entry.paymentId,
    payment_name: entry.paymentName,
    actor_id: entry.actorId,
    action: entry.action,
    details: entry.details ?? null,
    audience: entry.audience,
  });
  if (error) console.error("activity_log insert", error.message);
}

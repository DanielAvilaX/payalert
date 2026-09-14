import { createServiceRoleClient } from "@/lib/supabase/server";

export type PendingInvitation = {
  id: string;
  paymentId: string;
  paymentName: string;
  amount: number | null;
  logo: string | null;
  dueDate: string;
  recurrence: string;
  invitedByName: string | null;
  invitedByEmail: string | null;
  createdAt: string;
};

/**
 * Invitations waiting for this account to answer, with enough of the
 * payment to decide on.
 *
 * Read with the service role on purpose. A pending invitation grants no
 * access yet, so RLS correctly hides the payment behind it - but you can't
 * accept what you can't see. Widening the payments policy to cover pending
 * invitations would have leaked them into every other list in the app
 * (Inicio, Pagos, Resumen) as though they'd already been accepted; this
 * reads exactly the rows this one screen needs, scoped to the caller, and
 * leaves the policies alone.
 *
 * Returns an empty list rather than throwing if the sharing tables aren't
 * there yet, so a deploy that lands before its migration just shows nothing.
 */
export async function listPendingInvitations(userId: string): Promise<PendingInvitation[]> {
  const admin = createServiceRoleClient();

  const { data, error } = await admin
    .from("payment_shares")
    .select(
      "id, payment_id, created_at, invited_by, payments (name, amount, logo, due_date, recurrence)"
    )
    .eq("shared_with", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return [];

  const inviterIds = [...new Set(data.map((row) => row.invited_by as string))];
  const { data: inviters } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", inviterIds);
  const byId = new Map((inviters ?? []).map((row) => [row.id as string, row]));

  return data.flatMap((row) => {
    const payment = row.payments as unknown as {
      name: string;
      amount: number | null;
      logo: string | null;
      due_date: string;
      recurrence: string;
    } | null;
    // The payment was deleted between the invitation and now.
    if (!payment) return [];
    const inviter = byId.get(row.invited_by as string);
    return [
      {
        id: row.id as string,
        paymentId: row.payment_id as string,
        paymentName: payment.name,
        amount: payment.amount,
        logo: payment.logo,
        dueDate: payment.due_date,
        recurrence: payment.recurrence,
        invitedByName: (inviter?.full_name as string | null) ?? null,
        invitedByEmail: (inviter?.email as string | null) ?? null,
        createdAt: row.created_at as string,
      },
    ];
  });
}

export async function countPendingInvitations(userId: string): Promise<number> {
  const admin = createServiceRoleClient();
  const { count, error } = await admin
    .from("payment_shares")
    .select("id", { count: "exact", head: true })
    .eq("shared_with", userId)
    .eq("status", "pending");
  return error ? 0 : (count ?? 0);
}

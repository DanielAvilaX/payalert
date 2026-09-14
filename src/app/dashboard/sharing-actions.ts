"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { logActivity, paymentAudience, requirePaymentAccess } from "@/lib/access";
import { parseEmailList } from "@/lib/validation";

export type ShareState =
  | { error?: string; message?: string; notFound?: string[] }
  | undefined;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

function personLabel(profile: { full_name?: string | null; email?: string | null }): string {
  return profile.full_name?.trim() || profile.email || "Alguien";
}

export type PaymentAccessPerson = {
  id: string;
  name: string;
  isOwner: boolean;
  isMe: boolean;
  status: "accepted" | "pending" | "rejected";
};

/**
 * Who is on one payment - shown in its detail sheet so the owner can see
 * exactly who can touch it, which is the other half of "anyone can edit
 * and anyone can invite".
 */
export async function listPaymentAccess(paymentId: string): Promise<PaymentAccessPerson[]> {
  const { supabase, user } = await requireUser();

  const [{ data: payment }, { data: shares }] = await Promise.all([
    supabase.from("payments").select("user_id").eq("id", paymentId).maybeSingle(),
    supabase.from("payment_shares").select("id, shared_with, status").eq("payment_id", paymentId),
  ]);
  if (!payment) return [];

  const ids = [payment.user_id as string, ...(shares ?? []).map((s) => s.shared_with as string)];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);
  const byId = new Map((profiles ?? []).map((profile) => [profile.id as string, profile]));

  const label = (id: string) =>
    id === user.id ? "Tú" : personLabel(byId.get(id) ?? {});

  return [
    {
      id: payment.user_id as string,
      name: label(payment.user_id as string),
      isOwner: true,
      isMe: payment.user_id === user.id,
      status: "accepted" as const,
    },
    ...(shares ?? []).map((share) => ({
      id: share.shared_with as string,
      name: label(share.shared_with as string),
      isOwner: false,
      isMe: share.shared_with === user.id,
      status: share.status as "accepted" | "pending" | "rejected",
    })),
  ];
}

/**
 * Invites one or more accounts to one or more payments.
 *
 * Resolving an address to an account needs the service role: the whole
 * point is to find someone you have no relationship with yet, and that's
 * exactly what the profiles policy hides. Only "does this address have an
 * account" ever crosses back, and acting on the answer still requires the
 * other person to accept.
 */
export async function sharePayments(
  _prevState: ShareState,
  formData: FormData
): Promise<ShareState> {
  const { supabase, user } = await requireUser();

  const emails = parseEmailList(formData.get("emails"));
  if (!emails) {
    return { error: "Escribe entre 1 y 10 correos válidos, separados por coma o espacio." };
  }

  const paymentIds = formData
    .getAll("payment_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);
  if (paymentIds.length === 0) return { error: "Elige al menos un pago para compartir." };

  const admin = createServiceRoleClient();
  const { data: profiles, error: lookupError } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .in("email", emails);
  if (lookupError) return { error: "No pudimos buscar esas cuentas. Intenta de nuevo." };

  const byEmail = new Map((profiles ?? []).map((row) => [row.email as string, row]));
  const notFound = emails.filter((email) => !byEmail.has(email));
  const targets = (profiles ?? []).filter((profile) => profile.id !== user.id);

  if (targets.length === 0) {
    return {
      error:
        notFound.length === emails.length
          ? "Ninguno de esos correos tiene cuenta en PayAlert. Pídeles que se registren primero."
          : "Ese correo es el tuyo.",
      notFound,
    };
  }

  let invitations = 0;
  const skipped: string[] = [];

  for (const paymentId of paymentIds) {
    let audience: string[];
    try {
      audience = await requirePaymentAccess(supabase, paymentId, user.id);
    } catch {
      continue;
    }

    const { data: payment } = await supabase
      .from("payments")
      .select("name")
      .eq("id", paymentId)
      .maybeSingle();
    if (!payment) continue;

    for (const target of targets) {
      // Already the owner, or already accepted: nothing to invite them to.
      if (audience.includes(target.id as string)) {
        skipped.push(personLabel(target));
        continue;
      }

      // Upsert rather than insert so re-inviting after a "no" asks again
      // instead of failing on the one-invitation-per-person constraint.
      const { error } = await supabase.from("payment_shares").upsert(
        {
          payment_id: paymentId,
          shared_with: target.id,
          invited_by: user.id,
          status: "pending",
          responded_at: null,
        },
        { onConflict: "payment_id,shared_with" }
      );
      if (error) return { error: error.message };

      invitations += 1;
      await logActivity(supabase, {
        paymentId,
        paymentName: payment.name,
        actorId: user.id,
        action: "shared",
        details: { person: personLabel(target) },
        audience,
      });
    }
  }

  revalidatePath("/dashboard", "layout");

  if (invitations === 0) {
    return {
      error: skipped.length
        ? "Esas personas ya tienen acceso a los pagos que elegiste."
        : "No pudimos enviar la invitación.",
      notFound,
    };
  }

  const people = new Set(targets.map((t) => t.id)).size;
  return {
    message: `Invitación enviada a ${people} persona${people === 1 ? "" : "s"} para ${paymentIds.length} pago${paymentIds.length === 1 ? "" : "s"}.`,
    notFound,
  };
}

/**
 * Accept or reject an invitation addressed to you.
 *
 * The bookkeeping runs with the service role because a rejection leaves you
 * with no access to the payment at all - the entry recording what you
 * answered has to be written from outside the policy that's about to stop
 * applying to you.
 */
export async function respondToShare(shareId: string, accept: boolean) {
  const { supabase, user } = await requireUser();
  const admin = createServiceRoleClient();

  const { data: share } = await admin
    .from("payment_shares")
    .select("id, payment_id, shared_with, invited_by, status")
    .eq("id", shareId)
    .maybeSingle();
  if (!share || share.shared_with !== user.id) throw new Error("No encontramos esa invitación");
  if (share.status !== "pending") throw new Error("Esa invitación ya fue respondida");

  const { error } = await supabase
    .from("payment_shares")
    .update({
      status: accept ? "accepted" : "rejected",
      responded_at: new Date().toISOString(),
    })
    .eq("id", shareId);
  if (error) throw new Error(error.message);

  const { data: payment } = await admin
    .from("payments")
    .select("name")
    .eq("id", share.payment_id)
    .maybeSingle();

  const audience = new Set(await paymentAudience(admin, share.payment_id as string));
  audience.add(share.invited_by as string);
  audience.add(user.id);

  await logActivity(admin, {
    paymentId: share.payment_id as string,
    paymentName: payment?.name ?? "Pago",
    actorId: user.id,
    action: accept ? "share_accepted" : "share_rejected",
    audience: [...audience],
  });

  revalidatePath("/dashboard", "layout");
}

/**
 * Takes someone off a shared payment - either somebody else (revoking) or
 * yourself (leaving). The owner is never a share row, which is what makes
 * it structurally impossible to lock them out of their own payment.
 */
export async function revokeShare(shareId: string) {
  const { supabase, user } = await requireUser();
  const admin = createServiceRoleClient();

  const { data: share } = await admin
    .from("payment_shares")
    .select("id, payment_id, shared_with, invited_by")
    .eq("id", shareId)
    .maybeSingle();
  if (!share) throw new Error("No encontramos ese acceso");

  const leaving = share.shared_with === user.id;
  if (!leaving) {
    // Revoking someone else's access is only for people on the payment.
    await requirePaymentAccess(supabase, share.payment_id as string, user.id);
  }

  const [{ data: payment }, { data: person }] = await Promise.all([
    admin.from("payments").select("name").eq("id", share.payment_id).maybeSingle(),
    admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", share.shared_with)
      .maybeSingle(),
  ]);

  // Computed before the row goes, so the person losing access still sees
  // the entry that says they lost it.
  const audience = new Set(await paymentAudience(admin, share.payment_id as string));
  audience.add(share.shared_with as string);
  audience.add(share.invited_by as string);

  const { error } = await supabase.from("payment_shares").delete().eq("id", shareId);
  if (error) throw new Error(error.message);

  await logActivity(admin, {
    paymentId: share.payment_id as string,
    paymentName: payment?.name ?? "Pago",
    actorId: user.id,
    action: leaving ? "share_left" : "share_revoked",
    details: leaving ? undefined : { person: person ? personLabel(person) : "Alguien" },
    audience: [...audience],
  });

  revalidatePath("/dashboard", "layout");
}

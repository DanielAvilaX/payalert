import { Inbox, Users } from "lucide-react";
import { getCurrentUser, getPayments, getProfiles, getShares } from "@/lib/dashboard-data";
import { listPendingInvitations } from "@/lib/invitations";
import { formatCOP } from "@/lib/format";
import { BADGE, formatDueDate } from "@/lib/payment-status";
import { RECURRENCE_LABEL } from "@/lib/recurrence";
import { LogoBadge } from "@/app/dashboard/payment-parts";
import { SectionHeading } from "@/app/dashboard/section-heading";
import { Reveal } from "@/app/dashboard/motion";
import {
  InvitationActions,
  RevokeButton,
  ShareButton,
  type ShareablePayment,
} from "@/app/dashboard/compartidas/sharing-ui";
import type { Payment } from "@/app/dashboard/payment-types";

type ShareRow = {
  id: string;
  payment_id: string;
  shared_with: string;
  invited_by: string;
  status: string;
};

export default async function CompartidasPage() {
  const user = await getCurrentUser();
  const me = user?.id ?? "";

  // Only the invitations are new work - the rest came from the layout.
  const [paymentsData, sharesData, profilesData, invitations] = await Promise.all([
    getPayments(),
    getShares(),
    getProfiles(),
    listPendingInvitations(me),
  ]);

  const payments = paymentsData as Payment[];
  const shares = sharesData as unknown as ShareRow[];
  const nameOf = new Map(
    profilesData.map((profile) => [
      profile.id as string,
      ((profile.full_name as string | null)?.trim() || (profile.email as string | null) || "Alguien"),
    ])
  );

  const sharesByPayment = new Map<string, ShareRow[]>();
  for (const share of shares) {
    const list = sharesByPayment.get(share.payment_id) ?? [];
    list.push(share);
    sharesByPayment.set(share.payment_id, list);
  }

  const sharedPayments = payments.filter((payment) => (sharesByPayment.get(payment.id) ?? []).length > 0);

  const shareable: ShareablePayment[] = payments.map((payment) => ({
    id: payment.id,
    name: payment.name,
    logo: payment.logo,
    amount: payment.amount,
    dueDate: payment.due_date,
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-3">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-semibold tracking-tight">Cuentas compartidas</h1>
          <p className="mt-1 text-sm text-muted">
            Los pagos que llevas con otra persona: ambos los ven, los editan y reciben sus avisos.
          </p>
        </div>
        <ShareButton payments={shareable} />
      </Reveal>

      {invitations.length > 0 && (
        <Reveal delay={60}>
          <section className="card border-accent/30 p-5 sm:p-6">
            <SectionHeading
              icon={Inbox}
              title={`Solicitudes (${invitations.length})`}
              subtitle="Alguien quiere compartir estos pagos contigo"
            />
            <ul className="divide-y divide-border">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="flex flex-wrap items-center gap-3 py-3">
                  <LogoBadge logo={invitation.logo} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium break-words">{invitation.paymentName}</p>
                    <p className="text-xs text-muted">
                      De {invitation.invitedByName || invitation.invitedByEmail} ·{" "}
                      {invitation.amount != null ? `${formatCOP(invitation.amount)} · ` : ""}
                      {RECURRENCE_LABEL[invitation.recurrence] ?? invitation.recurrence} ·{" "}
                      {formatDueDate(invitation.dueDate, true)}
                    </p>
                  </div>
                  <InvitationActions shareId={invitation.id} />
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      )}

      <Reveal delay={invitations.length ? 120 : 60}>
        <section className="card p-5 sm:p-6">
          <SectionHeading
            icon={Users}
            title="Pagos compartidos"
            subtitle="Quién tiene acceso a qué, en los dos sentidos"
          />
          {sharedPayments.length === 0 ? (
            <p className="rounded-xl bg-surface-2 px-4 py-8 text-center text-sm text-muted">
              Todavía no compartes ningún pago. Usa &quot;Compartir pagos&quot; para invitar a alguien.
            </p>
          ) : (
            <ul className="space-y-4">
              {sharedPayments.map((payment) => {
                const mine = payment.user_id === me;
                const people = sharesByPayment.get(payment.id) ?? [];
                return (
                  <li key={payment.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-3">
                      <LogoBadge logo={payment.logo} automatic={payment.is_automatic} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium break-words">{payment.name}</p>
                        <p className="text-xs text-muted">
                          {payment.amount != null ? `${formatCOP(payment.amount)} · ` : ""}
                          {mine ? "Tuyo" : `De ${nameOf.get(payment.user_id) ?? "otra persona"}`}
                        </p>
                      </div>
                    </div>

                    <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                      {!mine && (
                        // The owner's access comes from the payment itself,
                        // not from a share row - which is precisely why it
                        // can't be taken away here.
                        <li className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate">
                            {nameOf.get(payment.user_id) ?? "Otra persona"}
                          </span>
                          <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                            Dueño
                          </span>
                        </li>
                      )}
                      {people.map((share) => {
                        const isMe = share.shared_with === me;
                        const label = isMe ? "Tú" : (nameOf.get(share.shared_with) ?? "Alguien");
                        return (
                          <li key={share.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate">{label}</span>
                            <span className="flex shrink-0 items-center gap-2">
                              {share.status === "pending" && (
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE.soon}`}>
                                  Pendiente
                                </span>
                              )}
                              {share.status === "rejected" && (
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE.paused}`}>
                                  Rechazado
                                </span>
                              )}
                              <RevokeButton
                                shareId={share.id}
                                personLabel={label}
                                paymentName={payment.name}
                                leaving={isMe}
                              />
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </Reveal>
    </div>
  );
}

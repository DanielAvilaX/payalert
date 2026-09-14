"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Loader2, Send, Share2, UserMinus, X } from "lucide-react";
import { ModalShell } from "@/app/dashboard/modal-shell";
import { useConfirmDelete } from "@/app/dashboard/delete-confirm-context";
import { useToast } from "@/app/dashboard/toast-context";
import { LogoBadge } from "@/app/dashboard/payment-parts";
import { Spinner } from "@/app/dashboard/spinner";
import { respondToShare, revokeShare, sharePayments, type ShareState } from "@/app/dashboard/sharing-actions";
import { formatCOP } from "@/lib/format";
import { formatDueDate } from "@/lib/payment-status";

export type ShareablePayment = {
  id: string;
  name: string;
  logo: string | null;
  amount: number | null;
  dueDate: string;
};

export function ShareButton({ payments }: { payments: ShareablePayment[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-500/20 transition hover:bg-accent-dark active:scale-[0.98]"
      >
        <Share2 size={16} />
        Compartir pagos
      </button>
      <SharePaymentsModal open={open} onClose={() => setOpen(false)} payments={payments} />
    </>
  );
}

function SharePaymentsModal({
  open,
  onClose,
  payments,
}: {
  open: boolean;
  onClose: () => void;
  payments: ShareablePayment[];
}) {
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [state, action, pending] = useActionState<ShareState, FormData>(
    async (prev, formData) => {
      const result = await sharePayments(prev, formData);
      if (result?.message) {
        toast(result.message);
        setSelected([]);
        onClose();
      }
      return result;
    },
    undefined
  );

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  return (
    <ModalShell open={open} onClose={onClose} maxWidth="max-w-lg" title="Compartir pagos">
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="emails" className="text-sm font-medium">
            Correo de la persona
          </label>
          <input
            id="emails"
            name="emails"
            type="text"
            inputMode="email"
            autoComplete="off"
            placeholder="alejandra@correo.com"
            className="field mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm"
          />
          <p className="mt-1.5 text-xs text-muted">
            Puedes poner varios, separados por coma. Cada persona debe tener cuenta en PayAlert.
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">
            ¿Cuáles pagos? <span className="text-muted">({selected.length} elegidos)</span>
          </p>
          {payments.length === 0 ? (
            <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-sm text-muted">
              Todavía no tienes pagos para compartir.
            </p>
          ) : (
            <ul className="scrollbar-thin max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border p-1.5">
              {payments.map((payment) => {
                const checked = selected.includes(payment.id);
                return (
                  <li key={payment.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition ${
                        checked ? "bg-accent-soft" : "hover:bg-surface-2"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="payment_ids"
                        value={payment.id}
                        checked={checked}
                        onChange={() => toggle(payment.id)}
                        className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                      />
                      <LogoBadge logo={payment.logo} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{payment.name}</span>
                        <span className="block text-xs text-muted">
                          {formatDueDate(payment.dueDate, true)}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm tabular-nums">
                        {payment.amount != null ? formatCOP(payment.amount) : "—"}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {state?.error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state?.notFound && state.notFound.length > 0 && !state.error && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Sin cuenta en PayAlert: {state.notFound.join(", ")}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || selected.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-dark disabled:opacity-50"
        >
          {pending ? <Spinner size={16} /> : <Send size={16} />}
          Enviar invitación
        </button>
      </form>
    </ModalShell>
  );
}

export function InvitationActions({ shareId }: { shareId: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function respond(accept: boolean) {
    startTransition(async () => {
      try {
        await respondToShare(shareId, accept);
        toast(accept ? "Pago compartido aceptado" : "Invitación rechazada");
      } catch {
        toast("No pudimos responder la invitación", "error");
      }
    });
  }

  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => respond(true)}
        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
        Aceptar
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => respond(false)}
        className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium transition hover:bg-surface-2 disabled:opacity-50"
      >
        <X size={15} />
        Rechazar
      </button>
    </div>
  );
}

export function RevokeButton({
  shareId,
  personLabel,
  paymentName,
  leaving = false,
}: {
  shareId: string;
  personLabel: string;
  paymentName: string;
  leaving?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirmDelete();
  const toast = useToast();

  function ask() {
    confirm({
      title: leaving ? "Salir del pago" : "Quitar acceso",
      description: leaving
        ? `¿Salir de "${paymentName}"? Dejarás de verlo y de recibir sus recordatorios.`
        : `¿Quitarle el acceso a ${personLabel} en "${paymentName}"?`,
      onConfirm: () =>
        startTransition(async () => {
          try {
            await revokeShare(shareId);
            toast(leaving ? "Saliste del pago" : "Acceso retirado");
          } catch {
            toast("No pudimos actualizar el acceso", "error");
          }
        }),
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={ask}
      title={leaving ? "Salir" : "Quitar acceso"}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
      {leaving ? "Salir" : "Quitar"}
    </button>
  );
}

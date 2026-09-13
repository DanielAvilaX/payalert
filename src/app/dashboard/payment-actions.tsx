"use client";

import { useTransition } from "react";
import {
  Bell,
  CheckCircle2,
  Ellipsis,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  deletePayment,
  markPaid as markPaidAction,
  pausePayment,
  resumePayment,
  unmarkPaid as unmarkPaidAction,
} from "@/app/dashboard/actions";
import { useConfirmDelete } from "@/app/dashboard/delete-confirm-context";
import { useOpenReminders } from "@/app/dashboard/reminders-modal-context";
import { useToast } from "@/app/dashboard/toast-context";
import { usePaymentUI } from "@/app/dashboard/payment-ui-context";
import { FloatingMenu, MenuItem } from "@/app/dashboard/floating-menu";
import { Spinner } from "@/app/dashboard/spinner";
import type { Payment } from "@/app/dashboard/payment-types";

export type PaymentActions = ReturnType<typeof usePaymentActions>;

/**
 * Everything you can do to a payment, with the same confirm/toast behaviour
 * wherever it's triggered from - a table row, the detail sheet, or anything
 * added later.
 */
export function usePaymentActions(payment: Payment) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const confirmDelete = useConfirmDelete();
  const openReminders = useOpenReminders();
  const ui = usePaymentUI();

  function run(action: () => Promise<void>, success: string, failure: string, after?: () => void) {
    startTransition(async () => {
      try {
        await action();
        toast(success);
        after?.();
      } catch {
        // Production builds replace server-action error messages with a
        // generic English string, so the wording shown is always ours.
        toast(failure, "error");
      }
    });
  }

  function markPaid() {
    if (payment.amount_is_variable) {
      ui.askActualAmount(payment, (amount) =>
        run(() => markPaidAction(payment.id, amount), "Marcado como pagado", "No se pudo marcar como pagado")
      );
      return;
    }
    run(() => markPaidAction(payment.id), "Marcado como pagado", "No se pudo marcar como pagado");
  }

  return {
    pending,
    markPaid,
    unmarkPaid: () =>
      run(() => unmarkPaidAction(payment.id), "Marcado como pendiente", "No se pudo actualizar"),
    togglePause: () =>
      payment.is_paused
        ? run(() => resumePayment(payment.id), "Pago reanudado", "No se pudo reanudar")
        : run(() => pausePayment(payment.id), "Pago pausado", "No se pudo pausar"),
    remove: (after?: () => void) =>
      confirmDelete({
        title: "Eliminar pago",
        description: `¿Eliminar "${payment.name}"? Esta acción no se puede deshacer.`,
        onConfirm: () =>
          run(() => deletePayment(payment.id), "Pago eliminado", "No se pudo eliminar", after),
      }),
    edit: () => ui.openEdit(payment),
    reminders: () =>
      openReminders({
        paymentId: payment.id,
        paymentName: payment.name,
        paymentLogo: payment.logo,
      }),
  };
}

/** The one-tap check in the table: settle it, or undo a settle. */
export function QuickPayButton({ payment, actions }: { payment: Payment; actions: PaymentActions }) {
  if (payment.is_paid) {
    return (
      <button
        type="button"
        disabled={actions.pending}
        onClick={actions.unmarkPaid}
        aria-label={`Marcar ${payment.name} como pendiente`}
        title="Marcar como pendiente"
        className="group rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50"
      >
        {actions.pending ? (
          <Spinner size={18} />
        ) : (
          <>
            <CheckCircle2 size={18} className="group-hover:hidden" />
            <RotateCcw size={18} className="hidden group-hover:block" />
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={actions.pending}
      onClick={actions.markPaid}
      aria-label={`Marcar ${payment.name} como pagado`}
      title="Marcar como pagado"
      className="rounded-lg p-2 text-subtle transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
    >
      {actions.pending ? <Spinner size={18} /> : <CheckCircle2 size={18} />}
    </button>
  );
}

export function PaymentActionsMenu({
  payment,
  actions,
}: {
  payment: Payment;
  actions: PaymentActions;
}) {
  return (
    <FloatingMenu label={`Más acciones para ${payment.name}`} trigger={<Ellipsis size={18} />}>
      {(close) => {
        const pick = (fn: () => void) => () => {
          close();
          fn();
        };
        return (
          <>
            <MenuItem icon={<Pencil size={16} />} onClick={pick(actions.edit)}>
              Editar
            </MenuItem>
            <MenuItem icon={<Bell size={16} />} onClick={pick(actions.reminders)}>
              Recordatorios
            </MenuItem>
            {payment.is_paid && (
              <MenuItem icon={<RotateCcw size={16} />} onClick={pick(actions.unmarkPaid)}>
                Marcar como pendiente
              </MenuItem>
            )}
            <MenuItem
              icon={payment.is_paused ? <Play size={16} /> : <Pause size={16} />}
              onClick={pick(actions.togglePause)}
            >
              {payment.is_paused ? "Reanudar" : "Pausar"}
            </MenuItem>
            <div className="my-1 h-px bg-border" />
            <MenuItem danger icon={<Trash2 size={16} />} onClick={pick(() => actions.remove())}>
              Eliminar
            </MenuItem>
          </>
        );
      }}
    </FloatingMenu>
  );
}

"use client";

import { ChevronRight } from "lucide-react";
import {
  PaymentActionsMenu,
  QuickPayButton,
  usePaymentActions,
} from "@/app/dashboard/payment-actions";
import { LogoBadge, StatusBadge, formatPaymentAmount } from "@/app/dashboard/payment-parts";
import { RECURRENCE_LABEL, type Payment } from "@/app/dashboard/payment-types";
import { formatDueDate, paymentStatus } from "@/lib/payment-status";

type ListProps = {
  payments: Payment[];
  todayStr: string;
  onOpenDetail: (id: string) => void;
};

/**
 * Desktop: the mockup's table - name, amount, due date, state, actions.
 *
 * Never scrolls sideways. It sizes itself to its own card rather than the
 * viewport (a container query), because the same table sits full-width on
 * Pagos but shares the row with the month donut on Inicio. When the card is
 * narrow, the state badge moves under the due date instead of taking its own
 * column - same information, one column fewer.
 */
export function PaymentsTable({ payments, todayStr, onOpenDetail }: ListProps) {
  return (
    <div className="card @container overflow-hidden">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2/60 text-left text-xs text-muted">
            <th scope="col" className="py-3 pr-3 pl-4 font-medium @3xl:pl-5">Nombre</th>
            <th scope="col" className="w-[8.5rem] px-3 py-3 font-medium @3xl:w-[10rem]">Monto</th>
            <th scope="col" className="w-[8.75rem] px-3 py-3 font-medium @3xl:w-[10rem]">
              Vencimiento
            </th>
            <th scope="col" className="hidden w-[8rem] px-3 py-3 font-medium @3xl:table-cell">
              Estado
            </th>
            <th scope="col" className="w-[5.5rem] py-3 pr-4 pl-2 text-right font-medium @3xl:pr-5">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {payments.map((payment) => (
            <PaymentTableRow
              key={payment.id}
              payment={payment}
              todayStr={todayStr}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentTableRow({
  payment,
  todayStr,
  onOpenDetail,
}: {
  payment: Payment;
  todayStr: string;
  onOpenDetail: (id: string) => void;
}) {
  const actions = usePaymentActions(payment);
  const status = paymentStatus(payment, todayStr);

  return (
    <tr className={`transition-colors hover:bg-surface-2/50 ${payment.is_paused ? "opacity-60" : ""}`}>
      <td className="py-3 pr-3 pl-4 @3xl:pl-5">
        <div className="flex items-center gap-3">
          <LogoBadge logo={payment.logo} automatic={payment.is_automatic} size={36} />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onOpenDetail(payment.id)}
              className="text-left font-medium break-words transition hover:text-accent"
            >
              {payment.name}
            </button>
            <p className="text-xs text-muted">{RECURRENCE_LABEL[payment.recurrence]}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 tabular-nums">
        <span className="whitespace-nowrap">{formatPaymentAmount(payment)}</span>
        {payment.amount != null && <span className="ml-1 text-xs text-muted">COP</span>}
      </td>
      <td className="px-3 py-3">
        <p className="whitespace-nowrap tabular-nums">{formatDueDate(payment.due_date, true)}</p>
        <p className="text-xs text-muted">{status.detail}</p>
        <div className="mt-1.5 @3xl:hidden">
          <StatusBadge status={status} />
        </div>
      </td>
      <td className="hidden px-3 py-3 @3xl:table-cell">
        <StatusBadge status={status} />
      </td>
      <td className="py-3 pr-4 pl-2 @3xl:pr-5">
        <div className="flex items-center justify-end gap-0.5">
          <QuickPayButton payment={payment} actions={actions} />
          <PaymentActionsMenu
            payment={payment}
            actions={actions}
            onDetails={() => onOpenDetail(payment.id)}
          />
        </div>
      </td>
    </tr>
  );
}

/**
 * Phones: the mockup's cards. Tapping opens the detail sheet, which holds
 * every action - the card itself stays calm and scannable.
 */
export function PaymentCards({ payments, todayStr, onOpenDetail }: ListProps) {
  return (
    <ul className="space-y-2.5">
      {payments.map((payment) => {
        const status = paymentStatus(payment, todayStr);
        return (
          <li key={payment.id}>
            <button
              type="button"
              onClick={() => onOpenDetail(payment.id)}
              className={`card flex w-full flex-wrap items-center gap-x-3 gap-y-2 p-4 text-left transition active:scale-[0.99] ${
                payment.is_paused ? "opacity-60" : ""
              }`}
            >
              <LogoBadge logo={payment.logo} automatic={payment.is_automatic} size={44} />
              {/* The rem-based minimum makes the badge wrap below the text
                  before the name gets squeezed, so a large system font never
                  collapses it into a one-letter-per-line column again. */}
              <span className="block min-w-[9rem] flex-1">
                <span className="block font-medium break-words">{payment.name}</span>
                <span className="block text-sm text-muted">
                  {formatPaymentAmount(payment)}
                  {payment.amount != null && " COP"}
                </span>
                <span className="block text-xs text-muted">
                  {formatDueDate(payment.due_date, true)} · {status.detail}
                </span>
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <StatusBadge status={status} />
                <ChevronRight size={18} className="text-subtle" aria-hidden />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

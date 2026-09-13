"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Pause,
  Pencil,
  Play,
  Repeat,
  RotateCcw,
  StickyNote,
  Trash2,
  Zap,
} from "lucide-react";
import { ModalShell } from "@/app/dashboard/modal-shell";
import { listPaymentHistory, type PaymentHistoryEntry } from "@/app/dashboard/actions";
import { usePaymentActions } from "@/app/dashboard/payment-actions";
import { LogoBadge, StatusBadge, formatPaymentAmount } from "@/app/dashboard/payment-parts";
import { RECURRENCE_LABEL, type Payment } from "@/app/dashboard/payment-types";
import { Spinner } from "@/app/dashboard/spinner";
import { colombiaToday } from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import { isOnTime } from "@/lib/metrics";
import { formatDueDate, paymentStatus, type PaymentStatus } from "@/lib/payment-status";

/**
 * Everything about one bill: its terms, its notes and pay link, how it has
 * actually been paid, and every action. On phones this is where actions
 * live, so the list cards can stay as clean as the mockup draws them.
 *
 * The parent passes the payment fresh from the server on every render (not
 * a snapshot taken when it opened), so marking it paid here flips the sheet
 * in place.
 */
export function PaymentDetailSheet({
  payment,
  todayStr,
  onClose,
}: {
  payment: Payment | undefined;
  todayStr: string;
  onClose: () => void;
}) {
  const status = payment ? paymentStatus(payment, todayStr) : null;

  return (
    <ModalShell
      open={Boolean(payment)}
      onClose={onClose}
      maxWidth="max-w-lg"
      titleSlot={
        payment && status ? (
          <div className="flex min-w-0 items-center gap-3">
            <LogoBadge logo={payment.logo} automatic={payment.is_automatic} size={48} />
            <div className="min-w-0 space-y-1">
              <h2 className="text-lg leading-tight font-semibold break-words">{payment.name}</h2>
              <StatusBadge status={status} />
            </div>
          </div>
        ) : undefined
      }
    >
      {payment && status && (
        <DetailBody key={payment.id} payment={payment} status={status} onClose={onClose} />
      )}
    </ModalShell>
  );
}

function DetailBody({
  payment,
  status,
  onClose,
}: {
  payment: Payment;
  status: PaymentStatus;
  onClose: () => void;
}) {
  const actions = usePaymentActions(payment);
  const [history, setHistory] = useState<PaymentHistoryEntry[] | null>(null);

  // Refetched when is_paid flips, so settling from this sheet shows up in
  // its own history straight away.
  useEffect(() => {
    let cancelled = false;
    listPaymentHistory(payment.id)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [payment.id, payment.is_paid]);

  const onTimeCount = history?.filter(isOnTime).length ?? 0;
  const amounts = (history ?? [])
    .map((entry) => entry.amount)
    .filter((amount): amount is number => amount != null);
  const average = amounts.length
    ? amounts.reduce((sum, amount) => sum + Number(amount), 0) / amounts.length
    : null;

  // Edit, reminders and delete each open their own dialog; closing this one
  // first keeps a single dialog on screen instead of stacking them.
  const handOff = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-3xl font-semibold tracking-tight">{formatPaymentAmount(payment)}</p>
        {payment.amount_is_variable && (
          <p className="mt-0.5 text-xs text-muted">Monto variable: es el último valor registrado.</p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-2.5 text-sm">
        <Info
          icon={<CalendarDays size={14} />}
          label="Vencimiento"
          value={formatDueDate(payment.due_date, true)}
          hint={status.detail}
        />
        <Info
          icon={<Repeat size={14} />}
          label="Frecuencia"
          value={RECURRENCE_LABEL[payment.recurrence] ?? payment.recurrence}
        />
        <Info
          icon={<Bell size={14} />}
          label="Aviso"
          value={
            payment.remind_days_before === 0
              ? "El mismo día"
              : `${payment.remind_days_before} día${payment.remind_days_before === 1 ? "" : "s"} antes`
          }
        />
        <Info
          icon={<Zap size={14} />}
          label="Forma de pago"
          value={payment.is_automatic ? "Débito automático" : "Manual"}
        />
      </dl>

      {payment.notes && (
        <div className="flex gap-2 rounded-xl bg-surface-2 p-3 text-sm">
          <StickyNote size={15} className="mt-0.5 shrink-0 text-muted" />
          <p className="break-words whitespace-pre-line">{payment.notes}</p>
        </div>
      )}

      {payment.payment_url && (
        <a
          href={payment.payment_url}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center justify-center gap-2 rounded-xl border border-accent/30 px-4 py-2.5 text-sm font-medium text-accent transition hover:bg-accent-soft"
        >
          <ExternalLink size={16} />
          Ir a pagar
        </a>
      )}

      <section>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="text-sm font-semibold">Historial de pagos</h3>
          {history && history.length > 0 && (
            <p className="text-xs text-muted">
              A tiempo {onTimeCount} de {history.length}
              {average != null && history.length > 1 && ` · Promedio ${formatCOP(average)}`}
            </p>
          )}
        </div>
        {history === null ? (
          <div className="flex justify-center py-4 text-muted">
            <Spinner size={18} />
          </div>
        ) : history.length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-3 py-3 text-center text-sm text-muted">
            Aún no has registrado pagos de esta cuenta.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {history.slice(0, 6).map((entry) => {
              const late = !isOnTime(entry);
              return (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p>{formatDueDate(colombiaToday(new Date(entry.completed_at)), true)}</p>
                    <p className="text-xs text-muted">Ciclo del {formatDueDate(entry.due_date, true)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">
                      {entry.amount != null ? formatCOP(Number(entry.amount)) : "—"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        late ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {late ? "Tarde" : "A tiempo"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="space-y-2">
        {payment.is_paid ? (
          <button
            type="button"
            onClick={actions.unmarkPaid}
            disabled={actions.pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-surface-2 disabled:opacity-50"
          >
            {actions.pending ? <Spinner size={16} /> : <RotateCcw size={16} />}
            Marcar como pendiente
          </button>
        ) : (
          <button
            type="button"
            onClick={actions.markPaid}
            disabled={actions.pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {actions.pending ? <Spinner size={16} /> : <CheckCircle2 size={16} />}
            Marcar como pagado
          </button>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SheetButton icon={<Pencil size={16} />} onClick={handOff(actions.edit)}>
            Editar
          </SheetButton>
          <SheetButton icon={<Bell size={16} />} onClick={handOff(actions.reminders)}>
            Avisos
          </SheetButton>
          <SheetButton
            icon={payment.is_paused ? <Play size={16} /> : <Pause size={16} />}
            onClick={actions.togglePause}
            disabled={actions.pending}
          >
            {payment.is_paused ? "Reanudar" : "Pausar"}
          </SheetButton>
          <SheetButton danger icon={<Trash2 size={16} />} onClick={handOff(() => actions.remove())}>
            Eliminar
          </SheetButton>
        </div>
      </div>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 font-medium break-words">{value}</dd>
      {hint && <dd className="text-xs text-muted">{hint}</dd>}
    </div>
  );
}

function SheetButton({
  icon,
  children,
  onClick,
  disabled = false,
  danger = false,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition disabled:opacity-50 ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-border text-foreground hover:bg-surface-2"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import { colombiaToday } from "@/lib/dates";
import { bucketPayments } from "@/lib/metrics";
import { filterEventsByScope, filterPaymentsByScope } from "@/lib/scope";
import { BADGE, formatDueDate, paymentStatus } from "@/lib/payment-status";
import { useScope, useScopeIndex } from "@/app/dashboard/sharing-context";
import { AddPaymentButton, PaymentsPreview } from "@/app/dashboard/payments-view";
import { MonthDonut, type DonutSegment } from "@/app/dashboard/inicio/month-donut";
import { KpiCardsSection } from "@/app/dashboard/inicio/kpi-cards";
import type { BreakdownRow } from "@/app/dashboard/breakdown-modal";
import type { Payment } from "@/app/dashboard/payment-types";
import { Reveal } from "@/app/dashboard/motion";

export type PaidEvent = {
  id: string;
  payment_id: string | null;
  name: string;
  amount: number | null;
  completed_at: string;
};

function TelegramCard({ connected }: { connected: boolean }) {
  return (
    <section className="card p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
          <Send size={18} />
        </span>
        <div>
          <h2 className="text-base font-semibold">Telegram</h2>
          <p className={`text-sm font-medium ${connected ? "text-emerald-600" : "text-muted"}`}>
            {connected ? "Conectado" : "Sin conectar"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">
        {connected
          ? "Recibirás tus recordatorios en Telegram y podrás marcarlos como pagados desde el mismo mensaje."
          : "Conéctalo para recibir recordatorios y marcar pagos desde el chat."}
      </p>
      <Link
        href="/dashboard/configuracion"
        prefetch={false}
        className="mt-4 flex w-full items-center justify-center rounded-xl border border-accent/30 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent-soft"
      >
        {connected ? "Gestionar" : "Conectar"}
      </Link>
    </section>
  );
}

/** A live payment, ready to drop straight into a breakdown modal. */
function paymentRow(payment: Payment, todayStr: string): BreakdownRow {
  const status = paymentStatus(payment, todayStr);
  return {
    id: payment.id,
    name: payment.name,
    logo: payment.logo,
    automatic: payment.is_automatic,
    amount: payment.amount,
    amountIsVariable: payment.amount_is_variable,
    dateLabel: `${formatDueDate(payment.due_date, true)} · ${status.detail}`,
    badgeLabel: status.label,
    badgeClass: status.badgeClass,
  };
}

/**
 * Everything on Inicio that answers to the Todos/Míos/Compartidos filter.
 *
 * The counts, the donut and the list are all derived here rather than on the
 * server: the server would have to be asked again on every switch, and all
 * the arithmetic needs is data the browser already holds.
 */
export function InicioView({
  payments: allPayments,
  paidThisMonth: allPaidThisMonth,
  todayStr,
  telegramConnected,
}: {
  payments: Payment[];
  paidThisMonth: PaidEvent[];
  todayStr: string;
  telegramConnected: boolean;
}) {
  const { scope } = useScope();
  // Built from every payment, not the filtered list: a completion whose
  // payment is out of scope still has to be classified to be excluded.
  const scopeIndex = useScopeIndex(allPayments);

  const payments = filterPaymentsByScope(allPayments, scope, scopeIndex);
  const paidThisMonth = filterEventsByScope(allPaidThisMonth, scope, scopeIndex);
  const { soon, overdue, later } = bucketPayments(payments, todayStr);

  // A settled event only stores its own snapshot (name/amount), not a logo -
  // borrow the current one from the live payment when it still exists, so
  // the list doesn't read as a wall of generic icons for no reason.
  const paymentById = new Map(allPayments.map((payment) => [payment.id, payment]));
  const paidRows: BreakdownRow[] = paidThisMonth.map((event) => ({
    id: event.payment_id,
    name: event.name,
    logo: paymentById.get(event.payment_id ?? "")?.logo ?? null,
    amount: event.amount,
    dateLabel: `Pagado el ${formatDueDate(colombiaToday(new Date(event.completed_at)), true)}`,
    badgeLabel: "Pagado",
    badgeClass: BADGE.paid,
  }));

  // Overdue first - it's the more urgent half of "pendientes".
  const pendingRows = [...overdue, ...later].map((payment) => paymentRow(payment, todayStr));
  const soonRows = soon.map((payment) => paymentRow(payment, todayStr));

  // Order matches the validated palette order, so neighbouring segments are
  // the pairs that were checked for colour-blind separation.
  const segments: DonutSegment[] = [
    { key: "paid", label: "Pagados", value: paidRows.length, color: "#10b981" },
    { key: "soon", label: "Próximos a vencer", value: soon.length, color: "#f59e0b" },
    { key: "overdue", label: "Vencidos", value: overdue.length, color: "#ef4444" },
    { key: "later", label: "Pendientes", value: later.length, color: "#6366f1" },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <KpiCardsSection
          paid={paidRows.length}
          paidRows={paidRows}
          pending={overdue.length + later.length}
          pendingHint={
            overdue.length
              ? `Incluye ${overdue.length} vencido${overdue.length === 1 ? "" : "s"}`
              : "Este mes"
          }
          pendingRows={pendingRows}
          soon={soon.length}
          soonRows={soonRows}
        />

        <Reveal delay={260} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Tus pagos</h2>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/pagos"
                prefetch={false}
                className="text-sm font-medium text-muted transition hover:text-foreground"
              >
                Ver todos
              </Link>
              <AddPaymentButton />
            </div>
          </div>
          {/* Handed the already-narrowed list: the preview never applies the
              scope itself, so it can't be applied twice. */}
          <PaymentsPreview payments={payments} todayStr={todayStr} />
        </Reveal>
      </div>

      <div className="space-y-6">
        <Reveal delay={200}>
          <MonthDonut segments={segments} />
        </Reveal>
        <Reveal delay={300}>
          <TelegramCard connected={telegramConnected} />
        </Reveal>
      </div>
    </div>
  );
}

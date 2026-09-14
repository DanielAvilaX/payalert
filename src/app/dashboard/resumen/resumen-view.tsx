"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  Scale,
  TrendingUp,
  Weight,
} from "lucide-react";
import { colombiaToday } from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import {
  categoryBreakdown,
  categoryPaymentsDetail,
  forecastWindow,
  forecastWindowDetail,
  incomeCommitment,
  isOnTime,
  monthlySpendSeries,
  onTimeRate,
  priceIncreases,
  recurringCommitment,
  recurringCommitmentDetail,
  shiftMonth,
  type IncomeBand,
} from "@/lib/metrics";
import { filterEventsByScope, filterPaymentsByScope } from "@/lib/scope";
import {
  BADGE,
  formatDueDate,
  formatMonthName,
  formatMonthShort,
  paymentStatus,
} from "@/lib/payment-status";
import { useScope, useScopeIndex } from "@/app/dashboard/sharing-context";
import { LogoBadge } from "@/app/dashboard/payment-parts";
import { RECURRENCE_LABEL, type Payment } from "@/app/dashboard/payment-types";
import { SpendTrend } from "@/app/dashboard/resumen/spend-trend";
import { KpiRow } from "@/app/dashboard/resumen/kpi-row";
import { CategoryCard } from "@/app/dashboard/resumen/category-card";
import { SectionHeading } from "@/app/dashboard/section-heading";
import { CountUp, Reveal } from "@/app/dashboard/motion";
import type { BreakdownRow } from "@/app/dashboard/breakdown-modal";

export const SERIES_MONTHS = 6;

export type ResumenEvent = {
  id: string;
  payment_id: string | null;
  name: string;
  amount: number | null;
  due_date: string;
  completed_at: string;
};

const BAND_STYLE: Record<IncomeBand, { fill: string; box: string; icon: typeof CheckCircle2; text: string }> = {
  healthy: {
    fill: "bg-accent",
    box: "bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
    text: "Dentro de la regla 50/30/20: tus pagos fijos no pasan de la mitad de tus ingresos.",
  },
  tight: {
    fill: "bg-amber-500",
    box: "bg-amber-50 text-amber-800",
    icon: AlertTriangle,
    text: "Por encima del 50% recomendado. Revisa tus pagos más pesados para ver dónde recortar.",
  },
  critical: {
    fill: "bg-red-500",
    box: "bg-red-50 text-red-800",
    icon: AlertTriangle,
    text: "Más del 70% de tus ingresos ya está comprometido: queda poco margen para imprevistos y ahorro.",
  },
};

/**
 * Every figure on Resumen, recomputed in the browser whenever the
 * Todos/Míos/Compartidos filter changes.
 *
 * This used to be a server component reading the filter out of the query
 * string, which meant each switch was a round trip that re-ran the page's
 * database queries. The metric functions are plain arithmetic over data the
 * browser already has, so doing it here makes switching instant - and the
 * server still does the one thing only it can, which is the fetching.
 */
export function ResumenView({
  payments: allPayments,
  events: allEvents,
  todayStr,
  monthlyIncome,
}: {
  payments: Payment[];
  events: ResumenEvent[];
  todayStr: string;
  monthlyIncome: number | null;
}) {
  const { scope } = useScope();
  const scopeIndex = useScopeIndex(allPayments);

  const payments = filterPaymentsByScope(allPayments, scope, scopeIndex);
  const events = filterEventsByScope(allEvents, scope, scopeIndex);
  const paymentById = new Map(allPayments.map((payment) => [payment.id, payment]));

  const series = monthlySpendSeries(events, todayStr, SERIES_MONTHS);
  const spentThisMonth = series.at(-1)?.total ?? 0;
  const spentLastMonth = series.at(-2)?.total ?? 0;
  const lastMonthName = formatMonthName(`${shiftMonth(todayStr.slice(0, 7), -1)}-01`);

  const commitment = recurringCommitment(payments);
  const forecast = forecastWindow(payments, todayStr, 30);
  const punctuality = onTimeRate(events);
  const categories = categoryBreakdown(payments);
  const topCategory = categories[0]?.monthly ?? 0;
  const increases = priceIncreases(events).slice(0, 5);
  const incomeShare = incomeCommitment(commitment.monthly, monthlyIncome);

  // --- The list behind every KPI and category, built from the same data
  // the totals above came from, so a card's number and what it expands
  // into can never quietly drift apart. ---

  /** A settled event, as a row - the "Pagado" pill, its own paid date. */
  function eventRow(event: ResumenEvent): BreakdownRow {
    return {
      id: event.payment_id,
      name: event.name,
      logo: paymentById.get(event.payment_id ?? "")?.logo ?? null,
      amount: event.amount,
      dateLabel: `Pagado el ${formatDueDate(colombiaToday(new Date(event.completed_at)), true)}`,
      badgeLabel: "Pagado",
      badgeClass: BADGE.paid,
    };
  }

  /** A recurring payment at its monthly-equivalent amount, with its live status. */
  function commitmentRow(payment: Payment, monthly: number): BreakdownRow {
    const status = paymentStatus(payment, todayStr);
    return {
      id: payment.id,
      name: payment.name,
      logo: payment.logo,
      automatic: payment.is_automatic,
      amount: monthly,
      dateLabel: `${RECURRENCE_LABEL[payment.recurrence] ?? payment.recurrence} · ${status.detail}`,
      badgeLabel: status.label,
      badgeClass: status.badgeClass,
    };
  }

  const currentMonth = todayStr.slice(0, 7);
  const spentRows = events
    .filter((event) => colombiaToday(new Date(event.completed_at)).slice(0, 7) === currentMonth)
    .map(eventRow);

  const commitmentItems = recurringCommitmentDetail(payments);
  const commitmentRows = commitmentItems.map(({ payment, monthly }) => commitmentRow(payment, monthly));
  // Same list, just the top five - "Compromiso mensual" and "más pesados"
  // can never disagree about which bills they mean.
  const heaviest = commitmentItems.slice(0, 5);

  const forecastItems = forecastWindowDetail(payments, todayStr, 30);
  const forecastRows: BreakdownRow[] = forecastItems.map((item) => {
    // Each occurrence gets the status its *own* due date implies - a future
    // cycle of an overdue bill reads as "En 12 días", not as overdue too.
    const status = paymentStatus({ is_paid: false, is_paused: false, due_date: item.dueDate }, todayStr);
    return {
      id: item.payment.id,
      name: item.payment.name,
      logo: item.payment.logo,
      automatic: item.payment.is_automatic,
      amount: item.amount,
      amountIsVariable: item.payment.amount_is_variable,
      dateLabel: `${formatDueDate(item.dueDate, true)} · ${status.detail}`,
      badgeLabel: status.label,
      badgeClass: status.badgeClass,
    };
  });

  const ontimeRows: BreakdownRow[] = events.map((event) => {
    const onTime = isOnTime(event);
    return {
      id: event.payment_id,
      name: event.name,
      logo: paymentById.get(event.payment_id ?? "")?.logo ?? null,
      amount: event.amount,
      dateLabel: `Pagado el ${formatDueDate(colombiaToday(new Date(event.completed_at)), true)} · vencía el ${formatDueDate(event.due_date, true)}`,
      badgeLabel: onTime ? "A tiempo" : "Tarde",
      badgeClass: onTime ? BADGE.paid : BADGE.soon,
    };
  });

  const categoryRowsMap: Record<string, BreakdownRow[]> = {};
  for (const [category, items] of categoryPaymentsDetail(payments)) {
    categoryRowsMap[category] = items.map(({ payment, monthly }) => commitmentRow(payment, monthly));
  }

  const recent = events.slice(0, 8);

  return (
    <>
      <KpiRow
        spentThisMonth={<CountUp value={spentThisMonth} />}
        spentHint={`${lastMonthName.charAt(0).toUpperCase()}${lastMonthName.slice(1)}: ${formatCOP(spentLastMonth)}`}
        spentRows={spentRows}
        commitmentMonthly={<CountUp value={commitment.monthly} />}
        commitmentHint={`≈ ${formatCOP(commitment.annual)} al año · ${commitment.count} pago${commitment.count === 1 ? "" : "s"} recurrente${commitment.count === 1 ? "" : "s"}`}
        commitmentRows={commitmentRows}
        forecastUpcoming={<CountUp value={forecast.upcoming} />}
        forecastHint={`${forecast.upcomingCount} cobro${forecast.upcomingCount === 1 ? "" : "s"} en camino`}
        forecastAlert={
          forecast.overdueCount
            ? `+ ${formatCOP(forecast.overdue)} vencido${forecast.overdueCount === 1 ? "" : "s"}`
            : undefined
        }
        forecastRows={forecastRows}
        onTimeValue={
          punctuality.rate === null ? "—" : <CountUp value={punctuality.rate * 100} format="percent" />
        }
        onTimeHint={
          punctuality.total
            ? `${punctuality.onTime} de ${punctuality.total} en los últimos ${SERIES_MONTHS} meses`
            : "Aún sin historial"
        }
        ontimeRows={ontimeRows}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Reveal>
          <section className="card h-full p-5">
            <SectionHeading
              icon={TrendingUp}
              title="Gasto por mes"
              subtitle={`Lo que marcaste como pagado en los últimos ${SERIES_MONTHS} meses`}
            />
            <SpendTrend
              points={series.map((bucket) => ({
                month: bucket.month,
                label: formatMonthShort(`${bucket.month}-01`),
                longLabel: formatMonthName(`${bucket.month}-01`),
                total: bucket.total,
                count: bucket.count,
              }))}
            />
          </section>
        </Reveal>

        <CategoryCard categories={categories} rowsByCategory={categoryRowsMap} topCategory={topCategory} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal>
          <section className="card h-full p-5">
            <SectionHeading
              icon={Scale}
              title="Ingresos comprometidos"
              subtitle="Qué parte de lo que ganas se llevan tus pagos fijos"
            />
            {incomeShare ? (
              (() => {
                const percent = Math.round(incomeShare.ratio * 100);
                const style = BAND_STYLE[incomeShare.band];
                const BandIcon = style.icon;
                return (
                  <>
                    <p className="text-3xl font-semibold tracking-tight">
                      <CountUp value={percent} format="percent" />
                    </p>
                    <p className="text-sm text-muted">
                      <CountUp value={commitment.monthly} /> de {formatCOP(monthlyIncome)} al mes
                    </p>
                    <div className="relative mt-4 h-2.5 rounded-full bg-accent-soft">
                      <div
                        className={`bar-grow-x h-full rounded-full ${style.fill}`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                      <div
                        aria-hidden
                        className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-foreground/40"
                        style={{ left: "50%" }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] text-muted">
                      <span>0%</span>
                      <span>50% recomendado</span>
                      <span>100%</span>
                    </div>
                    <p className={`mt-4 flex gap-2 rounded-xl p-3 text-sm ${style.box}`}>
                      <BandIcon size={16} className="mt-0.5 shrink-0" />
                      {style.text}
                    </p>
                  </>
                );
              })()
            ) : (
              <div className="rounded-xl bg-surface-2 p-4 text-sm">
                <p className="text-muted">
                  Agrega tu ingreso mensual y te mostramos qué porcentaje se va en pagos fijos. La
                  regla 50/30/20 recomienda que no pase del 50%.
                </p>
                <Link
                  href="/dashboard/configuracion"
                  prefetch={false}
                  className="mt-3 inline-flex font-medium text-accent hover:underline"
                >
                  Agregar ingreso
                </Link>
              </div>
            )}
          </section>
        </Reveal>

        <Reveal delay={100}>
          <section className="card h-full p-5">
            <SectionHeading
              icon={TrendingUp}
              title="Alzas detectadas"
              subtitle="Pagos que subieron 10% o más frente a la vez anterior"
            />
            {increases.length ? (
              <ul className="divide-y divide-border">
                {increases.map((increase) => (
                  <li key={increase.paymentId} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words">{increase.name}</p>
                      <p className="text-xs text-muted">
                        <CountUp value={increase.previous} /> → <CountUp value={increase.latest} />
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      <TrendingUp size={12} />+
                      <CountUp value={increase.change * 100} format="percent" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-sm text-muted">
                Ningún pago subió de precio en tus últimos registros.
              </p>
            )}
          </section>
        </Reveal>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal>
          <section className="card h-full p-5">
            <SectionHeading
              icon={Weight}
              title="Tus pagos más pesados"
              subtitle="Dónde mirar primero si quieres recortar"
            />
            {heaviest.length ? (
              <ul className="space-y-3">
                {heaviest.map(({ payment, monthly }, i) => (
                  <li key={payment.id} className="flex items-center gap-3">
                    <LogoBadge logo={payment.logo} automatic={payment.is_automatic} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium break-words">{payment.name}</p>
                      <p className="text-xs text-muted">
                        ≈ <CountUp value={monthly * 12} delay={i * 60} /> al año
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium">
                      <CountUp value={monthly} delay={i * 60} />
                      <span className="text-xs font-normal text-muted">/mes</span>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Todavía no tienes pagos recurrentes con monto.</p>
            )}
          </section>
        </Reveal>

        <Reveal delay={100}>
          <section className="card h-full p-5">
            <SectionHeading icon={History} title="Historial reciente" subtitle="Tus últimos pagos registrados" />
            {recent.length ? (
              <ul className="divide-y divide-border">
                {recent.map((event, i) => {
                  const late = !isOnTime(event);
                  return (
                    <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium break-words">{event.name}</p>
                        {/* Colombia's calendar rather than toLocaleDateString,
                            which would read whatever zone the viewer's device
                            happens to be in. */}
                        <p className="text-xs text-muted">
                          {formatDueDate(colombiaToday(new Date(event.completed_at)), true)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.amount != null && (
                          <span className="text-sm font-medium">
                            <CountUp value={Number(event.amount)} delay={i * 50} />
                          </span>
                        )}
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
            ) : (
              <p className="text-sm text-muted">Aún no has marcado ningún pago como pagado.</p>
            )}
          </section>
        </Reveal>
      </div>
    </>
  );
}

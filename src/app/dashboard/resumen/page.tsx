import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Download,
  History,
  Layers,
  Scale,
  TrendingUp,
  Wallet,
  Weight,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { colombiaToday } from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import {
  categoryBreakdown,
  forecastWindow,
  incomeCommitment,
  isOnTime,
  monthlyEquivalent,
  monthlySpendSeries,
  onTimeRate,
  priceIncreases,
  recurringCommitment,
  seriesStartISO,
  shiftMonth,
  type IncomeBand,
} from "@/lib/metrics";
import { formatDueDate, formatMonthName, formatMonthShort } from "@/lib/payment-status";
import { LogoBadge } from "@/app/dashboard/payment-parts";
import { SpendTrend } from "@/app/dashboard/resumen/spend-trend";
import { CountUp, Reveal } from "@/app/dashboard/resumen/motion";
import type { Payment } from "@/app/dashboard/payment-types";

const SERIES_MONTHS = 6;

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  alert,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  icon: LucideIcon;
  alert?: string;
}) {
  return (
    <div className="card h-full p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon size={18} />
        </span>
        <p className="text-sm font-medium text-muted">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight break-words">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
      {alert && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
          <AlertTriangle size={12} />
          {alert}
        </p>
      )}
    </div>
  );
}

function SectionHeading({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: LucideIcon }) {
  return (
    <div className="mb-4 flex items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon size={17} />
      </span>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

const BAND_STYLE: Record<IncomeBand, { fill: string; box: string; icon: LucideIcon; text: string }> = {
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

export default async function ResumenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "";
  const todayStr = colombiaToday();

  const [{ data: paymentsData }, { data: eventsData }] = await Promise.all([
    supabase.from("payments").select("*").eq("user_id", userId),
    supabase
      .from("payment_events")
      .select("id, payment_id, name, amount, due_date, completed_at")
      .eq("user_id", userId)
      .gte("completed_at", seriesStartISO(todayStr, SERIES_MONTHS))
      .order("completed_at", { ascending: false }),
  ]);

  const payments = (paymentsData ?? []) as Payment[];
  const events = eventsData ?? [];

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

  const monthlyIncome = (user?.user_metadata?.monthly_income as number | null | undefined) ?? null;
  const incomeShare = incomeCommitment(commitment.monthly, monthlyIncome);

  const heaviest = payments
    .filter((payment) => !payment.is_paused)
    .map((payment) => ({ payment, monthly: monthlyEquivalent(payment.amount, payment.recurrence) }))
    .filter(({ monthly }) => monthly > 0)
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, 5);

  const recent = events.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
          <p className="mt-1 text-sm text-muted">Cómo se mueve tu plata en tus pagos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/export?tipo=historial"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium transition hover:bg-surface-2"
          >
            <Download size={15} />
            Historial CSV
          </a>
          <a
            href="/api/export?tipo=pagos"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium transition hover:bg-surface-2"
          >
            <Download size={15} />
            Pagos CSV
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Reveal delay={0}>
          <StatTile
            label="Gastado este mes"
            value={<CountUp value={spentThisMonth} />}
            hint={`${lastMonthName.charAt(0).toUpperCase()}${lastMonthName.slice(1)}: ${formatCOP(spentLastMonth)}`}
            icon={Wallet}
          />
        </Reveal>
        <Reveal delay={70}>
          <StatTile
            label="Compromiso mensual"
            value={<CountUp value={commitment.monthly} />}
            hint={`≈ ${formatCOP(commitment.annual)} al año · ${commitment.count} pago${commitment.count === 1 ? "" : "s"} recurrente${commitment.count === 1 ? "" : "s"}`}
            icon={Scale}
          />
        </Reveal>
        <Reveal delay={140}>
          <StatTile
            label="Por pagar · 30 días"
            value={<CountUp value={forecast.upcoming} />}
            hint={`${forecast.upcomingCount} cobro${forecast.upcomingCount === 1 ? "" : "s"} en camino`}
            icon={CalendarRange}
            alert={
              forecast.overdueCount
                ? `+ ${formatCOP(forecast.overdue)} vencido${forecast.overdueCount === 1 ? "" : "s"}`
                : undefined
            }
          />
        </Reveal>
        <Reveal delay={210}>
          <StatTile
            label="Pagos a tiempo"
            value={
              punctuality.rate === null ? "—" : <CountUp value={punctuality.rate * 100} format="percent" />
            }
            hint={
              punctuality.total
                ? `${punctuality.onTime} de ${punctuality.total} en los últimos ${SERIES_MONTHS} meses`
                : "Aún sin historial"
            }
            icon={CheckCircle2}
          />
        </Reveal>
      </div>

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

        <Reveal delay={100}>
          <section className="card h-full p-5">
            <SectionHeading
              icon={Layers}
              title="Por categoría"
              subtitle="Costo mensual de tus pagos recurrentes"
            />
            {categories.length ? (
              <ul className="space-y-3.5">
                {categories.map((category, i) => (
                  <li key={category.category}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium break-words">{category.label}</span>
                      <span className="shrink-0">
                        <CountUp value={category.monthly} delay={i * 60} />
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="bar-grow-x h-full rounded-full bg-accent"
                          style={{
                            width: `${Math.max(2, (category.monthly / topCategory) * 100)}%`,
                            animationDelay: `${350 + i * 80}ms`,
                          }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-muted">
                        <CountUp value={category.share * 100} format="percent" delay={i * 60} />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                Agrega montos a tus pagos recurrentes para ver en qué se va tu plata.
              </p>
            )}
          </section>
        </Reveal>
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
                        {/* From Colombia's calendar, not toLocaleDateString, which
                            reads the server's UTC zone in a Server Component. */}
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
    </div>
  );
}

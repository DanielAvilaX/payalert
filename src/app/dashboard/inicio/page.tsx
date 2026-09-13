import Link from "next/link";
import { CalendarClock, CheckCircle2, Clock, Send, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { colombiaStartOfMonthISO, colombiaToday } from "@/lib/dates";
import { summarizeMonth } from "@/lib/metrics";
import { AddPaymentButton, PaymentsPreview } from "@/app/dashboard/payments-view";
import { MonthDonut, type DonutSegment } from "@/app/dashboard/inicio/month-donut";
import type { Payment } from "@/app/dashboard/payment-types";
import { Reveal } from "@/app/dashboard/motion";

const KPI_TONES = {
  paid: { card: "border-emerald-100 bg-emerald-50/60", icon: "bg-emerald-100 text-emerald-600" },
  pending: { card: "border-rose-100 bg-rose-50/60", icon: "bg-rose-100 text-rose-600" },
  soon: { card: "border-violet-100 bg-violet-50/60", icon: "bg-violet-100 text-violet-600" },
} as const;

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone: keyof typeof KPI_TONES;
}) {
  const classes = KPI_TONES[tone];
  return (
    <div className={`card h-full p-4 ${classes.card}`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${classes.icon}`}>
          <Icon size={18} />
        </span>
        <p className="text-sm font-medium text-muted">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
    </div>
  );
}

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

export default async function InicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [paymentsResult, paidResult, telegramResult] = await Promise.all([
    supabase.from("payments").select("*").order("due_date", { ascending: true }),
    supabase
      .from("payment_events")
      .select("id", { count: "exact", head: true })
      .gte("completed_at", colombiaStartOfMonthISO()),
    supabase
      .from("telegram_connections")
      .select("user_id")
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
  ]);

  const payments = (paymentsResult.data ?? []) as Payment[];
  const todayStr = colombiaToday();
  const summary = summarizeMonth(payments, paidResult.count ?? 0, todayStr);
  const openThisMonth = summary.later + summary.overdue;

  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim();
  const firstName = fullName?.split(/\s+/)[0] || user?.email?.split("@")[0] || "";

  // Order matches the validated palette order, so neighbouring segments are
  // the pairs that were checked for colour-blind separation.
  const segments: DonutSegment[] = [
    { key: "paid", label: "Pagados", value: summary.paid, color: "#10b981" },
    { key: "soon", label: "Próximos a vencer", value: summary.soon, color: "#f59e0b" },
    { key: "overdue", label: "Vencidos", value: summary.overdue, color: "#ef4444" },
    { key: "later", label: "Pendientes", value: summary.later, color: "#6366f1" },
  ];

  return (
    <div className="space-y-6">
      <Reveal>
        <h1 className="text-2xl font-semibold tracking-tight">
          ¡Hola{firstName ? `, ${firstName}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-muted">Aquí tienes un resumen de tus pagos.</p>
      </Reveal>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Reveal delay={60}>
              <KpiCard
                label="Pagos pagados"
                value={summary.paid}
                hint="Este mes"
                icon={CheckCircle2}
                tone="paid"
              />
            </Reveal>
            <Reveal delay={130}>
              <KpiCard
                label="Pendientes"
                value={openThisMonth}
                hint={
                  summary.overdue
                    ? `Incluye ${summary.overdue} vencido${summary.overdue === 1 ? "" : "s"}`
                    : "Este mes"
                }
                icon={Clock}
                tone="pending"
              />
            </Reveal>
            <Reveal delay={200}>
              <KpiCard
                label="Próximos a vencer"
                value={summary.soon}
                hint="En los próximos 7 días"
                icon={CalendarClock}
                tone="soon"
              />
            </Reveal>
          </div>

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
            <PaymentsPreview payments={payments} todayStr={todayStr} />
          </Reveal>
        </div>

        <div className="space-y-6">
          <Reveal delay={200}>
            <MonthDonut segments={segments} />
          </Reveal>
          <Reveal delay={300}>
            <TelegramCard connected={Boolean(telegramResult.data)} />
          </Reveal>
        </div>
      </div>
    </div>
  );
}

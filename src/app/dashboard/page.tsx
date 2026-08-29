import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TelegramConnect } from "@/app/dashboard/telegram-connect";
import { PaymentRow } from "@/app/dashboard/payment-row";
import { StatCards } from "@/app/dashboard/stat-cards";
import { Greeting } from "@/app/dashboard/greeting";
import { colombiaToday, colombiaStartOfMonthISO, daysUntil } from "@/lib/dates";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: payments }, { data: telegramConnection }, { count: completedThisMonth }] =
    await Promise.all([
      supabase.from("payments").select("*").order("due_date", { ascending: true }),
      supabase
        .from("telegram_connections")
        .select("user_id")
        .eq("user_id", user!.id)
        .maybeSingle(),
      supabase
        .from("payment_events")
        .select("id", { count: "exact", head: true })
        .gte("completed_at", colombiaStartOfMonthISO()),
    ]);

  const unpaid = (payments ?? []).filter((p) => !p.is_paid);

  const todayStr = colombiaToday();
  const upcomingCount = unpaid.filter((p) => daysUntil(p.due_date, todayStr) <= 7).length;

  // Approximate monthly-equivalent spend: a bimonthly/quarterly/semiannual
  // payment counts as its amount divided by how many months it spans.
  const MONTHLY_EQUIVALENT_DIVISOR: Record<string, number> = {
    monthly: 1,
    bimonthly: 2,
    quarterly: 3,
    semiannual: 6,
  };
  const monthlyTotal = (payments ?? []).reduce((sum, p) => {
    const divisor = MONTHLY_EQUIVALENT_DIVISOR[p.recurrence];
    return divisor ? sum + (p.amount ?? 0) / divisor : sum;
  }, 0);

  const activeReminders = telegramConnection ? unpaid.length : 0;

  const upcoming = unpaid.slice(0, 5);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <Greeting name={displayName} />
        <p className="text-sm text-muted">
          Crea un recordatorio de pago y recibe alertas en Telegram.
        </p>
      </div>

      <TelegramConnect connected={!!telegramConnection} />

      <StatCards
        upcomingCount={upcomingCount}
        monthlyTotal={monthlyTotal}
        activeReminders={activeReminders}
        completedThisMonth={completedThisMonth ?? 0}
      />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Calendar size={18} />
            </span>
            Próximos pagos
          </h2>
          <Link
            href="/dashboard/pagos"
            className="flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
          >
            Ver todos
            <ArrowRight size={16} />
          </Link>
        </div>

        {upcoming.length ? (
          <ul className="flex flex-col gap-2">
            {upcoming.map((payment, i) => (
              <PaymentRow key={payment.id} payment={payment} index={i} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Todavía no tienes pagos.</p>
        )}
      </section>
    </div>
  );
}

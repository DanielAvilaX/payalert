import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TelegramConnect } from "@/app/dashboard/telegram-connect";
import { PaymentRow } from "@/app/dashboard/payment-row";
import { StatCards } from "@/app/dashboard/stat-cards";
import { Greeting } from "@/app/dashboard/greeting";

function startOfMonthISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

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
        .gte("completed_at", startOfMonthISO()),
    ]);

  const unpaid = (payments ?? []).filter((p) => !p.is_paid);

  const inSevenDays = new Date();
  inSevenDays.setUTCDate(inSevenDays.getUTCDate() + 7);
  const upcomingCount = unpaid.filter((p) => new Date(p.due_date) <= inSevenDays).length;

  const monthlyTotal = (payments ?? [])
    .filter((p) => p.recurrence === "monthly")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

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
          <h2 className="text-lg font-medium">Próximos pagos</h2>
          <Link
            href="/dashboard/pagos"
            className="flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
          >
            Ver todos
            <ArrowRight size={14} />
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

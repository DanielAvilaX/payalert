import { createClient } from "@/lib/supabase/server";
import { TelegramConnect } from "@/app/dashboard/telegram-connect";
import { PaymentForm } from "@/app/dashboard/payment-form";
import { PaymentRow } from "@/app/dashboard/payment-row";
import { StatCards } from "@/app/dashboard/stat-cards";

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
  const upcomingCount = unpaid.filter(
    (p) => new Date(p.due_date) <= inSevenDays
  ).length;

  const monthlyTotal = (payments ?? [])
    .filter((p) => p.recurrence === "monthly")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const activeReminders = telegramConnection ? unpaid.length : 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo pago</h1>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section id="nuevo-pago" className="glass-panel rounded-xl p-5">
          <h2 className="mb-4 text-lg font-medium">Información del pago</h2>
          <PaymentForm />
        </section>

        <section id="tus-pagos" className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Tus pagos</h2>
          {payments?.length ? (
            <ul className="flex flex-col gap-2">
              {payments.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Todavía no tienes pagos.</p>
          )}
        </section>
      </div>
    </div>
  );
}

import { Bell, Settings, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TelegramConnect } from "@/app/dashboard/telegram-connect";
import { DefaultReminderForm } from "@/app/dashboard/default-reminder-form";
import { IncomeForm } from "@/app/dashboard/income-form";
import { RulesOverview, type RuleWithPayment } from "@/app/dashboard/rules-overview";

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
        {icon}
      </span>
      {children}
    </h2>
  );
}

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: rules }, { data: telegramConnection }] = await Promise.all([
    supabase
      .from("reminder_rules")
      .select("*, payments(name, logo)")
      .order("created_at", { ascending: false }),
    supabase
      .from("telegram_connections")
      .select("user_id")
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
  ]);

  const defaultDays =
    (user?.user_metadata?.default_remind_days_before as number | undefined) ?? 3;
  const monthlyIncome = (user?.user_metadata?.monthly_income as number | null | undefined) ?? null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="hidden lg:block">
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="mt-1 text-sm text-muted">
          Telegram, preferencias y reglas personalizadas de recordatorios.
        </p>
      </div>

      <TelegramConnect connected={Boolean(telegramConnection)} />

      <section className="card p-5 sm:p-6">
        <SectionTitle icon={<Settings size={18} />}>Preferencias generales</SectionTitle>
        <DefaultReminderForm defaultValue={defaultDays} />
      </section>

      <section className="card p-5 sm:p-6">
        <SectionTitle icon={<Wallet size={18} />}>Tus finanzas</SectionTitle>
        <IncomeForm defaultValue={monthlyIncome} />
      </section>

      <section className="card p-5 sm:p-6">
        <SectionTitle icon={<Bell size={18} />}>Reglas personalizadas</SectionTitle>
        <p className="mb-4 text-sm text-muted">
          Cada pago puede tener su propio horario escalonado de avisos (desde el detalle del pago,
          en &quot;Avisos&quot;). Aquí ves y administras todas las reglas que ya creaste.
        </p>
        <RulesOverview rules={(rules ?? []) as RuleWithPayment[]} />
      </section>
    </div>
  );
}

import { Settings, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TelegramConnect } from "@/app/dashboard/telegram-connect";
import { DefaultReminderForm } from "@/app/dashboard/default-reminder-form";
import { RulesOverview, type RuleWithPayment } from "@/app/dashboard/rules-overview";

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
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);

  const defaultDays =
    (user?.user_metadata?.default_remind_days_before as number | undefined) ?? 3;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="hidden lg:block">
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted">
          Preferencias generales y reglas personalizadas de recordatorios.
        </p>
      </div>

      <TelegramConnect connected={!!telegramConnection} />

      <section className="card animate-pop-in rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Settings size={18} />
          </span>
          Preferencias generales
        </h2>
        <DefaultReminderForm defaultValue={defaultDays} />
      </section>

      <section className="card animate-pop-in rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Bell size={18} />
          </span>
          Reglas personalizadas
        </h2>
        <p className="mb-4 text-xs text-muted">
          Cada pago puede tener su propio horario escalonado de avisos (ícono 🔔 en la lista de
          pagos). Aquí ves y administras todas las reglas que ya creaste, en un solo lugar.
        </p>
        <RulesOverview rules={(rules ?? []) as RuleWithPayment[]} />
      </section>
    </div>
  );
}

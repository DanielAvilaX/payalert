import { colombiaStartOfMonthISO, colombiaToday } from "@/lib/dates";
import {
  getCurrentUser,
  getPayments,
  getSupabase,
  getTelegramConnection,
} from "@/lib/dashboard-data";
import { ScopeFilter } from "@/app/dashboard/scope-filter";
import { InicioView, type PaidEvent } from "@/app/dashboard/inicio/inicio-view";
import type { Payment } from "@/app/dashboard/payment-types";
import { Reveal } from "@/app/dashboard/motion";

export default async function InicioPage() {
  const supabase = await getSupabase();

  // Only the completions are new work here: the user, the payments and the
  // Telegram link were all resolved by the layout already. Everything is
  // handed to the view unfiltered - the Todos/Míos/Compartidos switch runs
  // in the browser, so it never comes back here.
  const [user, payments, telegramConnection, paidEventsResult] = await Promise.all([
    getCurrentUser(),
    getPayments(),
    getTelegramConnection(),
    // Full rows, not just a count: the "Pagos pagados" KPI opens this exact
    // list, so the number on the card and what it expands into can't drift.
    supabase
      .from("payment_events")
      .select("id, payment_id, name, amount, completed_at")
      .gte("completed_at", colombiaStartOfMonthISO())
      .order("completed_at", { ascending: false }),
  ]);

  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim();
  const firstName = fullName?.split(/\s+/)[0] || user?.email?.split("@")[0] || "";

  return (
    <div className="space-y-6">
      <Reveal>
        <h1 className="text-2xl font-semibold tracking-tight">
          ¡Hola{firstName ? `, ${firstName}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-muted">Aquí tienes un resumen de tus pagos.</p>
      </Reveal>

      <ScopeFilter />

      <InicioView
        payments={payments as Payment[]}
        paidThisMonth={(paidEventsResult.data ?? []) as PaidEvent[]}
        todayStr={colombiaToday()}
        telegramConnected={Boolean(telegramConnection)}
      />
    </div>
  );
}

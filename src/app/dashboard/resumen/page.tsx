import { Download } from "lucide-react";
import { getCurrentUser, getPayments, getSupabase } from "@/lib/dashboard-data";
import { colombiaToday } from "@/lib/dates";
import { SUMMARY_MONTHS, seriesStartISO } from "@/lib/metrics";
import { ScopeFilter } from "@/app/dashboard/scope-filter";
import { ResumenView, type ResumenEvent } from "@/app/dashboard/resumen/resumen-view";
import type { Payment } from "@/app/dashboard/payment-types";

export default async function ResumenPage() {
  const supabase = await getSupabase();
  const todayStr = colombiaToday();

  // Only the completions are new work here - the rest was already resolved
  // by the layout. No owner filter on them: RLS already limits this to what
  // the account can see, and on a shared payment the completions are filed
  // under its owner, so pinning to user_id would have hidden every shared
  // bill's money from the person it was shared with.
  const [user, payments, { data: events }] = await Promise.all([
    getCurrentUser(),
    getPayments(),
    supabase
      .from("payment_events")
      .select("id, payment_id, name, amount, due_date, completed_at")
      .gte("completed_at", seriesStartISO(todayStr, SUMMARY_MONTHS))
      .order("completed_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
          <p className="mt-1 text-sm text-muted">Cómo se mueve tu plata en tus pagos.</p>
        </div>
        <ScopeFilter className="w-full lg:w-auto lg:overflow-visible" />
        <div className="flex flex-wrap gap-2 max-lg:w-full">
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

      {/* Everything below answers to the scope filter, so it's computed in
          the browser from the data fetched above. */}
      <ResumenView
        payments={payments as Payment[]}
        events={(events ?? []) as ResumenEvent[]}
        todayStr={todayStr}
        monthlyIncome={(user?.user_metadata?.monthly_income as number | null | undefined) ?? null}
      />
    </div>
  );
}

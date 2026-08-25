import Image from "next/image";
import { PieChart, History, TrendingUp } from "lucide-react";
import { logoConfig } from "@/lib/logos";
import { createClient } from "@/lib/supabase/server";

function startOfMonthISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function LogoIcon({ logo, size = 40 }: { logo: string | null; size?: number }) {
  const cfg = logoConfig(logo);
  if (cfg.icon) {
    const Icon = cfg.icon;
    return (
      <div
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-full bg-white/10"
      >
        <Icon size={size * 0.55} />
      </div>
    );
  }
  return (
    <Image
      src={cfg.src!}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}

export default async function ResumenPage() {
  const supabase = await createClient();

  const [{ data: payments }, { data: recentEvents }, { data: monthEvents }] = await Promise.all([
    supabase.from("payments").select("*"),
    supabase
      .from("payment_events")
      .select("*")
      .order("completed_at", { ascending: false })
      .limit(10),
    supabase
      .from("payment_events")
      .select("amount")
      .gte("completed_at", startOfMonthISO()),
  ]);

  const spentThisMonth = (monthEvents ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0);

  const byLogo = new Map<string, { total: number; count: number }>();
  for (const p of payments ?? []) {
    const key = p.logo ?? "money";
    const entry = byLogo.get(key) ?? { total: 0, count: 0 };
    entry.total += p.amount ?? 0;
    entry.count += 1;
    byLogo.set(key, entry);
  }
  const breakdown = Array.from(byLogo.entries()).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Resumen</h1>
        <p className="text-sm text-muted">Un vistazo más detallado a tus pagos.</p>
      </div>

      <div className="glass-panel animate-pop-in flex items-center gap-5 rounded-2xl p-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg">
          <TrendingUp size={26} />
        </div>
        <div>
          <p className="text-sm text-muted">Gastado este mes</p>
          <p className="font-heading text-3xl font-semibold">
            ${spentThisMonth.toLocaleString("es-CO")}
          </p>
          <p className="text-xs text-muted">
            Suma de los pagos marcados como pagados en{" "}
            {new Date().toLocaleDateString("es-CO", { month: "long" })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="glass-panel animate-pop-in rounded-2xl p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-medium">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <PieChart size={18} />
            </span>
            Por servicio
          </h2>
          {breakdown.length ? (
            <ul className="flex flex-col gap-4">
              {breakdown.map(([logo, { total, count }]) => (
                <li key={logo} className="flex items-center gap-3">
                  <LogoIcon logo={logo} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{logoConfig(logo).label}</p>
                    <p className="text-xs text-muted">
                      {count} pago{count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="shrink-0 font-medium">${total.toLocaleString("es-CO")}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Todavía no tienes pagos.</p>
          )}
        </section>

        <section className="glass-panel animate-pop-in rounded-2xl p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-medium">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <History size={18} />
            </span>
            Historial reciente
          </h2>
          {recentEvents?.length ? (
            <ul className="flex flex-col gap-4">
              {recentEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{event.name}</p>
                    <p className="text-xs text-muted">
                      {new Date(event.completed_at).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  {event.amount != null && (
                    <p className="shrink-0 font-medium">
                      ${Number(event.amount).toLocaleString("es-CO")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Aún no has marcado ningún pago como pagado.</p>
          )}
        </section>
      </div>
    </div>
  );
}

import { Wallet, Calendar, Bell, BarChart3, type LucideIcon } from "lucide-react";

type Stat = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  bg: string;
  fg: string;
};

export function StatCards({
  upcomingCount,
  monthlyTotal,
  activeReminders,
  completedThisMonth,
}: {
  upcomingCount: number;
  monthlyTotal: number;
  activeReminders: number;
  completedThisMonth: number;
}) {
  const stats: Stat[] = [
    {
      label: "Próximos pagos",
      value: String(upcomingCount),
      hint: "Esta semana",
      icon: Wallet,
      bg: "bg-emerald-500/15",
      fg: "text-emerald-400",
    },
    {
      label: "Total mensual",
      value: `$${monthlyTotal.toLocaleString("es-CO")}`,
      hint: "En pagos mensuales",
      icon: Calendar,
      bg: "bg-amber-500/15",
      fg: "text-amber-400",
    },
    {
      label: "Recordatorios activos",
      value: String(activeReminders),
      hint: "En Telegram",
      icon: Bell,
      bg: "bg-blue-500/15",
      fg: "text-blue-400",
    },
    {
      label: "Pagos completados",
      value: String(completedThisMonth),
      hint: "Este mes",
      icon: BarChart3,
      bg: "bg-violet-500/15",
      fg: "text-violet-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(({ label, value, hint, icon: Icon, bg, fg }) => (
        <div key={label} className="rounded-xl border border-border bg-surface p-4">
          <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
            <Icon size={18} className={fg} />
          </div>
          <p className="text-sm text-muted">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
          <p className="text-xs text-muted">{hint}</p>
        </div>
      ))}
    </div>
  );
}

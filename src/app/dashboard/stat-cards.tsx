import { Wallet, Calendar, Bell, BarChart3, type LucideIcon } from "lucide-react";

type Stat = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  bg: string;
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
      bg: "bg-emerald-500",
    },
    {
      label: "Total mensual (aprox)",
      value: `$${monthlyTotal.toLocaleString("es-CO")}`,
      hint: "En pagos mensuales",
      icon: Calendar,
      bg: "bg-amber-500",
    },
    {
      label: "Recordatorios activos",
      value: String(activeReminders),
      hint: "En Telegram",
      icon: Bell,
      bg: "bg-blue-500",
    },
    {
      label: "Pagos completados",
      value: String(completedThisMonth),
      hint: "Este mes",
      icon: BarChart3,
      bg: "bg-violet-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ label, value, hint, icon: Icon, bg }, i) => (
        <div
          key={label}
          className="glass-panel animate-pop-in flex items-center gap-4 rounded-2xl p-5"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white shadow-lg ${bg}`}
          >
            <Icon size={26} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-muted">{label}</p>
            <p className="font-heading text-2xl font-semibold">{value}</p>
            <p className="truncate text-xs text-muted">{hint}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

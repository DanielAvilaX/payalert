import { Wallet, Calendar, type LucideIcon } from "lucide-react";

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
}: {
  upcomingCount: number;
  monthlyTotal: number;
}) {
  const stats: Stat[] = [
    {
      label: "Próximos",
      value: String(upcomingCount),
      hint: "Esta semana",
      icon: Wallet,
      bg: "bg-emerald-500",
    },
    {
      label: "Total mensual",
      value: `$${monthlyTotal.toLocaleString("es-CO")}`,
      hint: "Aprox., pagos mensuales",
      icon: Calendar,
      bg: "bg-amber-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <p className="text-sm text-muted">{label}</p>
            <p className="font-heading text-2xl font-semibold break-words">{value}</p>
            <p className="text-xs text-muted">{hint}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

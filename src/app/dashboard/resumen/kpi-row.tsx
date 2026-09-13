"use client";

import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Scale,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/app/dashboard/motion";
import { BreakdownModal, type BreakdownRow } from "@/app/dashboard/breakdown-modal";

type Bucket = "spent" | "commitment" | "forecast" | "ontime";

const COPY: Record<Bucket, { title: string; subtitle: string; empty: string }> = {
  spent: {
    title: "Gastado este mes",
    subtitle: "Lo que marcaste como pagado este mes",
    empty: "Aún no has marcado ningún pago este mes.",
  },
  commitment: {
    title: "Compromiso mensual",
    subtitle: "Tus pagos recurrentes activos, llevados a un promedio mensual",
    empty: "Todavía no tienes pagos recurrentes con monto.",
  },
  forecast: {
    title: "Por pagar en 30 días",
    subtitle: "Cada cobro que vence en las próximas 4 semanas",
    empty: "Nada por pagar en los próximos 30 días.",
  },
  ontime: {
    title: "Pagos a tiempo",
    subtitle: "Tus últimos 6 meses de pagos, marcados a tiempo o tarde",
    empty: "Aún no tienes historial de pagos.",
  },
};

function StatButton({
  label,
  value,
  hint,
  icon: Icon,
  alert,
  delay,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  icon: LucideIcon;
  alert?: string;
  delay: number;
  onClick: () => void;
}) {
  return (
    <Reveal delay={delay}>
      <button
        type="button"
        onClick={onClick}
        className="card group h-full w-full p-4 text-left transition hover:shadow-md active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon size={18} />
          </span>
          <ChevronRight
            size={16}
            className="mt-1.5 shrink-0 text-subtle transition group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
        <p className="mt-2.5 text-sm font-medium text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight break-words">{value}</p>
        <p className="mt-0.5 text-xs text-muted">{hint}</p>
        {alert && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
            <AlertTriangle size={12} />
            {alert}
          </p>
        )}
      </button>
    </Reveal>
  );
}

/**
 * Resumen's four headline numbers, each a button that opens the actual list
 * behind it - every one of these is a sum or a count of something real, so
 * "what does this add up to" is always one tap away instead of a dead end.
 */
export function KpiRow({
  spentThisMonth,
  spentHint,
  spentRows,
  commitmentMonthly,
  commitmentHint,
  commitmentRows,
  forecastUpcoming,
  forecastHint,
  forecastAlert,
  forecastRows,
  onTimeValue,
  onTimeHint,
  ontimeRows,
}: {
  spentThisMonth: ReactNode;
  spentHint: string;
  spentRows: BreakdownRow[];
  commitmentMonthly: ReactNode;
  commitmentHint: string;
  commitmentRows: BreakdownRow[];
  forecastUpcoming: ReactNode;
  forecastHint: string;
  forecastAlert?: string;
  forecastRows: BreakdownRow[];
  onTimeValue: ReactNode;
  onTimeHint: string;
  ontimeRows: BreakdownRow[];
}) {
  const [open, setOpen] = useState<Bucket | null>(null);
  const rowsByBucket: Record<Bucket, BreakdownRow[]> = {
    spent: spentRows,
    commitment: commitmentRows,
    forecast: forecastRows,
    ontime: ontimeRows,
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatButton
          delay={0}
          label="Gastado este mes"
          value={spentThisMonth}
          hint={spentHint}
          icon={Wallet}
          onClick={() => setOpen("spent")}
        />
        <StatButton
          delay={70}
          label="Compromiso mensual"
          value={commitmentMonthly}
          hint={commitmentHint}
          icon={Scale}
          onClick={() => setOpen("commitment")}
        />
        <StatButton
          delay={140}
          label="Por pagar · 30 días"
          value={forecastUpcoming}
          hint={forecastHint}
          icon={CalendarRange}
          alert={forecastAlert}
          onClick={() => setOpen("forecast")}
        />
        <StatButton
          delay={210}
          label="Pagos a tiempo"
          value={onTimeValue}
          hint={onTimeHint}
          icon={CheckCircle2}
          onClick={() => setOpen("ontime")}
        />
      </div>

      <BreakdownModal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? COPY[open].title : ""}
        subtitle={open ? COPY[open].subtitle : ""}
        rows={open ? rowsByBucket[open] : []}
        emptyText={open ? COPY[open].empty : ""}
      />
    </>
  );
}

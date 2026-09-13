"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, ChevronRight, Clock, type LucideIcon } from "lucide-react";
import { CountUp, Reveal } from "@/app/dashboard/motion";
import { BreakdownModal, type BreakdownRow } from "@/app/dashboard/breakdown-modal";

const TONES = {
  paid: { card: "border-emerald-100 bg-emerald-50/60", icon: "bg-emerald-100 text-emerald-600" },
  pending: { card: "border-rose-100 bg-rose-50/60", icon: "bg-rose-100 text-rose-600" },
  soon: { card: "border-violet-100 bg-violet-50/60", icon: "bg-violet-100 text-violet-600" },
} as const;

type Bucket = "paid" | "pending" | "soon";

const COPY: Record<Bucket, { title: string; subtitle: string; empty: string }> = {
  paid: {
    title: "Pagos pagados",
    subtitle: "Lo que marcaste como pagado en lo que va del mes",
    empty: "Todavía no has marcado ningún pago este mes.",
  },
  pending: {
    title: "Pendientes",
    subtitle: "Pagos abiertos de este mes, incluidos los vencidos",
    empty: "No tienes pagos pendientes.",
  },
  soon: {
    title: "Próximos a vencer",
    subtitle: "Vencen en los próximos 7 días",
    empty: "Nada vence en los próximos 7 días.",
  },
};

function KpiButton({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  onClick: () => void;
}) {
  const classes = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card group h-full w-full p-4 text-left transition hover:shadow-md active:scale-[0.99] ${classes.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${classes.icon}`}>
          <Icon size={18} />
        </span>
        <ChevronRight
          size={16}
          className="mt-1.5 shrink-0 text-subtle transition group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
      <p className="mt-2.5 text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">
        <CountUp value={value} format="number" />
      </p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
    </button>
  );
}

/**
 * Inicio's three top KPIs, each a button that opens the actual list it's
 * counting - the buckets already come straight from `bucketPayments`, so
 * the number on the card and the rows behind it can never disagree.
 */
export function KpiCardsSection({
  paid,
  paidRows,
  pending,
  pendingHint,
  pendingRows,
  soon,
  soonRows,
}: {
  paid: number;
  paidRows: BreakdownRow[];
  pending: number;
  pendingHint: string;
  pendingRows: BreakdownRow[];
  soon: number;
  soonRows: BreakdownRow[];
}) {
  const [open, setOpen] = useState<Bucket | null>(null);
  const rowsByBucket: Record<Bucket, BreakdownRow[]> = {
    paid: paidRows,
    pending: pendingRows,
    soon: soonRows,
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Reveal delay={60}>
          <KpiButton
            label="Pagos pagados"
            value={paid}
            hint="Este mes"
            icon={CheckCircle2}
            tone="paid"
            onClick={() => setOpen("paid")}
          />
        </Reveal>
        <Reveal delay={130}>
          <KpiButton
            label="Pendientes"
            value={pending}
            hint={pendingHint}
            icon={Clock}
            tone="pending"
            onClick={() => setOpen("pending")}
          />
        </Reveal>
        <Reveal delay={200}>
          <KpiButton
            label="Próximos a vencer"
            value={soon}
            hint="En los próximos 7 días"
            icon={CalendarClock}
            tone="soon"
            onClick={() => setOpen("soon")}
          />
        </Reveal>
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

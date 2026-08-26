"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import { PaymentRow, type Payment } from "@/app/dashboard/payment-row";

type FilterKey = "all" | "pending" | "paid";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "paid", label: "Pagados" },
];

export function PaymentsList({ payments }: { payments: Payment[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const bySearch = query.trim()
    ? payments.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : payments;

  const byFilter = bySearch.filter((p) => {
    if (filter === "pending") return !p.is_paid;
    if (filter === "paid") return p.is_paid;
    return true;
  });

  // Pending first (soonest due date first), paid ones sink to the bottom.
  const sorted = [...byFilter].sort((a, b) => {
    if (a.is_paid !== b.is_paid) return a.is_paid ? 1 : -1;
    return a.due_date.localeCompare(b.due_date);
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar pago..."
          className="glass-input w-full rounded-lg py-2 pr-3 pl-9 text-sm text-foreground placeholder:text-muted"
        />
      </div>

      <div className="flex gap-1.5">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
              filter === key
                ? "bg-accent/15 text-accent"
                : "text-muted hover:bg-white/5 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sorted.length ? (
        <ul className="scrollbar-glass flex max-h-[30rem] flex-col gap-2 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {sorted.map((payment, i) => (
              <PaymentRow key={payment.id} payment={payment} index={i} />
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="text-sm text-muted">
          {query ? "Ningún pago coincide con tu búsqueda." : "No hay pagos en este filtro."}
        </p>
      )}
    </div>
  );
}

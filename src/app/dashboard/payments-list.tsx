"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { PaymentRow, type Payment } from "@/app/dashboard/payment-row";

type FilterKey = "all" | "pending" | "paid";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "paid", label: "Pagados" },
];

const PAGE_SIZE = 10;

export function PaymentsList({ payments }: { payments: Payment[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Land back on page 1 whenever the search/filter changes, so it never
  // leaves you stranded on a now-empty page. Adjusting state during render
  // (rather than in an effect) avoids an extra render pass.
  const filterKey = `${query}|${filter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-3">
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
        <>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {pageItems.map((payment, i) => (
                <PaymentRow key={payment.id} payment={payment} index={i} />
              ))}
            </AnimatePresence>
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
                className="rounded-lg p-2 text-muted transition hover:bg-white/10 hover:text-foreground active:scale-95 disabled:opacity-40"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs text-muted">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Página siguiente"
                className="rounded-lg p-2 text-muted transition hover:bg-white/10 hover:text-foreground active:scale-95 disabled:opacity-40"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted">
          {query ? "Ningún pago coincide con tu búsqueda." : "No hay pagos en este filtro."}
        </p>
      )}
    </div>
  );
}

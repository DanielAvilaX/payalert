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

export function PaymentsList({
  payments,
  todayStr,
}: {
  payments: Payment[];
  todayStr: string;
}) {
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
                <PaymentRow
                  key={payment.id}
                  payment={payment}
                  index={i}
                  todayStr={todayStr}
                />
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
        <div className="glass-panel flex flex-col items-center gap-2 rounded-2xl px-6 py-10 text-center">
          <p className="text-sm">
            {query
              ? `Ningún pago coincide con "${query.trim()}".`
              : payments.length === 0
                ? "Todavía no tienes pagos registrados."
                : "No hay pagos en este filtro."}
          </p>
          <p className="text-xs text-muted">
            {query
              ? "Prueba con otra palabra o revisa los filtros."
              : payments.length === 0
                ? 'Usa "Agregar pago" para registrar el primero y empezar a recibir avisos en Telegram.'
                : "Cambia de filtro para ver el resto."}
          </p>
        </div>
      )}
    </div>
  );
}

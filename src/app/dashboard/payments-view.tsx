"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { sortPayments, type Payment } from "@/app/dashboard/payment-types";
import { PaymentCards, PaymentsTable } from "@/app/dashboard/payments-table";
import { PaymentDetailSheet } from "@/app/dashboard/payment-detail-sheet";
import { usePaymentUI } from "@/app/dashboard/payment-ui-context";
import { Reveal } from "@/app/dashboard/motion";

type FilterKey = "all" | "pending" | "paid";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "paid", label: "Pagados" },
];

const PAGE_SIZE = 10;

export function AddPaymentButton({ className = "" }: { className?: string }) {
  const ui = usePaymentUI();
  return (
    <button
      type="button"
      onClick={ui.openCreate}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-500/20 transition hover:bg-accent-dark active:scale-[0.98] ${className}`}
    >
      <Plus size={16} />
      Agregar pago
    </button>
  );
}

/**
 * Which payment's detail sheet is open. `initialDetailId` comes from the
 * `?pago=` query - the Telegram "Ver detalles" button and the notification
 * bell both land here - and it's re-read when that query changes, since a
 * client navigation to a new ?pago= re-renders this without remounting it.
 */
function useDetail(initialDetailId?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const [detailId, setDetailId] = useState<string | null>(initialDetailId ?? null);
  const [seenInitial, setSeenInitial] = useState(initialDetailId);

  if (initialDetailId !== seenInitial) {
    setSeenInitial(initialDetailId);
    setDetailId(initialDetailId ?? null);
  }

  function close() {
    setDetailId(null);
    // Drop ?pago= so a refresh doesn't pop the sheet open again.
    if (initialDetailId) router.replace(pathname, { scroll: false });
  }

  return { detailId, open: setDetailId, close };
}

export function PaymentsView({
  payments,
  todayStr,
  initialDetailId,
}: {
  payments: Payment[];
  todayStr: string;
  initialDetailId?: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(1);
  const detail = useDetail(initialDetailId);
  const ui = usePaymentUI();

  const needle = query.trim().toLowerCase();
  const visible = sortPayments(
    payments.filter((payment) => {
      if (needle && !payment.name.toLowerCase().includes(needle)) return false;
      if (filter === "pending") return !payment.is_paid;
      if (filter === "paid") return payment.is_paid;
      return true;
    })
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Back to page 1 whenever the search or filter changes, so it never leaves
  // you stranded on a now-empty page. Adjusted during render (not in an
  // effect) to avoid an extra render pass.
  const filterKey = `${query}|${filter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const detailPayment = payments.find((payment) => payment.id === detail.detailId);

  return (
    <div className="space-y-4">
      {/* Only the toolbar and the list bounce in: the floating "+" and the
          detail sheet below are position:fixed, and a transform on an
          ancestor would drag them along for the length of the animation. */}
      <Reveal delay={60} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filtrar pagos"
          className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1 lg:min-w-[22rem]"
        >
          {FILTERS.map(({ key, label }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(key)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-accent text-white shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative lg:w-72">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pago..."
            aria-label="Buscar pago"
            className="field w-full rounded-xl py-2.5 pr-3 pl-9 text-sm"
          />
        </div>
      </Reveal>

      <Reveal delay={120} className="space-y-4">
      {visible.length ? (
        <>
          <div className="hidden lg:block">
            <PaymentsTable payments={pageItems} todayStr={todayStr} onOpenDetail={detail.open} />
          </div>
          <div className="lg:hidden">
            <PaymentCards payments={pageItems} todayStr={todayStr} onOpenDetail={detail.open} />
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
                className="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-foreground disabled:opacity-40"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-muted">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Página siguiente"
                className="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-foreground disabled:opacity-40"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
          <p className="text-sm font-medium">
            {needle
              ? `Ningún pago coincide con "${query.trim()}".`
              : payments.length === 0
                ? "Todavía no tienes pagos registrados."
                : "No hay pagos en este filtro."}
          </p>
          <p className="max-w-sm text-sm text-muted">
            {needle
              ? "Prueba con otra palabra o revisa los filtros."
              : payments.length === 0
                ? "Registra el primero y empieza a recibir avisos en Telegram antes de cada vencimiento."
                : "Cambia de filtro para ver el resto."}
          </p>
          {payments.length === 0 && <AddPaymentButton className="mt-3" />}
        </div>
      )}
      </Reveal>

      <PaymentDetailSheet payment={detailPayment} todayStr={todayStr} onClose={detail.close} />

      {/* The mockup's floating "+". Above the bottom nav, clear of the
          home indicator on notched phones. */}
      <button
        type="button"
        onClick={ui.openCreate}
        aria-label="Agregar pago"
        className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-indigo-500/30 transition hover:bg-accent-dark active:scale-95 lg:hidden"
        style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
      >
        <Plus size={26} />
      </button>
    </div>
  );
}

/** A short, action-capable slice of the list for the Inicio page. */
export function PaymentsPreview({
  payments,
  todayStr,
  limit = 6,
}: {
  payments: Payment[];
  todayStr: string;
  limit?: number;
}) {
  const detail = useDetail();
  const items = sortPayments(payments).slice(0, limit);
  const detailPayment = payments.find((payment) => payment.id === detail.detailId);

  if (!items.length) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
        <p className="text-sm text-muted">Todavía no tienes pagos registrados.</p>
        <AddPaymentButton />
      </div>
    );
  }

  return (
    <>
      <div className="hidden lg:block">
        <PaymentsTable payments={items} todayStr={todayStr} onOpenDetail={detail.open} />
      </div>
      <div className="lg:hidden">
        <PaymentCards payments={items} todayStr={todayStr} onOpenDetail={detail.open} />
      </div>
      <PaymentDetailSheet payment={detailPayment} todayStr={todayStr} onClose={detail.close} />
    </>
  );
}

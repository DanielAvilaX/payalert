"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { PaymentRow, type Payment } from "@/app/dashboard/payment-row";

export function PaymentsList({ payments }: { payments: Payment[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? payments.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : payments;

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

      {filtered.length ? (
        <ul className="scrollbar-glass flex max-h-[30rem] flex-col gap-2 overflow-y-auto pr-1">
          {filtered.map((payment, i) => (
            <PaymentRow key={payment.id} payment={payment} index={i} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          {query ? "Ningún pago coincide con tu búsqueda." : "Todavía no tienes pagos."}
        </p>
      )}
    </div>
  );
}

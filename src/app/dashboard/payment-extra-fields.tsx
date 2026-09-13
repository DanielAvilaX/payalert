"use client";

import { useState } from "react";
import { ChevronDown, Link2, StickyNote, TrendingUp } from "lucide-react";

const inputClass = "field w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted";

/**
 * The three optional fields, shared by the create and edit forms.
 *
 * Collapsed by default on purpose: adding a bill should stay a ten-second
 * job, and burying these behind one tap keeps the common path short without
 * hiding them from the people who want them. It opens automatically when
 * the payment already has something in here, so an existing note is never
 * invisible.
 */
export function PaymentExtraFields({
  defaultVariable = false,
  defaultNotes = "",
  defaultUrl = "",
}: {
  defaultVariable?: boolean;
  defaultNotes?: string;
  defaultUrl?: string;
}) {
  const [open, setOpen] = useState(
    defaultVariable || Boolean(defaultNotes) || Boolean(defaultUrl)
  );

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 self-start text-sm text-muted transition hover:text-foreground"
      >
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
        Más opciones
      </button>

      {/* Kept mounted so the values still submit when collapsed. */}
      <div className={open ? "flex flex-col gap-3" : "hidden"}>
        <label className="flex items-start gap-2 text-sm text-muted">
          <input
            type="checkbox"
            name="amount_is_variable"
            defaultChecked={defaultVariable}
            className="mt-0.5 accent-accent"
          />
          <TrendingUp size={14} className="mt-0.5 shrink-0 text-accent" />
          <span>
            El monto cambia cada mes
            <span className="block text-xs">
              Para luz, agua o gas: al marcarlo pagado te preguntamos cuánto llegó.
            </span>
          </span>
        </label>

        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1.5 text-sm text-muted">
            <Link2 size={14} />
            Enlace para pagar (opcional)
          </label>
          <input
            name="payment_url"
            type="text"
            inputMode="url"
            defaultValue={defaultUrl}
            placeholder="Ej. sucursalvirtual.bancolombia.com"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1.5 text-sm text-muted">
            <StickyNote size={14} />
            Nota (opcional)
          </label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={defaultNotes}
            placeholder="Número de referencia, cuenta, o cualquier dato que necesites a la mano"
            className={`${inputClass} resize-y`}
          />
        </div>
      </div>
    </div>
  );
}

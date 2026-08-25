"use client";

import { useActionState, useState } from "react";
import { createPayment, type ActionState, type Recurrence } from "@/app/dashboard/actions";
import { formatMoneyInput } from "@/lib/format";
import { CATEGORY_OPTIONS } from "@/lib/categories";

const WEEKDAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none";
const labelClass = "text-sm text-muted";

export function PaymentForm() {
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [amount, setAmount] = useState("");
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createPayment,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className={labelClass}>
          Nombre del pago
        </label>
        <input
          id="name"
          name="name"
          placeholder="Ej. Luz, Netflix, Spotify"
          required
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="amount" className={labelClass}>
            Monto
          </label>
          <input
            id="amount"
            name="amount"
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
            placeholder="Monto del pago (opcional)"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="category" className={labelClass}>
            Categoría
          </label>
          <select id="category" name="category" defaultValue="otro" className={inputClass}>
            {CATEGORY_OPTIONS.map(([id, cfg]) => (
              <option key={id} value={id}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="recurrence" className={labelClass}>
            Frecuencia
          </label>
          <select
            id="recurrence"
            name="recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence)}
            className={inputClass}
          >
            <option value="none">Único</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
            <option value="yearly">Anual</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Fecha de pago</label>

          {recurrence === "monthly" && (
            <input
              name="day_of_month"
              type="number"
              min={1}
              max={31}
              placeholder="Día del mes (ej. 15)"
              required
              className={inputClass}
            />
          )}

          {recurrence === "yearly" && (
            <div className="flex gap-2">
              <input
                name="day_of_month"
                type="number"
                min={1}
                max={31}
                placeholder="Día"
                required
                className={inputClass}
              />
              <select name="month" required className={inputClass}>
                <option value="">Mes</option>
                {MONTHS.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {recurrence === "weekly" && (
            <select name="weekday" required className={inputClass}>
              <option value="">Día de la semana</option>
              {WEEKDAYS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}

          {recurrence === "none" && (
            <input name="due_date" type="date" required className={inputClass} />
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted">
        Avisar
        <input
          name="remind_days_before"
          type="number"
          min={0}
          defaultValue={3}
          className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-foreground focus:border-accent focus:outline-none"
        />
        días antes
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-dark disabled:opacity-50"
      >
        {pending ? "Agregando..." : "Agregar pago"}
      </button>
    </form>
  );
}

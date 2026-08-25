"use client";

import { useState } from "react";
import { createPayment, type Recurrence } from "@/app/dashboard/actions";

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

function formatMoney(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("es-CO");
}

export function PaymentForm() {
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [amount, setAmount] = useState("");

  return (
    <form action={createPayment} className="grid grid-cols-2 gap-3">
      <input
        name="name"
        placeholder="Nombre (ej. Luz, Netflix)"
        required
        className="col-span-2 rounded border px-3 py-2"
      />

      <input
        name="amount"
        type="text"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(formatMoney(e.target.value))}
        placeholder="Monto (opcional, varía cada vez)"
        className="col-span-2 rounded border px-3 py-2"
      />

      <select
        name="recurrence"
        value={recurrence}
        onChange={(e) => setRecurrence(e.target.value as Recurrence)}
        className="rounded border px-3 py-2"
      >
        <option value="none">Único</option>
        <option value="weekly">Semanal</option>
        <option value="monthly">Mensual</option>
        <option value="yearly">Anual</option>
      </select>

      {recurrence === "monthly" && (
        <input
          name="day_of_month"
          type="number"
          min={1}
          max={31}
          placeholder="Día del mes (ej. 15)"
          required
          className="rounded border px-3 py-2"
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
            className="w-1/2 rounded border px-3 py-2"
          />
          <select name="month" required className="w-1/2 rounded border px-3 py-2">
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
        <select name="weekday" required className="rounded border px-3 py-2">
          <option value="">Día de la semana</option>
          {WEEKDAYS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}

      {recurrence === "none" && (
        <input
          name="due_date"
          type="date"
          required
          className="rounded border px-3 py-2"
        />
      )}

      <label className="col-span-2 flex items-center gap-2 text-sm">
        Avisar
        <input
          name="remind_days_before"
          type="number"
          min={0}
          defaultValue={3}
          className="w-16 rounded border px-2 py-1"
        />
        días antes
      </label>

      <button
        type="submit"
        className="col-span-2 rounded bg-black px-4 py-2 text-white"
      >
        Agregar
      </button>
    </form>
  );
}

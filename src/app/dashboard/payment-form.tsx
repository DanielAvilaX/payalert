"use client";

import { useState } from "react";
import { createPayment, type Recurrence } from "@/app/dashboard/actions";

export function PaymentForm() {
  const [recurrence, setRecurrence] = useState<Recurrence>("none");

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
        type="number"
        step="0.01"
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

      {recurrence === "monthly" ? (
        <input
          name="day_of_month"
          type="number"
          min={1}
          max={31}
          placeholder="Día del mes (ej. 15)"
          required
          className="rounded border px-3 py-2"
        />
      ) : (
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

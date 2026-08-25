"use client";

import { useState, useTransition } from "react";
import { deletePayment, markPaid, updatePayment } from "@/app/dashboard/actions";
import { formatMoneyInput } from "@/lib/format";

const RECURRENCE_LABEL: Record<string, string> = {
  none: "Único",
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
};

type Payment = {
  id: string;
  name: string;
  amount: number | null;
  currency: string;
  due_date: string;
  recurrence: string;
  remind_days_before: number;
  is_paid: boolean;
};

export function PaymentRow({ payment }: { payment: Payment }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(
    payment.amount != null ? `$${Number(payment.amount).toLocaleString("es-CO")}` : ""
  );

  function handleDelete() {
    if (!confirm(`¿Eliminar "${payment.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deletePayment(payment.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar");
      }
    });
  }

  function handleMarkPaid() {
    setError(null);
    startTransition(async () => {
      try {
        await markPaid(payment.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo actualizar");
      }
    });
  }

  function handleSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updatePayment(payment.id, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  if (editing) {
    return (
      <li className="rounded border p-3">
        <form action={handleSave} className="flex flex-col gap-2">
          <input
            name="name"
            defaultValue={payment.name}
            required
            className="rounded border px-3 py-2"
          />
          <input
            name="amount"
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
            placeholder="Monto (opcional)"
            className="rounded border px-3 py-2"
          />
          <input
            name="due_date"
            type="date"
            defaultValue={payment.due_date}
            required
            className="rounded border px-3 py-2"
          />
          <label className="flex items-center gap-2 text-sm">
            Avisar
            <input
              name="remind_days_before"
              type="number"
              min={0}
              defaultValue={payment.remind_days_before}
              className="w-16 rounded border px-2 py-1"
            />
            días antes
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm underline"
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between rounded border p-3">
      <div>
        <p className="font-medium">
          {payment.name}{" "}
          {payment.is_paid && (
            <span className="text-xs text-green-700">(pagado)</span>
          )}
        </p>
        <p className="text-sm text-gray-600">
          {payment.due_date} · {RECURRENCE_LABEL[payment.recurrence]}
          {payment.amount != null &&
            ` · $${Number(payment.amount).toLocaleString("es-CO")} ${payment.currency}`}
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setEditing(true)} className="text-sm underline">
          Editar
        </button>
        {!payment.is_paid && (
          <button
            type="button"
            disabled={pending}
            onClick={handleMarkPaid}
            className="text-sm underline disabled:opacity-50"
          >
            Marcar pagado
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          className="text-sm text-red-600 underline disabled:opacity-50"
        >
          Eliminar
        </button>
      </div>
    </li>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { updateMonthlyIncome, type SettingsState } from "@/app/dashboard/settings-actions";
import { formatMoneyInput } from "@/lib/format";
import { Spinner } from "@/app/dashboard/spinner";

export function IncomeForm({ defaultValue }: { defaultValue: number | null }) {
  const [value, setValue] = useState(
    defaultValue ? formatMoneyInput(String(Math.round(defaultValue))) : ""
  );
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    updateMonthlyIncome,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="monthly_income" className="text-sm font-medium">
        Ingreso mensual (opcional)
      </label>
      <input
        id="monthly_income"
        name="monthly_income"
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(formatMoneyInput(e.target.value))}
        placeholder="Ej. $3.500.000"
        className="field w-full rounded-lg px-3 py-2 text-sm sm:max-w-xs"
      />
      <p className="text-xs text-muted">
        Solo se usa para calcular qué parte de tus ingresos se va en pagos fijos. Déjalo vacío si
        prefieres no usarlo.
      </p>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-fit items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? <Spinner size={16} /> : <Save size={16} />}
        Guardar
      </button>
    </form>
  );
}

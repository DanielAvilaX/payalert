"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PlusCircle, Zap } from "lucide-react";
import { createPayment, type ActionState, type Recurrence } from "@/app/dashboard/actions";
import { formatMoneyInput } from "@/lib/format";
import { detectLogo, type LogoId } from "@/lib/logos";
import { LogoPicker } from "@/app/dashboard/logo-picker";
import { Select } from "@/app/dashboard/select";
import { Spinner } from "@/app/dashboard/spinner";
import {
  RECURRENCE_OPTIONS,
  WEEKDAY_OPTIONS,
  MONTH_OPTIONS,
  FULL_DATE_RECURRENCES,
} from "@/app/dashboard/recurrence-options";

const inputClass = "glass-input w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted";
const labelClass = "text-sm text-muted";

export function PaymentForm({
  defaultRemindDaysBefore = 3,
  onSuccess,
}: {
  defaultRemindDaysBefore?: number;
  onSuccess?: () => void;
}) {
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<LogoId>("money");
  const [logoManual, setLogoManual] = useState(false);
  const [month, setMonth] = useState("");
  const [weekday, setWeekday] = useState("");
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createPayment,
    undefined
  );
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      onSuccess?.();
    }
    wasPending.current = pending;
  }, [pending, state, onSuccess]);

  function handleNameChange(value: string) {
    setName(value);
    if (!logoManual) {
      setLogo(detectLogo(value));
    }
  }

  function handleLogoChange(id: LogoId) {
    setLogo(id);
    setLogoManual(true);
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className={labelClass}>
          Nombre del pago
        </label>
        <input
          id="name"
          name="name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
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
          <label className={labelClass}>Logo</label>
          <LogoPicker name="logo" value={logo} onChange={handleLogoChange} />
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
            {RECURRENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>
            {FULL_DATE_RECURRENCES.has(recurrence) && recurrence !== "none"
              ? "Fecha del próximo cobro"
              : "Fecha de pago"}
          </label>

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
                className={`${inputClass} w-1/2`}
              />
              <div className="w-1/2">
                <Select
                  name="month"
                  value={month}
                  onChange={setMonth}
                  options={MONTH_OPTIONS}
                  placeholder="Mes"
                />
              </div>
            </div>
          )}

          {recurrence === "weekly" && (
            <Select
              name="weekday"
              value={weekday}
              onChange={setWeekday}
              options={WEEKDAY_OPTIONS}
              placeholder="Día de la semana"
            />
          )}

          {FULL_DATE_RECURRENCES.has(recurrence) && (
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
          defaultValue={defaultRemindDaysBefore}
          required
          className="glass-input w-16 rounded-lg px-2 py-1 text-foreground"
        />
        días antes
      </label>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" name="is_automatic" className="accent-emerald-500" />
        <Zap size={14} className="text-emerald-400" />
        Pago automático (débito/domiciliación)
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark active:scale-95 disabled:opacity-50"
      >
        {pending ? <Spinner size={16} /> : <PlusCircle size={16} />}
        {pending ? "Agregando..." : "Agregar pago"}
      </button>
    </form>
  );
}

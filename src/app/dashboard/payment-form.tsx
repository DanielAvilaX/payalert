"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PlusCircle, Save, Zap } from "lucide-react";
import { savePayment, type ActionState, type Recurrence } from "@/app/dashboard/actions";
import { formatMoneyInput } from "@/lib/format";
import { dateParts } from "@/lib/dates";
import { detectLogo, type LogoId } from "@/lib/logos";
import { LogoPicker } from "@/app/dashboard/logo-picker";
import { Select } from "@/app/dashboard/select";
import { Spinner } from "@/app/dashboard/spinner";
import { PaymentExtraFields } from "@/app/dashboard/payment-extra-fields";
import {
  RECURRENCE_OPTIONS,
  WEEKDAY_OPTIONS,
  MONTH_OPTIONS,
  FULL_DATE_RECURRENCES,
} from "@/app/dashboard/recurrence-options";
import type { Payment } from "@/app/dashboard/payment-types";

const inputClass = "field w-full rounded-lg px-3 py-2 text-sm";
const labelClass = "text-sm font-medium text-foreground";

/**
 * Create and edit share one form. They used to be two hand-maintained copies
 * (the "Nuevo pago" modal and an inline row editor) that had already drifted
 * - the edit copy went weeks without the recurrence-aware date fields.
 */
export function PaymentForm({
  payment,
  defaultRemindDaysBefore = 3,
  onSuccess,
}: {
  payment?: Payment;
  defaultRemindDaysBefore?: number;
  onSuccess?: () => void;
}) {
  const editing = Boolean(payment);
  const initial = payment ? dateParts(payment.due_date) : null;

  const [recurrence, setRecurrence] = useState<Recurrence>(
    (payment?.recurrence as Recurrence) ?? "none"
  );
  const [name, setName] = useState(payment?.name ?? "");
  const [amount, setAmount] = useState(
    payment?.amount != null ? formatMoneyInput(String(Math.round(Number(payment.amount)))) : ""
  );
  const [logo, setLogo] = useState<LogoId>((payment?.logo as LogoId) ?? "money");
  // An existing payment already carries a logo someone chose; only a
  // brand-new one should follow the name as it's typed.
  const [logoManual, setLogoManual] = useState(editing);
  const [month, setMonth] = useState(initial ? String(initial.month) : "");
  const [weekday, setWeekday] = useState(initial ? String(initial.weekday) : "");
  const [state, action, pending] = useActionState<ActionState, FormData>(savePayment, undefined);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onSuccess?.();
    wasPending.current = pending;
  }, [pending, state, onSuccess]);

  return (
    <form action={action} className="flex flex-col gap-4">
      {payment && <input type="hidden" name="id" value={payment.id} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="payment-name" className={labelClass}>
          Nombre del pago
        </label>
        <input
          id="payment-name"
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!logoManual) setLogo(detectLogo(e.target.value));
          }}
          placeholder="Ej. Luz, Netflix, arriendo"
          required
          maxLength={80}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="payment-amount" className={labelClass}>
            Monto
          </label>
          <input
            id="payment-amount"
            name="amount"
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
            placeholder="Opcional"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Logo</span>
          <LogoPicker
            name="logo"
            value={logo}
            onChange={(id) => {
              setLogo(id);
              setLogoManual(true);
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="payment-recurrence" className={labelClass}>
            Frecuencia
          </label>
          <select
            id="payment-recurrence"
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

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>
            {FULL_DATE_RECURRENCES.has(recurrence) && recurrence !== "none"
              ? "Fecha del próximo cobro"
              : "Fecha de pago"}
          </span>

          {recurrence === "monthly" && (
            <input
              name="day_of_month"
              type="number"
              min={1}
              max={31}
              defaultValue={initial?.day}
              placeholder="Día del mes (ej. 15)"
              required
              aria-label="Día del mes"
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
                defaultValue={initial?.day}
                placeholder="Día"
                required
                aria-label="Día"
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
            <input
              name="due_date"
              type="date"
              defaultValue={payment?.due_date}
              required
              aria-label="Fecha"
              className={inputClass}
            />
          )}
        </div>
      </div>

      <label className="flex flex-wrap items-center gap-2 text-sm text-muted">
        Avisar
        <input
          name="remind_days_before"
          type="number"
          min={0}
          max={365}
          defaultValue={payment?.remind_days_before ?? defaultRemindDaysBefore}
          required
          className="field w-20 rounded-lg px-2 py-1.5 text-foreground"
        />
        días antes
      </label>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          name="is_automatic"
          defaultChecked={payment?.is_automatic}
          className="accent-emerald-600"
        />
        <Zap size={14} className="text-emerald-600" />
        Pago automático (débito o domiciliación)
      </label>

      <PaymentExtraFields
        defaultVariable={payment?.amount_is_variable ?? false}
        defaultNotes={payment?.notes ?? ""}
        defaultUrl={payment?.payment_url ?? ""}
      />

      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-dark active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? <Spinner size={16} /> : editing ? <Save size={16} /> : <PlusCircle size={16} />}
        {pending ? "Guardando…" : editing ? "Guardar cambios" : "Agregar pago"}
      </button>
    </form>
  );
}

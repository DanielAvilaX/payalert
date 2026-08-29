"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Trash2, Pencil, CheckCircle2, RotateCcw, X, Bell, Zap } from "lucide-react";
import { deletePayment, markPaid, unmarkPaid, updatePayment, type Recurrence } from "@/app/dashboard/actions";
import { formatMoneyInput } from "@/lib/format";
import { logoConfig, type LogoId } from "@/lib/logos";
import { LogoPicker } from "@/app/dashboard/logo-picker";
import { Select } from "@/app/dashboard/select";
import { Spinner } from "@/app/dashboard/spinner";
import { useConfirmDelete } from "@/app/dashboard/delete-confirm-context";
import { useOpenReminders } from "@/app/dashboard/reminders-modal-context";
import {
  RECURRENCE_OPTIONS,
  WEEKDAY_OPTIONS,
  MONTH_OPTIONS,
  MONTHLY_LIKE_RECURRENCES,
} from "@/app/dashboard/recurrence-options";

const RECURRENCE_LABEL: Record<string, string> = {
  none: "Único",
  weekly: "Semanal",
  monthly: "Mensual",
  bimonthly: "Bimensual",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  yearly: "Anual",
};

export type Payment = {
  id: string;
  name: string;
  amount: number | null;
  currency: string;
  logo: string | null;
  due_date: string;
  recurrence: string;
  remind_days_before: number;
  is_paid: boolean;
  is_automatic: boolean;
};

const inputClass = "glass-input w-full rounded-lg px-3 py-2 text-sm text-foreground";

const springTransition = { type: "spring" as const, stiffness: 300, damping: 26 };

function dateParts(dueDate: string) {
  const [y, m, d] = dueDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { day: String(d), month: String(m), weekday: String(weekday) };
}

function LogoBadge({ logo, automatic }: { logo: string | null; automatic?: boolean }) {
  const cfg = logoConfig(logo);
  return (
    <div className="relative shrink-0">
      {cfg.icon ? (
        <div
          title={cfg.label}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10"
        >
          <cfg.icon size={22} />
        </div>
      ) : (
        <Image
          src={cfg.src!}
          alt=""
          width={48}
          height={48}
          title={cfg.label}
          className="h-12 w-12 rounded-full object-cover"
        />
      )}
      {automatic && (
        <span
          title="Pago automático"
          className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black ring-2 ring-[var(--background)]"
        >
          <Zap size={11} fill="currentColor" />
        </span>
      )}
    </div>
  );
}

export function PaymentRow({ payment, index = 0 }: { payment: Payment; index?: number }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(
    payment.amount != null ? `$${Number(payment.amount).toLocaleString("es-CO")}` : ""
  );
  const [logo, setLogo] = useState<LogoId>((payment.logo as LogoId) ?? "money");
  const [recurrence, setRecurrence] = useState<Recurrence>(payment.recurrence as Recurrence);
  const initialParts = dateParts(payment.due_date);
  const [month, setMonth] = useState(initialParts.month);
  const [weekday, setWeekday] = useState(initialParts.weekday);
  const confirmDelete = useConfirmDelete();
  const openReminders = useOpenReminders();

  function handleDelete() {
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

  function handleUnmarkPaid() {
    setError(null);
    startTransition(async () => {
      try {
        await unmarkPaid(payment.id);
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

  const entrance = {
    initial: { opacity: 0, y: 14, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { ...springTransition, delay: index * 0.04 },
  };

  if (editing) {
    return (
      <motion.li layout className="glass-panel rounded-xl p-4" {...entrance}>
        <form action={handleSave} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input name="name" defaultValue={payment.name} required className={inputClass} />
            <LogoPicker name="logo" value={logo} onChange={setLogo} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              name="amount"
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
              placeholder="Monto (opcional)"
              className={inputClass}
            />
            <div className="flex flex-col gap-1">
              <label htmlFor={`recurrence-${payment.id}`} className="text-sm text-muted">
                Frecuencia
              </label>
              <select
                id={`recurrence-${payment.id}`}
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
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">Fecha de pago</label>

            {MONTHLY_LIKE_RECURRENCES.has(recurrence) && (
              <input
                name="day_of_month"
                type="number"
                min={1}
                max={31}
                defaultValue={initialParts.day}
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
                  defaultValue={initialParts.day}
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

            {recurrence === "none" && (
              <input
                name="due_date"
                type="date"
                defaultValue={payment.due_date}
                required
                className={inputClass}
              />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-muted">
            Avisar
            <input
              name="remind_days_before"
              type="number"
              min={0}
              defaultValue={payment.remind_days_before}
              required
              className="glass-input w-16 rounded-lg px-2 py-1 text-foreground"
            />
            días antes
          </label>

          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              name="is_automatic"
              defaultChecked={payment.is_automatic}
              className="accent-emerald-500"
            />
            <Zap size={14} className="text-emerald-400" />
            Pago automático (débito/domiciliación)
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-dark active:scale-95 disabled:opacity-50"
            >
              {pending ? <Spinner size={14} /> : <CheckCircle2 size={14} />}
              {pending ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
            >
              <X size={14} />
              Cancelar
            </button>
          </div>
        </form>
      </motion.li>
    );
  }

  return (
    <motion.li
      layout
      {...entrance}
      className={`glass-panel flex flex-col gap-3 rounded-2xl p-4 transition-colors sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-x-3 sm:gap-y-2 ${
        payment.is_paid ? "border-emerald-500/30 bg-emerald-500/[0.04]" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-3 sm:flex-1">
        <LogoBadge logo={payment.logo} automatic={payment.is_automatic} />
        <div className="min-w-0">
          <p className="font-medium break-words">
            {payment.name}{" "}
            {payment.is_paid && <span className="text-xs text-emerald-400">(pagado)</span>}
          </p>
          <p className="text-sm text-muted">
            {payment.due_date} · {RECURRENCE_LABEL[payment.recurrence]}
            {payment.amount != null &&
              ` · $${Number(payment.amount).toLocaleString("es-CO")}`}
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1.5 text-sm">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Editar"
          title="Editar"
          className="rounded-lg p-2 text-muted transition hover:bg-white/10 hover:text-foreground active:scale-95"
        >
          <Pencil size={18} />
        </button>
        <button
          type="button"
          onClick={() =>
            openReminders({
              paymentId: payment.id,
              paymentName: payment.name,
              paymentLogo: payment.logo,
            })
          }
          aria-label="Configurar recordatorios"
          title="Configurar recordatorios"
          className="rounded-lg p-2 text-muted transition hover:bg-white/10 hover:text-foreground active:scale-95"
        >
          <Bell size={18} />
        </button>
        {payment.is_paid ? (
          <button
            type="button"
            disabled={pending}
            onClick={handleUnmarkPaid}
            aria-label="Marcar como pendiente"
            title="Marcar como pendiente"
            className="group rounded-lg bg-emerald-500/15 p-2 text-emerald-400 transition hover:bg-emerald-500/25 active:scale-95 disabled:opacity-50"
          >
            {pending ? (
              <Spinner size={18} />
            ) : (
              <>
                <CheckCircle2 size={18} className="group-hover:hidden" />
                <RotateCcw size={18} className="hidden group-hover:block" />
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={handleMarkPaid}
            aria-label="Marcar pagado"
            title="Marcar pagado"
            className="rounded-lg p-2 text-muted transition hover:bg-emerald-500/15 hover:text-emerald-400 active:scale-95 disabled:opacity-50"
          >
            {pending ? <Spinner size={18} /> : <CheckCircle2 size={18} />}
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            confirmDelete({
              title: "Eliminar pago",
              description: `¿Eliminar "${payment.name}"? Esta acción no se puede deshacer.`,
              onConfirm: handleDelete,
            })
          }
          aria-label={`Eliminar ${payment.name}`}
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.li>
  );
}

"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { deletePayment, markPaid, updatePayment } from "@/app/dashboard/actions";
import { formatMoneyInput } from "@/lib/format";
import { logoConfig, type LogoId } from "@/lib/logos";
import { LogoPicker } from "@/app/dashboard/logo-picker";

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
  logo: string | null;
  due_date: string;
  recurrence: string;
  remind_days_before: number;
  is_paid: boolean;
};

const inputClass = "glass-input w-full rounded-lg px-3 py-2 text-sm text-foreground";

function LogoBadge({ logo }: { logo: string | null }) {
  const cfg = logoConfig(logo);
  if (cfg.icon) {
    const Icon = cfg.icon;
    return (
      <div
        title={cfg.label}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10"
      >
        <Icon size={18} />
      </div>
    );
  }
  return (
    <Image
      src={cfg.src!}
      alt=""
      width={40}
      height={40}
      title={cfg.label}
      className="h-10 w-10 shrink-0 rounded-lg object-cover"
    />
  );
}

export function PaymentRow({ payment }: { payment: Payment }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(
    payment.amount != null ? `$${Number(payment.amount).toLocaleString("es-CO")}` : ""
  );
  const [logo, setLogo] = useState<LogoId>((payment.logo as LogoId) ?? "money");

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
      <li className="glass-panel rounded-xl p-4">
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
            <input
              name="due_date"
              type="date"
              defaultValue={payment.due_date}
              required
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            Avisar
            <input
              name="remind_days_before"
              type="number"
              min={0}
              defaultValue={payment.remind_days_before}
              className="glass-input w-16 rounded-lg px-2 py-1 text-foreground"
            />
            días antes
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm text-muted hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="glass-panel flex items-center justify-between gap-3 rounded-xl p-3">
      <div className="flex min-w-0 items-center gap-3">
        <LogoBadge logo={payment.logo} />
        <div className="min-w-0">
          <p className="truncate font-medium">
            {payment.name}{" "}
            {payment.is_paid && <span className="text-xs text-accent">(pagado)</span>}
          </p>
          <p className="truncate text-sm text-muted">
            {payment.due_date} · {RECURRENCE_LABEL[payment.recurrence]}
            {payment.amount != null &&
              ` · $${Number(payment.amount).toLocaleString("es-CO")}`}
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm">
        <button type="button" onClick={() => setEditing(true)} className="text-muted hover:text-foreground">
          Editar
        </button>
        {!payment.is_paid && (
          <button
            type="button"
            disabled={pending}
            onClick={handleMarkPaid}
            className="text-muted hover:text-foreground disabled:opacity-50"
          >
            Marcar pagado
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          aria-label={`Eliminar ${payment.name}`}
          className="rounded-md border border-red-500/30 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

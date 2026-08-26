"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, Plus, Trash2, X } from "lucide-react";
import {
  listReminderRules,
  addReminderRule,
  deleteReminderRule,
  type ReminderRule,
} from "@/app/dashboard/reminder-actions";
import { Spinner } from "@/app/dashboard/spinner";
import { LoadingDots } from "@/app/dashboard/loading-dots";
import { describeReminderRule } from "@/lib/reminder-format";

const INTERVAL_OPTIONS = [
  { value: "30", label: "Cada 30 min" },
  { value: "60", label: "Cada hora" },
  { value: "120", label: "Cada 2 horas" },
  { value: "180", label: "Cada 3 horas" },
  { value: "240", label: "Cada 4 horas" },
  { value: "360", label: "Cada 6 horas" },
];

const inputClass = "glass-input w-full rounded-lg px-3 py-2 text-sm text-foreground";

export function RemindersModal({
  paymentId,
  paymentName,
  open,
  onClose,
}: {
  paymentId: string;
  paymentName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [repeats, setRepeats] = useState(false);
  const loading = loadedFor !== paymentId;

  useEffect(() => {
    if (!open) return;
    listReminderRules(paymentId).then((r) => {
      setRules(r);
      setLoadedFor(paymentId);
    });
  }, [open, paymentId]);

  if (!open) return null;

  function handleAdd(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addReminderRule(paymentId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      const updated = await listReminderRules(paymentId);
      setRules(updated);
      setRepeats(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteReminderRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop-in w-full max-w-md rounded-2xl border border-white/15 bg-[#0d1020] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <Bell size={18} className="text-accent" />
            Recordatorios
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-white/10 hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 truncate text-sm text-muted">{paymentName}</p>

        <p className="mb-4 text-xs text-muted">
          Sin reglas personalizadas se usa el aviso simple (&quot;avisar X días antes&quot;).
          Agrega reglas para escalar la urgencia como quieras - por ejemplo un aviso el lunes
          a mediodía, otro el lunes en la noche, y luego cada 2 horas el día antes de que venza.
        </p>

        {loading ? (
          <LoadingDots />
        ) : (
          <ul className="mb-4 flex flex-col gap-2">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="glass-input flex items-center justify-between rounded-lg px-3 py-2 text-sm"
              >
                <span>{describeReminderRule(rule)}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(rule.id)}
                  className="text-red-400 transition hover:text-red-300"
                  aria-label="Eliminar regla"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
            {rules.length === 0 && (
              <p className="text-sm text-muted">Sin reglas personalizadas todavía.</p>
            )}
          </ul>
        )}

        <form action={handleAdd} className="flex flex-col gap-3 border-t border-white/10 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Días antes</label>
              <input
                name="days_before_due"
                type="number"
                min={0}
                defaultValue={1}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Hora de inicio</label>
              <input
                name="start_time"
                type="time"
                defaultValue="09:00"
                required
                className={inputClass}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="repeats"
              checked={repeats}
              onChange={(e) => setRepeats(e.target.checked)}
              className="accent-accent"
            />
            Repetir varias veces ese día
          </label>

          {repeats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted">Hasta</label>
                <input name="end_time" type="time" defaultValue="20:00" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted">Frecuencia</label>
                <select
                  name="repeat_interval_minutes"
                  defaultValue="120"
                  className={inputClass}
                >
                  {INTERVAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark active:scale-95 disabled:opacity-50"
          >
            {pending ? <Spinner size={16} /> : <Plus size={16} />}
            Agregar regla
          </button>
        </form>
      </div>
    </div>
  );
}

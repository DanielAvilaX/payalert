"use client";

import { useState, useTransition } from "react";
import { Trash2, Pencil, Check, X } from "lucide-react";
import {
  deleteReminderRule,
  updateReminderRule,
  type ReminderRule,
} from "@/app/dashboard/reminder-actions";
import { describeReminderRule } from "@/lib/reminder-format";
import { ReminderRuleFields } from "@/app/dashboard/reminder-rule-fields";
import { Spinner } from "@/app/dashboard/spinner";
import { useToast } from "@/app/dashboard/toast-context";

export function ReminderRuleItem({
  rule,
  onDeleted,
}: {
  rule: ReminderRule;
  onDeleted: (id: string) => void;
}) {
  const [current, setCurrent] = useState(rule);
  const [editing, setEditing] = useState(false);
  const [repeats, setRepeats] = useState(!!rule.end_time);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteReminderRule(current.id);
        onDeleted(current.id);
        toast("Regla eliminada");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar la regla");
        toast("No se pudo eliminar la regla", "error");
      }
    });
  }

  function handleSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateReminderRule(current.id, formData);
      if (result.error) {
        setError(result.error);
        toast(result.error, "error");
        return;
      }
      if (result.rule) setCurrent({ ...current, ...result.rule });
      setEditing(false);
      toast("Regla actualizada");
    });
  }

  if (editing) {
    return (
      <li className="field rounded-lg p-3">
        <form action={handleSave} className="flex flex-col gap-3">
          <ReminderRuleFields
            defaultDays={current.days_before_due}
            defaultStart={current.start_time.slice(0, 5)}
            repeats={repeats}
            setRepeats={setRepeats}
            defaultEnd={current.end_time?.slice(0, 5)}
            defaultInterval={String(current.repeat_interval_minutes ?? 120)}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-dark active:scale-95 disabled:opacity-50"
            >
              {pending ? <Spinner size={14} /> : <Check size={14} />}
              Guardar
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
      </li>
    );
  }

  return (
    <li className="field flex items-center justify-between rounded-lg px-3 py-2 text-sm">
      <span>{describeReminderRule(current)}</span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Editar regla"
          className="rounded-md p-1.5 text-muted transition hover:bg-surface-2 hover:text-foreground"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          aria-label="Eliminar regla"
          className="rounded-md p-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

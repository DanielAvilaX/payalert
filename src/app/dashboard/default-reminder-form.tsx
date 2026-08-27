"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateDefaultReminder, type SettingsState } from "@/app/dashboard/settings-actions";
import { Spinner } from "@/app/dashboard/spinner";

export function DefaultReminderForm({ defaultValue }: { defaultValue: number }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    updateDefaultReminder,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-wrap items-center gap-2 text-sm text-muted">
        Avisar
        <input
          name="default_remind_days_before"
          type="number"
          min={0}
          defaultValue={defaultValue}
          required
          className="glass-input w-20 rounded-lg px-2 py-1.5 text-foreground"
        />
        días antes, por defecto en pagos nuevos
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-400">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex w-fit items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark active:scale-95 disabled:opacity-50"
      >
        {pending ? <Spinner size={16} /> : <Save size={16} />}
        Guardar
      </button>
    </form>
  );
}

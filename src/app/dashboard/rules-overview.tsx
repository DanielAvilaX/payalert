"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteReminderRule, type ReminderRule } from "@/app/dashboard/reminder-actions";
import { describeReminderRule } from "@/lib/reminder-format";

export type RuleWithPayment = ReminderRule & { payments: { name: string } | null };

export function RulesOverview({ rules }: { rules: RuleWithPayment[] }) {
  const [items, setItems] = useState(rules);
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteReminderRule(id);
      setItems((prev) => prev.filter((r) => r.id !== id));
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        Todavía no has creado reglas personalizadas. Ábrelas desde el ícono 🔔 en cualquier pago
        dentro de &quot;Tus pagos&quot;.
      </p>
    );
  }

  const grouped = new Map<string, RuleWithPayment[]>();
  for (const rule of items) {
    const key = rule.payments?.name ?? "Pago eliminado";
    grouped.set(key, [...(grouped.get(key) ?? []), rule]);
  }

  return (
    <div className="flex flex-col gap-4">
      {Array.from(grouped.entries()).map(([name, rulesForPayment]) => (
        <div key={name}>
          <p className="mb-2 truncate text-sm font-medium">{name}</p>
          <ul className="flex flex-col gap-2">
            {rulesForPayment.map((rule) => (
              <li
                key={rule.id}
                className="glass-input flex items-center justify-between rounded-lg px-3 py-2 text-sm"
              >
                <span>{describeReminderRule(rule)}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleDelete(rule.id)}
                  aria-label="Eliminar regla"
                  className="text-red-400 transition hover:text-red-300 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

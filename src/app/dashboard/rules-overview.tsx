"use client";

import { useState } from "react";
import Image from "next/image";
import { type ReminderRule } from "@/app/dashboard/reminder-actions";
import { ReminderRuleItem } from "@/app/dashboard/reminder-rule-item";
import { logoConfig } from "@/lib/logos";

export type RuleWithPayment = ReminderRule & {
  payments: { name: string; logo: string | null } | null;
};

function PaymentLogo({ logo }: { logo: string | null | undefined }) {
  const cfg = logoConfig(logo);
  if (cfg.icon) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2">
        <cfg.icon size={16} />
      </div>
    );
  }
  return (
    <Image
      src={cfg.src!}
      alt=""
      width={36}
      height={36}
      className="h-9 w-9 shrink-0 rounded-full object-cover"
    />
  );
}

export function RulesOverview({ rules }: { rules: RuleWithPayment[] }) {
  const [items, setItems] = useState(rules);

  function handleDeleted(id: string) {
    setItems((prev) => prev.filter((r) => r.id !== id));
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        Todavía no has creado reglas personalizadas. Ábrelas desde el ícono 🔔 en cualquier pago
        dentro de &quot;Tus pagos&quot;.
      </p>
    );
  }

  const grouped = new Map<string, { logo: string | null; rules: RuleWithPayment[] }>();
  for (const rule of items) {
    const name = rule.payments?.name ?? "Pago eliminado";
    const entry = grouped.get(name) ?? { logo: rule.payments?.logo ?? null, rules: [] };
    entry.rules.push(rule);
    grouped.set(name, entry);
  }

  return (
    <div className="flex flex-col gap-5">
      {Array.from(grouped.entries()).map(([name, { logo, rules: rulesForPayment }]) => (
        <div key={name}>
          <div className="mb-2 flex items-center gap-2.5">
            <PaymentLogo logo={logo} />
            <p className="text-sm font-medium break-words">{name}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {rulesForPayment.map((rule) => (
              <ReminderRuleItem key={rule.id} rule={rule} onDeleted={handleDeleted} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

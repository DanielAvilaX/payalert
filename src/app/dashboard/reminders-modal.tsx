"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Bell, Plus } from "lucide-react";
import { ModalShell } from "@/app/dashboard/modal-shell";
import { useToast } from "@/app/dashboard/toast-context";
import {
  listReminderRules,
  addReminderRule,
  type ReminderRule,
} from "@/app/dashboard/reminder-actions";
import { Spinner } from "@/app/dashboard/spinner";
import { LoadingDots } from "@/app/dashboard/loading-dots";
import { ReminderRuleFields } from "@/app/dashboard/reminder-rule-fields";
import { ReminderRuleItem } from "@/app/dashboard/reminder-rule-item";
import { logoConfig } from "@/lib/logos";

export function RemindersModal({
  paymentId,
  paymentName,
  paymentLogo,
  open,
  onClose,
}: {
  paymentId: string;
  paymentName: string;
  paymentLogo?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [repeats, setRepeats] = useState(false);
  const loading = loadedFor !== paymentId;
  const logo = logoConfig(paymentLogo);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    listReminderRules(paymentId).then((r) => {
      setRules(r);
      setLoadedFor(paymentId);
    });
  }, [open, paymentId]);

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
      toast("Regla agregada");
    });
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleSlot={
        <div className="flex min-w-0 items-center gap-3">
          {logo.icon ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
              <logo.icon size={20} />
            </div>
          ) : (
            <Image
              src={logo.src!}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-full object-cover"
            />
          )}
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 font-medium">
              <Bell size={15} className="shrink-0 text-accent" />
              Recordatorios
            </h2>
            <p className="text-sm text-muted break-words">{paymentName}</p>
          </div>
        </div>
      }
    >
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
              <ReminderRuleItem
                key={rule.id}
                rule={rule}
                onDeleted={(id) => setRules((prev) => prev.filter((r) => r.id !== id))}
              />
            ))}
            {rules.length === 0 && (
              <p className="text-sm text-muted">Sin reglas personalizadas todavía.</p>
            )}
          </ul>
        )}

        <form action={handleAdd} className="flex flex-col gap-3 border-t border-white/10 pt-4">
          <ReminderRuleFields
            defaultDays={1}
            defaultStart="09:00"
            repeats={repeats}
            setRepeats={setRepeats}
          />

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
    </ModalShell>
  );
}

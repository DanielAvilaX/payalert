"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ModalShell } from "@/app/dashboard/modal-shell";
import { PaymentForm } from "@/app/dashboard/payment-form";
import { useToast } from "@/app/dashboard/toast-context";
import { formatMoneyInput } from "@/lib/format";
import type { Payment } from "@/app/dashboard/payment-types";

type PaymentUI = {
  openCreate: () => void;
  openEdit: (payment: Payment) => void;
  /** For variable bills: ask what really arrived, then hand it back. */
  askActualAmount: (payment: Payment, onConfirm: (amount: string) => void) => void;
};

const noop = () => {};
const PaymentUIContext = createContext<PaymentUI>({
  openCreate: noop,
  openEdit: noop,
  askActualAmount: noop,
});

/**
 * The payment editor and the "¿cuánto llegó?" prompt, mounted once for the
 * whole dashboard. Rows, cards, the floating button and the detail sheet
 * only ask for them - the same single-instance rule that fixed the stacked
 * delete and reminders modals, applied up front this time.
 */
export function PaymentUIProvider({
  defaultRemindDaysBefore,
  children,
}: {
  defaultRemindDaysBefore: number;
  children: ReactNode;
}) {
  const [editor, setEditor] = useState<{ payment?: Payment } | null>(null);
  const [prompt, setPrompt] = useState<{
    payment: Payment;
    onConfirm: (amount: string) => void;
  } | null>(null);
  const [amount, setAmount] = useState("");
  const toast = useToast();

  const openCreate = useCallback(() => setEditor({}), []);
  const openEdit = useCallback((payment: Payment) => setEditor({ payment }), []);
  const askActualAmount = useCallback(
    (payment: Payment, onConfirm: (amount: string) => void) => {
      // Pre-filled with the last known figure, so confirming an unchanged
      // bill is still a single tap.
      setAmount(
        payment.amount != null ? formatMoneyInput(String(Math.round(Number(payment.amount)))) : ""
      );
      setPrompt({ payment, onConfirm });
    },
    []
  );
  const api = useMemo(
    () => ({ openCreate, openEdit, askActualAmount }),
    [openCreate, openEdit, askActualAmount]
  );

  function confirmAmount() {
    if (!prompt) return;
    const { onConfirm } = prompt;
    setPrompt(null);
    onConfirm(amount);
  }

  return (
    <PaymentUIContext.Provider value={api}>
      {children}

      <ModalShell
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor?.payment ? "Editar pago" : "Nuevo pago"}
        maxWidth="max-w-lg"
      >
        {editor && (
          <PaymentForm
            key={editor.payment?.id ?? "new"}
            payment={editor.payment}
            defaultRemindDaysBefore={defaultRemindDaysBefore}
            onSuccess={() => {
              const wasEditing = Boolean(editor.payment);
              setEditor(null);
              toast(wasEditing ? "Cambios guardados" : "Pago agregado");
            }}
          />
        )}
      </ModalShell>

      <ModalShell
        open={prompt !== null}
        onClose={() => setPrompt(null)}
        title="¿Cuánto llegó este mes?"
        maxWidth="max-w-sm"
      >
        {prompt && (
          <>
            <p className="mb-4 text-sm text-muted">
              <span className="font-medium text-foreground">{prompt.payment.name}</span> tiene monto
              variable. Guardamos el valor real para que el resumen del mes cuadre.
            </p>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmAmount();
              }}
              placeholder="Monto"
              aria-label="Monto pagado"
              className="field w-full rounded-lg px-3 py-2 text-sm"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPrompt(null)}
                className="rounded-xl px-4 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmAmount}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Marcar pagado
              </button>
            </div>
          </>
        )}
      </ModalShell>
    </PaymentUIContext.Provider>
  );
}

export function usePaymentUI() {
  return useContext(PaymentUIContext);
}

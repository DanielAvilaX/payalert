"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PaymentForm } from "@/app/dashboard/payment-form";
import { ModalShell } from "@/app/dashboard/modal-shell";
import { useToast } from "@/app/dashboard/toast-context";

export function AddPaymentModal({ defaultRemindDaysBefore }: { defaultRemindDaysBefore: number }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark active:scale-95"
      >
        <Plus size={16} />
        Agregar pago
      </button>

      <ModalShell open={open} onClose={() => setOpen(false)} title="Nuevo pago">
        <PaymentForm
          defaultRemindDaysBefore={defaultRemindDaysBefore}
          onSuccess={() => {
            setOpen(false);
            toast("Pago agregado");
          }}
        />
      </ModalShell>
    </>
  );
}

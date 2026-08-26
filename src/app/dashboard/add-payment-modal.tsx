"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { PaymentForm } from "@/app/dashboard/payment-form";

export function AddPaymentModal({ defaultRemindDaysBefore }: { defaultRemindDaysBefore: number }) {
  const [open, setOpen] = useState(false);

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

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-pop-in max-h-[90vh] w-full max-w-md overflow-y-auto scrollbar-glass rounded-2xl border border-white/15 bg-[#0d1020] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">Nuevo pago</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted transition hover:bg-white/10 hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <PaymentForm
              defaultRemindDaysBefore={defaultRemindDaysBefore}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

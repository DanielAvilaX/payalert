"use client";

import { AlertTriangle } from "lucide-react";
import { ModalShell } from "@/app/dashboard/modal-shell";

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalShell open={open} onClose={onCancel} maxWidth="max-w-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle size={24} />
      </div>
      <h2 className="mb-1 text-lg font-medium">{title}</h2>
      <p className="mb-6 text-sm text-muted">{description}</p>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-foreground active:scale-95"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 active:scale-95"
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { ConfirmModal } from "@/app/dashboard/confirm-modal";

type ConfirmRequest = {
  title: string;
  description: string;
  onConfirm: () => void;
};

const ConfirmDeleteContext = createContext<(req: ConfirmRequest) => void>(() => {});

// A single, app-wide delete-confirmation modal. Payments live in more than
// one list at once (dashboard preview, "Tus pagos"), and each row used to
// own its own modal instance - a couple of quick taps across rows could
// open several full-screen modals stacked on top of each other, with no
// clear way to tell which "Cancelar"/"Eliminar" belonged to which payment.
// Routing every request through one shared modal makes that impossible.
export function DeleteConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  return (
    <ConfirmDeleteContext.Provider value={setRequest}>
      {children}
      <ConfirmModal
        open={request !== null}
        title={request?.title ?? ""}
        description={request?.description ?? ""}
        onConfirm={() => {
          request?.onConfirm();
          setRequest(null);
        }}
        onCancel={() => setRequest(null)}
      />
    </ConfirmDeleteContext.Provider>
  );
}

export function useConfirmDelete() {
  return useContext(ConfirmDeleteContext);
}

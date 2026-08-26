"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { RemindersModal } from "@/app/dashboard/reminders-modal";

type ReminderTarget = {
  paymentId: string;
  paymentName: string;
  paymentLogo?: string | null;
};

const RemindersModalContext = createContext<(target: ReminderTarget) => void>(() => {});

// A single, app-wide reminders modal - same reasoning as DeleteConfirmProvider
// in delete-confirm-context.tsx: payments can render in more than one list at
// once, and each row used to own its own modal instance, which could stack
// on top of each other after a couple of quick taps on mobile.
export function RemindersModalProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ReminderTarget | null>(null);

  return (
    <RemindersModalContext.Provider value={setTarget}>
      {children}
      <RemindersModal
        paymentId={target?.paymentId ?? ""}
        paymentName={target?.paymentName ?? ""}
        paymentLogo={target?.paymentLogo}
        open={target !== null}
        onClose={() => setTarget(null)}
      />
    </RemindersModalContext.Provider>
  );
}

export function useOpenReminders() {
  return useContext(RemindersModalContext);
}

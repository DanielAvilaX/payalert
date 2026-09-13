"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * One dialog implementation for every modal in the app.
 *
 * The three modals used to hand-roll the same backdrop and card markup with
 * slightly different results (one scrolled, two didn't; none of them closed
 * on Escape, moved focus, or told a screen reader they were a dialog, and
 * all three let the page scroll underneath on mobile). Centralising it means
 * those behaviours exist once and can't drift apart again.
 */
export function ModalShell({
  open,
  onClose,
  title,
  titleSlot,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  /** Plain title. Use `titleSlot` instead when the header needs markup. */
  title?: string;
  titleSlot?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Callers pass an inline arrow, so `onClose` is a new function on every
  // render. Reading it through a ref keeps the effect below keyed on `open`
  // alone - otherwise it would re-run constantly and pull focus back to the
  // dialog mid-keystroke while the user is filling in a field.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Focus the dialog itself rather than guessing at a first field: the
    // reminders modal opens onto a list, and yanking focus into a text input
    // there would also pop the keyboard open on mobile for no reason.
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", handleKeyDown);

    // Stop the page behind the dialog from scrolling with it - on a phone
    // that scroll-through is what makes a modal feel broken.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title || titleSlot ? titleId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`animate-pop-in scrollbar-glass max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-2xl border border-white/15 bg-[#0d1020] p-6 shadow-2xl outline-none`}
      >
        {(title || titleSlot) && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div id={titleId} className="min-w-0">
              {titleSlot ?? <h2 className="text-lg font-medium">{title}</h2>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 rounded-lg p-1.5 text-muted transition hover:bg-white/10 hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Open dialogs, innermost last. Escape should only ever close the one on
// top - with an amount prompt over a detail sheet, closing both at once
// throws away the user's place.
const openStack: object[] = [];

/**
 * One dialog implementation for every modal in the app.
 *
 * The modals used to hand-roll the same backdrop and card markup with
 * slightly different results (one scrolled, others didn't; none closed on
 * Escape, moved focus, locked background scroll or told a screen reader
 * they were a dialog). Centralising it means those behaviours exist once.
 *
 * On phones it docks to the bottom as a sheet - the thumb-reachable pattern
 * native apps use - and centres as a regular dialog from `sm` up.
 *
 * Portalled to <body>: rendered in place, a fixed-position ancestor (a page
 * section mid-entrance-animation, a future `filter`/`contain` on `<main>`)
 * would make the backdrop cover only that ancestor's box instead of the
 * viewport - the same bug the floating menus already had to be fixed for.
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

    const token = {};
    openStack.push(token);
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the dialog itself unless something inside already claimed focus
    // (an autoFocus field): the reminders modal opens onto a list, and
    // pulling focus into an input there would pop the phone keyboard open.
    if (!dialogRef.current?.contains(document.activeElement)) {
      dialogRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && openStack[openStack.length - 1] === token) {
        onCloseRef.current();
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    // Stop the page behind the dialog from scrolling with it - on a phone
    // that scroll-through is what makes a modal feel broken.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      const index = openStack.indexOf(token);
      if (index !== -1) openStack.splice(index, 1);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  // document.body doesn't exist during SSR; a portal here renders nothing
  // there and nothing at this component's own position either way, so this
  // guard alone is SSR-safe without needing to delay to a mount effect.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      // Blur only, never a dark tint: the page behind stays its own colours,
      // just soft, so the dialog reads as "in front of" rather than "on a
      // dimmed scrim".
      className="fixed inset-0 z-[100] flex items-end justify-center backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title || titleSlot ? titleId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`animate-pop-in scrollbar-thin max-h-[92dvh] w-full ${maxWidth} overflow-y-auto rounded-t-3xl border border-border bg-surface shadow-2xl outline-none sm:rounded-2xl`}
      >
        {/* Sticky so the payment's name and status stay in view while the
            body scrolls - a long history list used to carry them off-screen. */}
        {(title || titleSlot) && (
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface p-5 pb-4 sm:p-6 sm:pb-4">
            <div id={titleId} className="min-w-0">
              {titleSlot ?? <h2 className="text-lg font-semibold">{title}</h2>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 sm:pt-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Placement = { top?: number; bottom?: number; right: number };

const MENU_WIDTH = 220;
// Roughly the tallest menu we render; below this much room it opens upward.
const FLIP_THRESHOLD = 300;

/**
 * A "⋯" menu that can live inside a scrolling table or card.
 *
 * The panel is portalled to <body> and positioned from the trigger's rect:
 * an absolutely positioned panel inside the table's horizontal-scroll
 * wrapper gets clipped by it - the same bug the logo and month dropdowns
 * already had to be fixed for.
 */
export function FloatingMenu({
  label,
  trigger,
  children,
}: {
  label: string;
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function position() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const right = Math.max(8, window.innerWidth - rect.right);
      setPlacement(
        rect.bottom > window.innerHeight - FLIP_THRESHOLD
          ? { bottom: window.innerHeight - rect.top + 6, right }
          : { top: rect.bottom + 6, right }
      );
    }
    position();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    // A fixed panel would drift away from its trigger while the page
    // scrolls, so any scroll simply closes it.
    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-foreground"
      >
        {trigger}
      </button>
      {open &&
        placement &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={{ position: "fixed", width: MENU_WIDTH, ...placement }}
            className="animate-pop-in z-[200] rounded-xl border border-border bg-surface p-1.5 shadow-xl"
          >
            {children(() => setOpen(false))}
          </div>,
          document.body
        )}
    </>
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition disabled:opacity-50 ${
        danger ? "text-red-600 hover:bg-red-50" : "text-foreground hover:bg-surface-2"
      }`}
    >
      <span className={danger ? "text-red-500" : "text-muted"}>{icon}</span>
      {children}
    </button>
  );
}

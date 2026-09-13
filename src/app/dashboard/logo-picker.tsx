"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { LOGO_OPTIONS, logoConfig, type LogoId } from "@/lib/logos";

type Rect = { top: number; left: number; width: number };

function LogoThumb({ id, size }: { id: LogoId; size: number }) {
  const cfg = logoConfig(id);
  if (cfg.icon) {
    const Icon = cfg.icon;
    return (
      <div
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground"
      >
        <Icon size={size * 0.55} />
      </div>
    );
  }
  return (
    <Image
      src={cfg.src!}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}

export function LogoPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: LogoId;
  onChange: (id: LogoId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const current = logoConfig(value);

  // The panel is portalled to <body> so it isn't clipped by a scrollable
  // modal ancestor (e.g. the "Nuevo pago" modal) - its position has to be
  // tracked manually instead of relying on CSS `absolute`.
  useEffect(() => {
    if (!open) return;

    function updateRect() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 288) });
    }
    updateRect();

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [open]);

  return (
    <div ref={triggerRef}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="field flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition active:scale-95"
      >
        <LogoThumb id={value} size={28} />
        <span className="min-w-0 flex-1 text-left break-words">{current.label}</span>
        <ChevronDown size={14} className="ml-auto shrink-0 text-muted" />
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}
            className="card z-[200] flex max-h-72 flex-col gap-1 overflow-y-auto rounded-lg p-2 shadow-xl animate-pop-in"
          >
            {LOGO_OPTIONS.map(([id, cfg]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
                className={`flex items-center gap-3 rounded-lg p-2 text-left transition hover:bg-surface-2 active:scale-95 ${
                  id === value ? "ring-2 ring-accent" : ""
                }`}
              >
                <LogoThumb id={id} size={32} />
                <span className="min-w-0 flex-1 break-words text-sm text-muted">{cfg.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

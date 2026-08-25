"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type Option = { value: string; label: string };

export function Select({
  name,
  value,
  onChange,
  options,
  placeholder,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="glass-input flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-foreground"
      >
        <span className={current ? "" : "text-muted"}>
          {current?.label ?? placeholder ?? "Selecciona..."}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="glass-panel absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg p-1 shadow-xl animate-pop-in">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-white/10 ${
                opt.value === value ? "bg-accent/15 text-accent" : ""
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

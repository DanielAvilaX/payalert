"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { LOGO_OPTIONS, logoConfig, type LogoId } from "@/lib/logos";

function LogoThumb({ id, size }: { id: LogoId; size: number }) {
  const cfg = logoConfig(id);
  if (cfg.icon) {
    const Icon = cfg.icon;
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-md bg-white/10 text-foreground"
      >
        <Icon size={size * 0.6} />
      </div>
    );
  }
  return (
    <Image
      src={cfg.src!}
      alt=""
      width={size}
      height={size}
      className="rounded-md object-cover"
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
  const ref = useRef<HTMLDivElement>(null);
  const current = logoConfig(value);

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
        className="glass-input flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm"
      >
        <LogoThumb id={value} size={22} />
        <span className="truncate">{current.label}</span>
        <ChevronDown size={14} className="ml-auto shrink-0 text-muted" />
      </button>

      {open && (
        <div className="glass-panel absolute z-20 mt-2 grid max-h-64 w-full min-w-[16rem] grid-cols-4 gap-2 overflow-y-auto rounded-lg p-3 shadow-xl">
          {LOGO_OPTIONS.map(([id, cfg]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onChange(id);
                setOpen(false);
              }}
              className={`flex flex-col items-center gap-1 rounded-lg p-2 hover:bg-white/10 ${
                id === value ? "ring-2 ring-accent" : ""
              }`}
            >
              <LogoThumb id={id} size={32} />
              <span className="text-center text-[10px] leading-tight text-muted">
                {cfg.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

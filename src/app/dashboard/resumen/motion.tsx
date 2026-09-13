"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { formatCOP } from "@/lib/format";

/**
 * Bounces its content in the first time it scrolls into view. Charts inside
 * it with `bar-grow-x` / `bar-grow-y` grow from zero at the same moment, so
 * a section below the fold animates when you reach it, not unseen on load.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        // A class toggle, not state: nothing here needs to re-render.
        el.classList.add("is-visible");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

type CountFormat = "cop" | "percent" | "number";

function formatCount(value: number, format: CountFormat): string {
  if (format === "percent") return `${Math.round(value)}%`;
  if (format === "number") return Math.round(value).toLocaleString("es-CO");
  return formatCOP(value);
}

const DURATION_MS = 1100;

/**
 * Runs a figure up from zero to its value, fast at first and settling at the
 * end, once it's on screen. Screen readers get the final value straight
 * away; the ticking digits are hidden from them.
 */
export function CountUp({
  value,
  format = "cop",
  delay = 0,
}: {
  value: number;
  format?: CountFormat;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout>;

    function run() {
      if (reduceMotion) {
        raf = requestAnimationFrame(() => setShown(value));
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / DURATION_MS);
        setShown(value * (1 - (1 - progress) ** 4));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      timer = setTimeout(run, delay);
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, delay]);

  return (
    <>
      {/* Tabular digits keep the width steady while the number ticks. */}
      <span ref={ref} aria-hidden className="tabular-nums">
        {formatCount(shown, format)}
      </span>
      <span className="sr-only">{formatCount(value, format)}</span>
    </>
  );
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { formatCOP } from "@/lib/format";

// Which routes have already played their entrance animation this session.
// Plain module state, not React state: `main` remounts on every navigation
// (it's keyed by pathname), so Reveal/CountUp always start fresh - this Set
// is what lets them know a route isn't actually new. A full reload clears
// it, which is fine: that's a fresh "module load" too.
const introducedPaths = new Set<string>();

const PageMotionContext = createContext(true);

/**
 * Gates Reveal/CountUp to the first visit of each route this session.
 * Without this, switching Inicio -> Pagos -> Inicio replayed the bounce
 * and the count-up every single time, since the page underneath remounts
 * on each navigation - charming once, tedious on the tenth tab switch.
 */
export function PageMotionProvider({ pathname, children }: { pathname: string; children: ReactNode }) {
  const animate = !introducedPaths.has(pathname);
  useEffect(() => {
    // A plain Set mutation, not setState - this never triggers a render.
    introducedPaths.add(pathname);
  }, [pathname]);

  return <PageMotionContext.Provider value={animate}>{children}</PageMotionContext.Provider>;
}

/**
 * Bounces its content in the first time it scrolls into view - but only on
 * a route's first visit this session (see `PageMotionProvider`). After
 * that it renders straight away, no animation.
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
  const animate = useContext(PageMotionContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animate) return;
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
  }, [animate]);

  return (
    <div
      ref={ref}
      className={`${animate ? "reveal" : ""} ${className}`}
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
 * Runs a figure up from zero to its value, fast at first and settling at
 * the end, once it's on screen - but, like `Reveal`, only the first time
 * this route is visited this session. A later revisit (or a value that
 * just changes in place, e.g. settling a payment) shows the number
 * straight away instead of recounting.
 */
export function CountUp({ value, format = "cop", delay = 0 }: { value: number; format?: CountFormat; delay?: number }) {
  const animate = useContext(PageMotionContext);
  if (!animate) return <span className="tabular-nums">{formatCount(value, format)}</span>;
  return <AnimatedCountUp value={value} format={format} delay={delay} />;
}

function AnimatedCountUp({ value, format, delay }: { value: number; format: CountFormat; delay: number }) {
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

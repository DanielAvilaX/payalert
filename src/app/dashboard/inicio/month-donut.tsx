"use client";

import { useState } from "react";

export type DonutSegment = { key: string; label: string; value: number; color: string };

const RADIUS = 58;
const STROKE = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// A surface-coloured gap separates neighbouring segments - the spacer does
// the separating, rather than a border that would add non-data ink.
const GAP = 2.5;

/**
 * "Resumen del mes" from the mockup: the month's bills as one ring.
 *
 * Part-to-whole with at most four segments is the one job a donut does
 * well. Every value is also written out in the legend, so hovering is never
 * the only way to read a number and colour is never the only cue. The
 * status hues were run through the palette validator against the light
 * surface: they clear the colour-blind separation checks, and the two below
 * 3:1 contrast (green, amber) are exactly why the legend labels are always
 * visible.
 */
export function MonthDonut({ segments }: { segments: DonutSegment[] }) {
  const [active, setActive] = useState<string | null>(null);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const drawn = segments.filter((segment) => segment.value > 0);

  const arcs: Array<DonutSegment & { dash: string; offset: number }> = [];
  let cursor = 0;
  for (const segment of drawn) {
    const length = (segment.value / total) * CIRCUMFERENCE;
    const visible = drawn.length > 1 ? Math.max(length - GAP, 0.5) : CIRCUMFERENCE;
    arcs.push({ ...segment, dash: `${visible} ${CIRCUMFERENCE - visible}`, offset: -cursor });
    cursor += length;
  }

  const activeSegment = segments.find((segment) => segment.key === active);
  // "Vencidos" only appears when there is something overdue; the rest stay
  // listed even at zero so the legend doesn't reshuffle month to month.
  const legend = segments.filter((segment) => segment.value > 0 || segment.key !== "overdue");

  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold">Resumen del mes</h2>

      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row xl:flex-col">
        <div className="relative h-40 w-40 shrink-0">
          <svg
            viewBox="0 0 160 160"
            className="h-full w-full -rotate-90"
            role="img"
            aria-label={`${total} pagos este mes`}
          >
            <circle
              cx="80"
              cy="80"
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              style={{ stroke: "var(--surface-2)" }}
            />
            {arcs.map((arc) => (
              <circle
                key={arc.key}
                cx="80"
                cy="80"
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={active && active !== arc.key ? STROKE - 5 : STROKE}
                strokeDasharray={arc.dash}
                strokeDashoffset={arc.offset}
                tabIndex={0}
                aria-label={`${arc.label}: ${arc.value}`}
                onMouseEnter={() => setActive(arc.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(arc.key)}
                onBlur={() => setActive(null)}
                className="cursor-pointer outline-none transition-[stroke-width] duration-150"
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl leading-none font-semibold">
              {activeSegment ? activeSegment.value : total}
            </span>
            <span className="mt-1 max-w-[6.5rem] text-xs leading-tight text-muted">
              {activeSegment ? activeSegment.label : total === 1 ? "pago" : "pagos"}
            </span>
          </div>
        </div>

        <ul className="w-full space-y-2.5 text-sm">
          {legend.map((segment) => (
            <li
              key={segment.key}
              onMouseEnter={() => setActive(segment.key)}
              onMouseLeave={() => setActive(null)}
              className="flex items-center gap-2.5"
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: segment.color }}
              />
              <span className="flex-1 text-muted">{segment.label}</span>
              <span className="font-medium tabular-nums">{segment.value}</span>
            </li>
          ))}
        </ul>
      </div>

      {total === 0 && (
        <p className="mt-3 text-center text-xs text-muted">Todavía no hay pagos este mes.</p>
      )}
    </section>
  );
}

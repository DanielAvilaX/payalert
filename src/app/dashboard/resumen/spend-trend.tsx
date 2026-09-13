"use client";

import { useState } from "react";
import { formatCOP, formatCompactCOP } from "@/lib/format";
import { niceCeiling } from "@/lib/metrics";

export type TrendPoint = {
  month: string;
  /** Axis label, "sep". */
  label: string;
  /** Tooltip label, "septiembre". */
  longLabel: string;
  total: number;
  count: number;
};

const PLOT_HEIGHT = 168;
const BAR_MAX_WIDTH = 24;

/**
 * Monthly spend as columns - change over time across a handful of discrete
 * months is a column chart's job. One series, so no legend: the current
 * month carries the accent and the only direct label, earlier months sit a
 * lighter step of the same hue as context. Every value is reachable without
 * hovering through the visually hidden table below.
 */
export function SpendTrend({ points }: { points: TrendPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const hasData = points.some((point) => point.total > 0);

  if (!hasData) {
    return (
      <p className="rounded-xl bg-surface-2 px-4 py-10 text-center text-sm text-muted">
        Cuando marques pagos como pagados, aquí verás cuánto se va cada mes.
      </p>
    );
  }

  const max = niceCeiling(Math.max(...points.map((point) => point.total)));
  const ticks = [max, max / 2, 0];
  const lastIndex = points.length - 1;
  const activePoint = active !== null ? points[active] : null;

  return (
    <div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
        <div
          aria-hidden
          className="flex flex-col justify-between text-right text-[11px] text-muted tabular-nums"
          style={{ height: PLOT_HEIGHT }}
        >
          {ticks.map((tick) => (
            <span key={tick} className="leading-none">
              {formatCompactCOP(tick)}
            </span>
          ))}
        </div>

        <div className="relative" style={{ height: PLOT_HEIGHT }}>
          {ticks.map((tick, i) => (
            <div
              key={tick}
              aria-hidden
              className="absolute inset-x-0 border-t border-border"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end">
            {points.map((point, i) => {
              const height = (point.total / max) * PLOT_HEIGHT;
              const current = i === lastIndex;
              return (
                <button
                  key={point.month}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  aria-label={`${point.longLabel}: ${formatCOP(point.total)}, ${point.count} pagos`}
                  // The whole column slot is the hit target, not just the bar.
                  className="relative flex h-full flex-1 items-end justify-center outline-none"
                >
                  {current && point.total > 0 && (
                    <span
                      className="absolute text-[11px] font-medium whitespace-nowrap text-foreground tabular-nums"
                      style={{ bottom: height + 4 }}
                    >
                      {formatCompactCOP(point.total)}
                    </span>
                  )}
                  <span
                    className={`block w-3/5 rounded-t-[4px] transition-opacity ${
                      current ? "bg-accent" : "bg-indigo-300"
                    } ${active !== null && active !== i ? "opacity-45" : ""}`}
                    style={{
                      height: point.total > 0 ? Math.max(height, 2) : 0,
                      maxWidth: BAR_MAX_WIDTH,
                    }}
                  />
                </button>
              );
            })}
          </div>

          {activePoint && active !== null && (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg"
              style={{ left: `${((active + 0.5) / points.length) * 100}%` }}
            >
              <p className="font-semibold tabular-nums">{formatCOP(activePoint.total)}</p>
              <p className="text-muted capitalize">
                {activePoint.longLabel} · {activePoint.count} pago{activePoint.count === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </div>

        <div />
        <div aria-hidden className="mt-2 flex text-[11px] text-muted">
          {points.map((point, i) => (
            <span
              key={point.month}
              className={`flex-1 text-center ${i === lastIndex ? "font-medium text-foreground" : ""}`}
            >
              {point.label}
            </span>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>Gasto por mes</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">Total pagado</th>
            <th scope="col">Pagos</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <td>{point.longLabel}</td>
              <td>{formatCOP(point.total)}</td>
              <td>{point.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ModalShell } from "@/app/dashboard/modal-shell";
import { LogoBadge } from "@/app/dashboard/payment-parts";
import { formatCOP } from "@/lib/format";

export type BreakdownRow = {
  /** Payment id, to deep-link into its own detail sheet on Pagos - null
      when there's nothing to open (an old event whose payment was deleted). */
  id: string | null;
  name: string;
  logo: string | null;
  automatic?: boolean;
  amount: number | null;
  amountIsVariable?: boolean;
  dateLabel: string;
  badgeLabel: string;
  badgeClass: string;
};

/**
 * The list a KPI or a category expands into when tapped. Every headline
 * number in Inicio and Resumen is a sum or a count of *something* - this is
 * that something, so "what does this add up to" is never a dead end. Rows
 * link straight into the payment's own detail sheet on Pagos.
 */
export function BreakdownModal({
  open,
  onClose,
  title,
  subtitle,
  rows,
  emptyText,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  rows: BreakdownRow[];
  emptyText: string;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      maxWidth="max-w-lg"
      titleSlot={
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
        </div>
      }
    >
      {rows.length ? (
        <ul className="-mx-1.5 divide-y divide-border">
          {rows.map((row, i) => {
            const rowClass = "flex w-full items-center gap-3 rounded-xl px-1.5 py-2.5 text-left";
            const inner = (
              <>
                <LogoBadge logo={row.logo} automatic={row.automatic} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium break-words">{row.name}</p>
                  <p className="text-xs text-muted">{row.dateLabel}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-medium tabular-nums">
                    {row.amount != null
                      ? `${row.amountIsVariable ? "~" : ""}${formatCOP(row.amount)}`
                      : "—"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${row.badgeClass}`}
                  >
                    {row.badgeLabel}
                  </span>
                </div>
                {row.id && <ChevronRight size={16} className="shrink-0 text-subtle" aria-hidden />}
              </>
            );
            return (
              <li key={`${row.id ?? "row"}-${i}`}>
                {row.id ? (
                  <Link
                    href={`/dashboard/pagos?pago=${row.id}`}
                    prefetch={false}
                    onClick={onClose}
                    className={`${rowClass} transition hover:bg-surface-2`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className={rowClass}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl bg-surface-2 px-4 py-8 text-center text-sm text-muted">{emptyText}</p>
      )}
    </ModalShell>
  );
}

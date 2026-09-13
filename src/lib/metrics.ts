// Framework-free and imported relatively, like the rest of src/lib, so the
// test runner can load it directly.
import { colombiaToday, daysUntil, endOfMonthISO } from "./dates.ts";

/**
 * Whether a completion landed on or before its due date, judged by the
 * Colombian calendar day it was marked. A bill paid at 8pm on the due date
 * is on time even though the server's UTC clock already says tomorrow.
 */
export function isOnTime(event: { completed_at: string; due_date: string }): boolean {
  return colombiaToday(new Date(event.completed_at)) <= event.due_date;
}

export type MonthSummary = {
  /** Completions recorded this month. */
  paid: number;
  /** Open, due within the next 7 days. */
  soon: number;
  /** Open, past due. */
  overdue: number;
  /** Open, due later this month (beyond the 7-day window). */
  later: number;
};

/**
 * The month at a glance, in buckets that never overlap - so a KPI row and a
 * donut built from the same numbers always add up to the same total.
 * Paused bills are excluded everywhere: they're deliberately off the radar.
 */
export function summarizeMonth(
  payments: Array<{ is_paid: boolean; is_paused?: boolean | null; due_date: string }>,
  paidThisMonth: number,
  todayStr: string
): MonthSummary {
  const monthEnd = endOfMonthISO(todayStr);
  const summary: MonthSummary = { paid: paidThisMonth, soon: 0, overdue: 0, later: 0 };

  for (const payment of payments) {
    if (payment.is_paid || payment.is_paused) continue;
    const days = daysUntil(payment.due_date, todayStr);
    if (days < 0) summary.overdue += 1;
    else if (days <= 7) summary.soon += 1;
    else if (payment.due_date <= monthEnd) summary.later += 1;
  }

  return summary;
}

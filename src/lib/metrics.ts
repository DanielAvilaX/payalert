// Framework-free and imported relatively, like the rest of src/lib, so the
// test runner can load it directly.
import {
  colombiaLocalToUtc,
  colombiaToday,
  daysUntil,
  endOfMonthISO,
  nextDueDate,
  type Recurrence,
} from "./dates.ts";
import { CATEGORY_LABEL, categoryOf, type CategoryId } from "./categories.ts";

/**
 * Whether a completion landed on or before its due date, judged by the
 * Colombian calendar day it was marked. A bill paid at 8pm on the due date
 * is on time even though the server's UTC clock already says tomorrow.
 */
export function isOnTime(event: { completed_at: string; due_date: string }): boolean {
  return colombiaToday(new Date(event.completed_at)) <= event.due_date;
}

type OpenPayment = { is_paid: boolean; is_paused?: boolean | null; due_date: string };

/**
 * Splits this month's *open* bills into buckets that never overlap - not
 * just counted, but handed back as the actual rows, so a KPI's number and
 * the list it expands into ("Pendientes" -> these 4 payments) are always
 * built from the exact same pass instead of two functions quietly
 * disagreeing. Paused bills are excluded everywhere: they're deliberately
 * off the radar. Overdue isn't bounded by month-end - a bill that's been
 * owed since July is still overdue in September.
 */
export function bucketPayments<T extends OpenPayment>(
  payments: T[],
  todayStr: string
): { soon: T[]; overdue: T[]; later: T[] } {
  const monthEnd = endOfMonthISO(todayStr);
  const soon: T[] = [];
  const overdue: T[] = [];
  const later: T[] = [];

  for (const payment of payments) {
    if (payment.is_paid || payment.is_paused) continue;
    const days = daysUntil(payment.due_date, todayStr);
    if (days < 0) overdue.push(payment);
    else if (days <= 7) soon.push(payment);
    else if (payment.due_date <= monthEnd) later.push(payment);
  }

  return { soon, overdue, later };
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
 */
export function summarizeMonth(
  payments: OpenPayment[],
  paidThisMonth: number,
  todayStr: string
): MonthSummary {
  const { soon, overdue, later } = bucketPayments(payments, todayStr);
  return { paid: paidThisMonth, soon: soon.length, overdue: overdue.length, later: later.length };
}

// --- Money over time --------------------------------------------------------
//
// The metrics below were picked because each one answers a question a person
// can act on, not because the data happened to allow them:
//   - what do my bills cost me per month / per year      -> commitment
//   - where does it go                                   -> categories
//   - is it growing                                       -> monthly series
//   - how much cash do I need soon                        -> 30-day forecast
//   - am I paying on time (i.e. avoiding late fees)       -> punctuality
//   - did a bill quietly get more expensive               -> price increases
//   - is this sustainable on what I earn                  -> income share

type BillLike = { amount: number | null; recurrence: string; is_paused?: boolean | null };

/** What a recurring bill costs per month on average. A one-off isn't a commitment. */
export function monthlyEquivalent(amount: number | null, recurrence: string): number {
  if (amount == null) return 0;
  const value = Number(amount);
  switch (recurrence) {
    case "weekly":
      return (value * 52) / 12;
    case "monthly":
      return value;
    case "bimonthly":
      return value / 2;
    case "quarterly":
      return value / 3;
    case "semiannual":
      return value / 6;
    case "yearly":
      return value / 12;
    default:
      return 0;
  }
}

/**
 * Every active, recurring bill with its monthly-equivalent cost, largest
 * first - the same list backs the "Compromiso mensual" total, the per-
 * category breakdown and the "pagos más pesados" ranking, so all three
 * always agree on exactly which bills and how much.
 */
export function recurringCommitmentDetail<T extends BillLike>(
  payments: T[]
): Array<{ payment: T; monthly: number }> {
  return payments
    .filter((payment) => !payment.is_paused)
    .map((payment) => ({ payment, monthly: monthlyEquivalent(payment.amount, payment.recurrence) }))
    .filter(({ monthly }) => monthly > 0)
    .sort((a, b) => b.monthly - a.monthly);
}

/**
 * The fixed cost of everything recurring and active. Unlike the old
 * "Total mensual", weekly and yearly bills count too - a yearly SOAT is a
 * real monthly burden even though it only shows up once.
 */
export function recurringCommitment(payments: BillLike[]): {
  monthly: number;
  annual: number;
  count: number;
} {
  const items = recurringCommitmentDetail(payments);
  const monthly = items.reduce((sum, item) => sum + item.monthly, 0);
  return { monthly, annual: monthly * 12, count: items.length };
}

/** "2026-09" shifted by whole months. */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = year * 12 + (monthNumber - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Start of the first month in a series of `months`, as a UTC instant for queries. */
export function seriesStartISO(todayStr: string, months = 6): string {
  const first = shiftMonth(todayStr.slice(0, 7), -(months - 1));
  return colombiaLocalToUtc(`${first}-01`).toISOString();
}

export type SpendMonth = { month: string; total: number; count: number };

/**
 * What was actually paid per Colombian calendar month, oldest first and
 * zero-filled - a month with nothing paid is a real data point, not a gap.
 */
export function monthlySpendSeries(
  events: Array<{ completed_at: string; amount: number | null }>,
  todayStr: string,
  months = 6
): SpendMonth[] {
  const current = todayStr.slice(0, 7);
  const series: SpendMonth[] = Array.from({ length: months }, (_, i) => ({
    month: shiftMonth(current, i - (months - 1)),
    total: 0,
    count: 0,
  }));
  const byMonth = new Map(series.map((bucket) => [bucket.month, bucket]));

  for (const event of events) {
    const bucket = byMonth.get(colombiaToday(new Date(event.completed_at)).slice(0, 7));
    if (!bucket) continue;
    bucket.total += Number(event.amount ?? 0);
    bucket.count += 1;
  }
  return series;
}

export type CategoryShare = {
  category: CategoryId;
  label: string;
  monthly: number;
  count: number;
  share: number;
};

type Categorizable = BillLike & { logo: string | null };

/**
 * `recurringCommitmentDetail`'s items, grouped by the category their logo
 * implies. The same grouping backs both `categoryBreakdown`'s totals and
 * the "see what's in here" list behind each category row.
 */
export function categoryPaymentsDetail<T extends Categorizable>(
  payments: T[]
): Map<CategoryId, Array<{ payment: T; monthly: number }>> {
  const map = new Map<CategoryId, Array<{ payment: T; monthly: number }>>();
  for (const item of recurringCommitmentDetail(payments)) {
    const category = categoryOf(item.payment.logo);
    const list = map.get(category) ?? [];
    list.push(item);
    map.set(category, list);
  }
  return map;
}

export function categoryBreakdown<T extends Categorizable>(payments: T[]): CategoryShare[] {
  const byCategory = categoryPaymentsDetail(payments);
  const grandTotal = [...byCategory.values()]
    .flat()
    .reduce((sum, item) => sum + item.monthly, 0);

  return [...byCategory.entries()]
    .map(([category, items]) => {
      const monthly = items.reduce((sum, item) => sum + item.monthly, 0);
      return {
        category,
        label: CATEGORY_LABEL[category],
        monthly,
        count: items.length,
        share: grandTotal ? monthly / grandTotal : 0,
      };
    })
    .sort((a, b) => b.monthly - a.monthly);
}

export function onTimeRate(events: Array<{ completed_at: string; due_date: string }>): {
  onTime: number;
  total: number;
  rate: number | null;
} {
  const onTime = events.filter(isOnTime).length;
  return { onTime, total: events.length, rate: events.length ? onTime / events.length : null };
}

type ForecastPayment = {
  amount: number | null;
  recurrence: string;
  due_date: string;
  is_paid: boolean;
  is_paused?: boolean | null;
};

export type ForecastItem<T> = { payment: T; amount: number; dueDate: string; overdue: boolean };

/**
 * Walks every payment forward from today, expanding recurring bills into
 * one item per occurrence that lands within `days` (a weekly bill counts
 * four or five times in 30 days). An overdue bill is reported separately -
 * it's owed now - and its next cycles still count, because they'll come due
 * regardless. Shared by `forecastWindow` (the totals) and
 * `forecastWindowDetail` (the actual list a KPI expands into), so they can
 * never disagree with each other.
 */
function expandForecast<T extends ForecastPayment>(
  payments: T[],
  todayStr: string,
  days: number
): ForecastItem<T>[] {
  const items: ForecastItem<T>[] = [];

  for (const payment of payments) {
    if (payment.is_paused || payment.amount == null) continue;
    const amount = Number(payment.amount);
    const recurrence = payment.recurrence as Recurrence;
    const recurring = recurrence !== "none";

    let cursor: string | null = payment.due_date;
    if (payment.is_paid) {
      // This cycle is settled; only later cycles can still come due.
      cursor = recurring ? nextDueDate(cursor, recurrence) : null;
    } else if (daysUntil(cursor, todayStr) < 0) {
      items.push({ payment, amount, dueDate: cursor, overdue: true });
      cursor = recurring ? nextDueDate(cursor, recurrence) : null;
    }

    for (let guard = 0; cursor && guard < 60; guard++) {
      const offset = daysUntil(cursor, todayStr);
      if (offset > days) break;
      if (offset >= 0) items.push({ payment, amount, dueDate: cursor, overdue: false });
      if (!recurring) break;
      cursor = nextDueDate(cursor, recurrence);
    }
  }

  return items;
}

/** Cash needed in the next `days`, as totals. See `expandForecast`. */
export function forecastWindow(
  payments: ForecastPayment[],
  todayStr: string,
  days = 30
): { upcoming: number; upcomingCount: number; overdue: number; overdueCount: number } {
  const result = { upcoming: 0, upcomingCount: 0, overdue: 0, overdueCount: 0 };
  for (const item of expandForecast(payments, todayStr, days)) {
    if (item.overdue) {
      result.overdue += item.amount;
      result.overdueCount += 1;
    } else {
      result.upcoming += item.amount;
      result.upcomingCount += 1;
    }
  }
  return result;
}

/** Cash needed in the next `days`, as the actual list - soonest first. */
export function forecastWindowDetail<T extends ForecastPayment>(
  payments: T[],
  todayStr: string,
  days = 30
): ForecastItem<T>[] {
  return expandForecast(payments, todayStr, days).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export type PriceChange = {
  paymentId: string;
  name: string;
  previous: number;
  latest: number;
  change: number;
};

/**
 * Bills whose last payment came in noticeably above the one before it - the
 * quiet price rise a plain reminder never surfaces. Compared per payment,
 * newest against the previous completion, from amounts actually paid.
 */
export function priceIncreases(
  events: Array<{
    payment_id: string | null;
    name: string;
    amount: number | null;
    completed_at: string;
  }>,
  threshold = 0.1
): PriceChange[] {
  const byPayment = new Map<string, typeof events>();
  for (const event of events) {
    if (!event.payment_id || event.amount == null) continue;
    const list = byPayment.get(event.payment_id) ?? [];
    list.push(event);
    byPayment.set(event.payment_id, list);
  }

  const changes: PriceChange[] = [];
  for (const [paymentId, list] of byPayment) {
    if (list.length < 2) continue;
    const [latest, previous] = [...list].sort((a, b) =>
      b.completed_at.localeCompare(a.completed_at)
    );
    const before = Number(previous.amount);
    const after = Number(latest.amount);
    if (before <= 0) continue;
    const change = (after - before) / before;
    if (change >= threshold) {
      changes.push({ paymentId, name: latest.name, previous: before, latest: after, change });
    }
  }
  return changes.sort((a, b) => b.change - a.change);
}

export type IncomeBand = "healthy" | "tight" | "critical";

/**
 * Share of income already spoken for by fixed payments. The 50% line is
 * the "needs" half of the 50/30/20 rule; past 70% there's little room left
 * for anything unexpected, let alone saving.
 */
export function incomeCommitment(
  monthlyCommitment: number,
  monthlyIncome: number | null | undefined
): { ratio: number; band: IncomeBand } | null {
  if (!monthlyIncome || monthlyIncome <= 0) return null;
  const ratio = monthlyCommitment / monthlyIncome;
  return { ratio, band: ratio <= 0.5 ? "healthy" : ratio <= 0.7 ? "tight" : "critical" };
}

/** A round axis ceiling (1, 2, 2.5 or 5 × 10ⁿ) so tick labels read as clean numbers. */
export function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= value) return step * magnitude;
  }
  return 10 * magnitude;
}

// Relative, with the extension, on purpose: everything under src/lib is
// framework-free and imports its siblings this way, so Node's test runner
// can load it directly without a bundler or a path-alias resolver.
import { daysUntil } from "./dates.ts";

/**
 * How a due date should read and feel, in one place.
 *
 * Every bill-reminder app worth using answers "how worried should I be
 * about this one?" before it answers "what is the date?" - a raw
 * "2026-09-10" makes the reader do the subtraction themselves, which is
 * exactly the work the app exists to remove. Keeping the wording and the
 * colour together here also stops the table, the cards, the stats and the
 * notification bell from drifting into slightly different vocabularies.
 */
export type UrgencyTone = "overdue" | "today" | "soon" | "upcoming" | "far";

export type DueDescription = {
  tone: UrgencyTone;
  /** Human phrasing: "Vence hoy", "Venció hace 3 días", "En 5 días". */
  label: string;
  /** Negative when overdue, 0 today, positive when upcoming. */
  days: number;
};

const MONTHS_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

const MONTHS_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * "2026-09-10" -> "10 sep". Formatted from the string's own parts on
 * purpose: `new Date("2026-09-10")` is parsed as UTC midnight, so any
 * viewer west of Greenwich - all of the Americas - would see the *previous*
 * day once the browser rendered it in local time.
 */
export function formatDueDate(dueDate: string, withYear = false): string {
  const [year, month, day] = dueDate.split("-").map(Number);
  const base = `${day} ${MONTHS_SHORT[month - 1] ?? "?"}`;
  return withYear ? `${base} ${year}` : base;
}

/** Month name from a YYYY-MM-DD string, with the same no-Date guarantee. */
export function formatMonthName(isoDate: string): string {
  const month = Number(isoDate.split("-")[1]);
  return MONTHS_LONG[month - 1] ?? "";
}

/** Short month label for chart axes: "2026-09" or "2026-09-01" -> "sep". */
export function formatMonthShort(isoDate: string): string {
  const month = Number(isoDate.split("-")[1]);
  return MONTHS_SHORT[month - 1] ?? "";
}

export function describeDue(dueDate: string, todayStr: string): DueDescription {
  const days = daysUntil(dueDate, todayStr);

  if (days < 0) {
    const ago = Math.abs(days);
    return {
      tone: "overdue",
      days,
      label: ago === 1 ? "Venció ayer" : `Venció hace ${ago} días`,
    };
  }
  if (days === 0) return { tone: "today", days, label: "Vence hoy" };
  if (days === 1) return { tone: "soon", days, label: "Vence mañana" };
  if (days <= 7) return { tone: "soon", days, label: `En ${days} días` };
  if (days <= 30) return { tone: "upcoming", days, label: `En ${days} días` };
  return { tone: "far", days, label: formatDueDate(dueDate) };
}

export type StatusKind = "paid" | "paused" | "overdue" | "today" | "soon" | "pending";

export type PaymentStatus = {
  kind: StatusKind;
  /** The pill text - short, and never the only carrier of meaning. */
  label: string;
  /** Secondary line under the date: "En 3 días", "Venció ayer", "Al día". */
  detail: string;
  badgeClass: string;
  dotClass: string;
};

// Status hues are reserved for state and always ship with their label, so
// no reader has to rely on telling amber from red. "Pendiente" is a far-off
// bill with nothing wrong with it, so it stays neutral indigo rather than
// borrowing an alarm colour.
const BADGE: Record<StatusKind, string> = {
  paid: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  paused: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  overdue: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  today: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  soon: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  pending: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200",
};

const DOT: Record<StatusKind, string> = {
  paid: "bg-emerald-500",
  paused: "bg-slate-400",
  overdue: "bg-red-500",
  today: "bg-red-500",
  soon: "bg-amber-500",
  pending: "bg-indigo-500",
};

/** Paused and paid outrank urgency: a settled or on-hold bill shouldn't shout. */
export function paymentStatus(
  payment: { is_paid: boolean; is_paused?: boolean | null; due_date: string },
  todayStr: string
): PaymentStatus {
  const due = describeDue(payment.due_date, todayStr);
  const make = (kind: StatusKind, label: string, detail: string): PaymentStatus => ({
    kind,
    label,
    detail,
    badgeClass: BADGE[kind],
    dotClass: DOT[kind],
  });

  if (payment.is_paused) return make("paused", "Pausado", "Sin recordatorios");
  if (payment.is_paid) return make("paid", "Pagado", "Al día");
  if (due.days < 0) return make("overdue", "Vencido", due.label);
  if (due.days === 0) return make("today", "Vence hoy", "Hoy");
  if (due.days <= 7) return make("soon", "Próximo", due.label);
  return make("pending", "Pendiente", due.label);
}

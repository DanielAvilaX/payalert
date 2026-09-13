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
 * colour together here also stops the list, the stats and any future view
 * from drifting into three slightly different vocabularies.
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

const MONTHS_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Month name from a YYYY-MM-DD string, with the same no-Date guarantee. */
export function formatMonthName(isoDate: string): string {
  const month = Number(isoDate.split("-")[1]);
  return MONTHS_LONG[month - 1] ?? "";
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

/** Tailwind classes per tone, so a badge reads the same everywhere. */
export const TONE_BADGE: Record<UrgencyTone, string> = {
  overdue: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
  today: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  soon: "bg-amber-500/10 text-amber-200/90",
  upcoming: "bg-white/5 text-muted",
  far: "bg-white/5 text-muted",
};

/** Left edge accent on the card - the at-a-glance signal when scanning. */
export const TONE_EDGE: Record<UrgencyTone, string> = {
  overdue: "before:bg-red-500",
  today: "before:bg-amber-400",
  soon: "before:bg-amber-400/60",
  upcoming: "before:bg-white/15",
  far: "before:bg-white/10",
};

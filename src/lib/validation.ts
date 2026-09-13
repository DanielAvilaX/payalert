// Input validation shared by the server actions.
//
// RLS is the authority on *who* can touch a row; this is the authority on
// *what shape* the data is allowed to have. Server actions are a public HTTP
// surface - the browser form's `required`/`min`/`max` attributes are a
// convenience for the user, not a guarantee, so every value gets re-checked
// here before it reaches the database.

export const MAX_NAME_LENGTH = 80;
// Well above any realistic COP bill, but low enough that a typo like holding
// down "0" can't poison the monthly totals with an absurd number.
export const MAX_AMOUNT = 1_000_000_000;
export const MAX_REMIND_DAYS_BEFORE = 365;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True only for a real calendar date in YYYY-MM-DD form (rejects 2026-02-31). */
export function isValidISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  );
}

/** Trimmed name, or null when empty/too long. */
export function parseName(raw: unknown): string | null {
  const name = String(raw ?? "").trim();
  if (!name || name.length > MAX_NAME_LENGTH) return null;
  return name;
}

/**
 * Whole number within [min, max], or null. Note an empty string coerces to 0
 * through Number(), which is a valid value for most of our fields - so blank
 * input is rejected explicitly rather than silently becoming zero.
 */
export function parseIntInRange(raw: unknown, min: number, max: number): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const value = Number(text);
  if (!Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

/** "HH:MM" (24h) as stored by <input type="time">, or null. */
export function parseTimeOfDay(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(text)) return null;
  const [hh, mm] = text.split(":").map(Number);
  if (hh > 23 || mm > 59) return null;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

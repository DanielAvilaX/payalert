export type Recurrence =
  | "none"
  | "weekly"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "semiannual"
  | "yearly";

// Colombia is UTC-5 year-round (no DST). Serverless functions run in UTC,
// so any "today"/calendar-boundary math that matters to a Colombian user
// must be computed from Colombia's calendar date, not the server's UTC
// date - otherwise every evening (~7pm-midnight Colombia, when UTC has
// already rolled to the next day) this math lands a day off.
export const COLOMBIA_OFFSET_MINUTES = 5 * 60;

export function colombiaToday(now: Date = new Date()): string {
  return new Date(now.getTime() - COLOMBIA_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

// `dateStr` + `timeStr` are Colombia local time; returns the UTC instant.
/**
 * "14:05" - the wall-clock time in Colombia for any instant. Same reason
 * the rest of this file exists: toLocaleTimeString reads the *server's*
 * zone inside a Server Component, which is UTC on Vercel, so an activity
 * logged at 9am in Bogotá would be stamped 2pm.
 */
export function colombiaTime(instant: Date): string {
  const shifted = new Date(instant.getTime() - COLOMBIA_OFFSET_MINUTES * 60_000);
  return `${String(shifted.getUTCHours()).padStart(2, "0")}:${String(shifted.getUTCMinutes()).padStart(2, "0")}`;
}

export function colombiaLocalToUtc(dateStr: string, timeStr: string = "00:00"): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) + COLOMBIA_OFFSET_MINUTES * 60 * 1000);
}

export function colombiaStartOfMonthISO(now: Date = new Date()): string {
  const [y, m] = colombiaToday(now).split("-");
  return colombiaLocalToUtc(`${y}-${m}-01`).toISOString();
}

export function daysUntil(dueDate: string, todayStr: string): number {
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const [year, month, day] = dueDate.split("-").map(Number);
  const dueUtc = Date.UTC(year, month - 1, day);
  return Math.round((dueUtc - todayUtc) / 86_400_000);
}

function toISODate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Calendar parts of a YYYY-MM-DD string, read without constructing a local Date. */
export function dateParts(dateStr: string): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  const [year, month, day] = dateStr.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, weekday };
}

/** Last day of the month containing `dateStr`, as YYYY-MM-DD. */
export function endOfMonthISO(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return toISODate(year, month - 1, lastDay);
}

// Adds `months` to a UTC date, clamping the day to the target month's last
// day (e.g. Jan 31 + 1 month -> Feb 28/29, not an overflow into March).
export function addMonthsClamped(
  year: number,
  monthIndex: number,
  day: number,
  months: number
): string {
  const targetIndex = monthIndex + months;
  const targetYear = year + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return toISODate(targetYear, targetMonth, Math.min(day, lastDayOfTargetMonth));
}

export function nextDueDate(dueDate: string, recurrence: Recurrence): string {
  const [year, month, day] = dueDate.split("-").map(Number);

  switch (recurrence) {
    case "weekly": {
      const date = new Date(Date.UTC(year, month - 1, day));
      date.setUTCDate(date.getUTCDate() + 7);
      return date.toISOString().slice(0, 10);
    }
    case "monthly":
      return addMonthsClamped(year, month - 1, day, 1);
    case "bimonthly":
      return addMonthsClamped(year, month - 1, day, 2);
    case "quarterly":
      return addMonthsClamped(year, month - 1, day, 3);
    case "semiannual":
      return addMonthsClamped(year, month - 1, day, 6);
    case "yearly":
      return addMonthsClamped(year, month - 1, day, 12);
    default:
      return dueDate;
  }
}

// The three nearest* helpers take `now` so they can be tested against a
// fixed clock - "what date does this resolve to?" is exactly the logic that
// has produced timezone bugs here twice, and it can't be pinned down in a
// test if it reads the wall clock internally.

// Given just a day-of-month (for the common "monthly bill" case), picks the
// nearest occurrence: this month if that day hasn't passed yet, else next.
export function nearestMonthlyDueDate(dayOfMonth: number, now: Date = new Date()): string {
  const [year, month, todayDay] = colombiaToday(now).split("-").map(Number);
  const monthIndex = month - 1;

  const monthsAhead = dayOfMonth < todayDay ? 1 : 0;
  return addMonthsClamped(year, monthIndex, dayOfMonth, monthsAhead);
}

// Given a day + month (no year), picks the nearest occurrence: this year if
// that date hasn't passed yet, else next year.
export function nearestYearlyDueDate(day: number, month: number, now: Date = new Date()): string {
  const [year, todayMonth, todayDay] = colombiaToday(now).split("-").map(Number);
  const monthIndex = month - 1;
  const todayUtc = Date.UTC(year, todayMonth - 1, todayDay);

  const thisYearCandidate = addMonthsClamped(year, monthIndex, day, 0);
  const [cy, cm, cd] = thisYearCandidate.split("-").map(Number);
  const candidateUtc = Date.UTC(cy, cm - 1, cd);

  return candidateUtc >= todayUtc
    ? thisYearCandidate
    : addMonthsClamped(year + 1, monthIndex, day, 0);
}

// Given a day of the week (0 = Sunday .. 6 = Saturday, matching Date#getUTCDay),
// picks the nearest occurrence, counting today if it matches.
export function nearestWeekdayDueDate(targetDow: number, now: Date = new Date()): string {
  const [year, month, day] = colombiaToday(now).split("-").map(Number);
  const currentDow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  let diff = targetDow - currentDow;
  if (diff < 0) diff += 7;

  const date = new Date(Date.UTC(year, month - 1, day + diff));
  return date.toISOString().slice(0, 10);
}

/**
 * Whether an edit re-submitted the schedule the payment already has.
 *
 * Saving re-derives the due date from the form ("the 10th" -> the nearest
 * 10th), so without this check just renaming an overdue monthly bill moved
 * it to next month and erased the fact that it was still owed.
 */
export function isSameSchedule(
  existing: { due_date: string; recurrence: string },
  recurrence: Recurrence,
  submitted: { day?: number | null; month?: number | null; weekday?: number | null }
): boolean {
  if (existing.recurrence !== recurrence) return false;
  const parts = dateParts(existing.due_date);
  switch (recurrence) {
    case "monthly":
      return submitted.day === parts.day;
    case "yearly":
      return submitted.day === parts.day && submitted.month === parts.month;
    case "weekly":
      return submitted.weekday === parts.weekday;
    default:
      // Full-date recurrences submit the exact date the user can see.
      return false;
  }
}

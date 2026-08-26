export type Recurrence = "none" | "weekly" | "monthly" | "yearly";

function toISODate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
    case "yearly":
      return addMonthsClamped(year, month - 1, day, 12);
    default:
      return dueDate;
  }
}

// Given just a day-of-month (for the common "monthly bill" case), picks the
// nearest occurrence: this month if that day hasn't passed yet, else next.
export function nearestMonthlyDueDate(dayOfMonth: number): string {
  const today = new Date();
  const year = today.getUTCFullYear();
  const monthIndex = today.getUTCMonth();
  const todayDay = today.getUTCDate();

  const monthsAhead = dayOfMonth < todayDay ? 1 : 0;
  return addMonthsClamped(year, monthIndex, dayOfMonth, monthsAhead);
}

// Given a day + month (no year), picks the nearest occurrence: this year if
// that date hasn't passed yet, else next year.
export function nearestYearlyDueDate(day: number, month: number): string {
  const today = new Date();
  const year = today.getUTCFullYear();
  const monthIndex = month - 1;
  const todayUtc = Date.UTC(year, today.getUTCMonth(), today.getUTCDate());

  const thisYearCandidate = addMonthsClamped(year, monthIndex, day, 0);
  const [cy, cm, cd] = thisYearCandidate.split("-").map(Number);
  const candidateUtc = Date.UTC(cy, cm - 1, cd);

  return candidateUtc >= todayUtc
    ? thisYearCandidate
    : addMonthsClamped(year + 1, monthIndex, day, 0);
}

// Given a day of the week (0 = Sunday .. 6 = Saturday, matching Date#getUTCDay),
// picks the nearest occurrence, counting today if it matches.
export function nearestWeekdayDueDate(targetDow: number): string {
  const today = new Date();
  const year = today.getUTCFullYear();
  const monthIndex = today.getUTCMonth();
  const day = today.getUTCDate();
  const currentDow = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();

  let diff = targetDow - currentDow;
  if (diff < 0) diff += 7;

  const date = new Date(Date.UTC(year, monthIndex, day + diff));
  return date.toISOString().slice(0, 10);
}

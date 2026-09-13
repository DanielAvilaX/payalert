import test from "node:test";
import assert from "node:assert/strict";

import {
  addMonthsClamped,
  colombiaLocalToUtc,
  colombiaStartOfMonthISO,
  colombiaToday,
  daysUntil,
  nearestMonthlyDueDate,
  nearestWeekdayDueDate,
  nearestYearlyDueDate,
  nextDueDate,
} from "../src/lib/dates.ts";

// Every case below is a bug this codebase actually shipped, or the boundary
// right next to one. Colombia is UTC-5, so between 19:00 and 23:59 local the
// server's UTC clock is already on the next calendar day - that single fact
// caused wrong reminder days, a payment scheduled a month late, and an
// off-by-one in the "spent this month" total.

test("colombiaToday stays on the local day while UTC has already rolled over", () => {
  // 2026-08-28T02:00Z is still 2026-08-27 21:00 in Bogotá.
  assert.equal(colombiaToday(new Date("2026-08-28T02:00:00Z")), "2026-08-27");
  // 04:59Z is the last minute of the previous local day.
  assert.equal(colombiaToday(new Date("2026-08-28T04:59:59Z")), "2026-08-27");
  // 05:00Z is local midnight - the day finally flips.
  assert.equal(colombiaToday(new Date("2026-08-28T05:00:00Z")), "2026-08-28");
});

test("colombiaLocalToUtc shifts local wall-clock times by the offset", () => {
  assert.equal(
    colombiaLocalToUtc("2026-09-10", "08:00").toISOString(),
    "2026-09-10T13:00:00.000Z"
  );
  assert.equal(colombiaLocalToUtc("2026-09-10").toISOString(), "2026-09-10T05:00:00.000Z");
});

test("colombiaStartOfMonthISO uses the local month, not the UTC one", () => {
  // Local: Aug 31 19:00. UTC has already entered September, but "this
  // month" for the user is still August.
  const spanning = colombiaStartOfMonthISO(new Date("2026-09-01T00:00:00Z"));
  assert.equal(spanning, "2026-08-01T05:00:00.000Z");
});

test("daysUntil counts whole calendar days across month boundaries", () => {
  assert.equal(daysUntil("2026-09-13", "2026-09-13"), 0);
  assert.equal(daysUntil("2026-09-14", "2026-09-13"), 1);
  assert.equal(daysUntil("2026-10-01", "2026-09-30"), 1);
  assert.equal(daysUntil("2026-09-10", "2026-09-13"), -3);
  assert.equal(daysUntil("2027-01-01", "2026-12-31"), 1);
});

test("addMonthsClamped never overflows into the following month", () => {
  assert.equal(addMonthsClamped(2026, 0, 31, 1), "2026-02-28");
  assert.equal(addMonthsClamped(2028, 0, 31, 1), "2028-02-29"); // leap year
  assert.equal(addMonthsClamped(2026, 0, 31, 3), "2026-04-30");
  assert.equal(addMonthsClamped(2026, 11, 15, 1), "2027-01-15"); // year wrap
});

test("nextDueDate advances by each recurrence's own step", () => {
  assert.equal(nextDueDate("2026-09-13", "weekly"), "2026-09-20");
  assert.equal(nextDueDate("2026-09-13", "monthly"), "2026-10-13");
  assert.equal(nextDueDate("2026-09-13", "bimonthly"), "2026-11-13");
  assert.equal(nextDueDate("2026-09-13", "quarterly"), "2026-12-13");
  assert.equal(nextDueDate("2026-09-13", "semiannual"), "2027-03-13");
  assert.equal(nextDueDate("2026-09-13", "yearly"), "2027-09-13");
  assert.equal(nextDueDate("2026-09-13", "none"), "2026-09-13");
});

test("nextDueDate keeps end-of-month bills anchored to the 31st", () => {
  // The clamp must not be sticky: Jan 31 -> Feb 28 -> Mar 31, not Feb 28 ->
  // Mar 28, which would silently walk a bill backwards through the year.
  assert.equal(nextDueDate("2026-01-31", "monthly"), "2026-02-28");
  assert.equal(nextDueDate("2026-03-31", "monthly"), "2026-04-30");
});

test("nearestMonthlyDueDate picks this month until the day has passed", () => {
  const midSeptember = new Date("2026-09-13T17:00:00Z"); // 12:00 local
  assert.equal(nearestMonthlyDueDate(20, midSeptember), "2026-09-20");
  assert.equal(nearestMonthlyDueDate(13, midSeptember), "2026-09-13"); // today counts
  assert.equal(nearestMonthlyDueDate(5, midSeptember), "2026-10-05"); // already passed
});

test("nearestMonthlyDueDate resolves against the local day, not the UTC one", () => {
  // 2026-09-16T02:00Z is Sept 15, 21:00 in Bogotá. Asking for "the 15th"
  // must land on today, not push a full month out - the exact bug that
  // scheduled a bill a month late when created in the evening.
  const lateEvening = new Date("2026-09-16T02:00:00Z");
  assert.equal(nearestMonthlyDueDate(15, lateEvening), "2026-09-15");
});

test("nearestMonthlyDueDate clamps a day the target month doesn't have", () => {
  const lateJanuary = new Date("2026-01-30T17:00:00Z");
  assert.equal(nearestMonthlyDueDate(31, lateJanuary), "2026-01-31");
  const endOfJanuary = new Date("2026-02-01T17:00:00Z");
  assert.equal(nearestMonthlyDueDate(31, endOfJanuary), "2026-02-28");
});

test("nearestYearlyDueDate rolls to next year once the date has passed", () => {
  const september = new Date("2026-09-13T17:00:00Z");
  assert.equal(nearestYearlyDueDate(25, 12, september), "2026-12-25");
  assert.equal(nearestYearlyDueDate(1, 3, september), "2027-03-01");
  assert.equal(nearestYearlyDueDate(13, 9, september), "2026-09-13"); // today counts
});

test("nearestWeekdayDueDate counts today and otherwise moves forward", () => {
  const sunday = new Date("2026-09-13T17:00:00Z"); // 2026-09-13 is a Sunday
  assert.equal(nearestWeekdayDueDate(0, sunday), "2026-09-13"); // today
  assert.equal(nearestWeekdayDueDate(1, sunday), "2026-09-14"); // tomorrow
  assert.equal(nearestWeekdayDueDate(6, sunday), "2026-09-19"); // next Saturday
});

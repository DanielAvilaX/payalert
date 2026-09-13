import test from "node:test";
import assert from "node:assert/strict";

import { dateParts, endOfMonthISO, isSameSchedule } from "../src/lib/dates.ts";

test("dateParts reads a date's calendar parts without a local Date", () => {
  assert.deepEqual(dateParts("2026-09-13"), { year: 2026, month: 9, day: 13, weekday: 0 });
  assert.deepEqual(dateParts("2028-02-29"), { year: 2028, month: 2, day: 29, weekday: 2 });
});

test("endOfMonthISO handles short months and leap years", () => {
  assert.equal(endOfMonthISO("2026-09-13"), "2026-09-30");
  assert.equal(endOfMonthISO("2026-02-01"), "2026-02-28");
  assert.equal(endOfMonthISO("2028-02-10"), "2028-02-29");
  assert.equal(endOfMonthISO("2026-12-31"), "2026-12-31");
});

test("isSameSchedule keeps an overdue bill's date when an edit didn't touch its schedule", () => {
  // The regression: renaming an overdue "day 10" monthly bill re-derived
  // "the nearest 10th" and silently moved the debt to next month.
  const overdueMonthly = { due_date: "2026-09-10", recurrence: "monthly" };
  assert.equal(isSameSchedule(overdueMonthly, "monthly", { day: 10 }), true);
  assert.equal(isSameSchedule(overdueMonthly, "monthly", { day: 15 }), false);
  assert.equal(isSameSchedule(overdueMonthly, "bimonthly", { day: 10 }), false);
});

test("isSameSchedule compares the parts each recurrence actually asks for", () => {
  const christmas = { due_date: "2026-12-25", recurrence: "yearly" };
  assert.equal(isSameSchedule(christmas, "yearly", { day: 25, month: 12 }), true);
  assert.equal(isSameSchedule(christmas, "yearly", { day: 25, month: 11 }), false);

  const sunday = { due_date: "2026-09-13", recurrence: "weekly" };
  assert.equal(isSameSchedule(sunday, "weekly", { weekday: 0 }), true);
  assert.equal(isSameSchedule(sunday, "weekly", { weekday: 1 }), false);

  // Full-date recurrences submit the exact date, so there's nothing to keep.
  assert.equal(isSameSchedule({ due_date: "2026-09-13", recurrence: "none" }, "none", {}), false);
});

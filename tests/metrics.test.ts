import test from "node:test";
import assert from "node:assert/strict";

import { isOnTime, summarizeMonth } from "../src/lib/metrics.ts";

test("isOnTime judges by the Colombian calendar day the bill was marked", () => {
  assert.equal(isOnTime({ completed_at: "2026-09-05T12:00:00Z", due_date: "2026-09-05" }), true);
  // 8pm in Bogotá on the due date is on time, even though UTC already says
  // the next day.
  assert.equal(isOnTime({ completed_at: "2026-09-06T01:00:00Z", due_date: "2026-09-05" }), true);
  // Local midnight - now it's genuinely a day late.
  assert.equal(isOnTime({ completed_at: "2026-09-06T05:00:00Z", due_date: "2026-09-05" }), false);
  assert.equal(isOnTime({ completed_at: "2026-09-01T12:00:00Z", due_date: "2026-09-05" }), true);
});

test("summarizeMonth splits the month's open bills into buckets that never overlap", () => {
  const today = "2026-09-13";
  const payments = [
    { is_paid: false, due_date: "2026-09-10" }, // overdue
    { is_paid: false, due_date: "2026-09-15" }, // soon
    { is_paid: false, due_date: "2026-09-20" }, // soon (exactly 7 days)
    { is_paid: false, due_date: "2026-09-25" }, // later this month
    { is_paid: false, due_date: "2026-10-05" }, // next month: not this month's summary
    { is_paid: true, due_date: "2026-09-14" }, // already paid: counted via events
    { is_paid: false, is_paused: true, due_date: "2026-09-16" }, // paused: off the radar
  ];

  assert.deepEqual(summarizeMonth(payments, 4, today), {
    paid: 4,
    soon: 2,
    overdue: 1,
    later: 1,
  });
});

test("summarizeMonth's 7-day window crosses into next month", () => {
  const summary = summarizeMonth(
    [
      { is_paid: false, due_date: "2026-10-03" }, // 5 days out, but next month
      { is_paid: false, due_date: "2026-10-10" }, // 12 days out and next month
    ],
    0,
    "2026-09-28"
  );
  assert.equal(summary.soon, 1);
  assert.equal(summary.later, 0);
});

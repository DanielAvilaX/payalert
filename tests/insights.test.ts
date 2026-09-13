import test from "node:test";
import assert from "node:assert/strict";

import {
  categoryBreakdown,
  forecastWindow,
  incomeCommitment,
  monthlyEquivalent,
  monthlySpendSeries,
  niceCeiling,
  onTimeRate,
  priceIncreases,
  recurringCommitment,
  seriesStartISO,
  shiftMonth,
} from "../src/lib/metrics.ts";
import { categoryOf } from "../src/lib/categories.ts";
import { formatCompactCOP } from "../src/lib/format.ts";

const TODAY = "2026-09-13";

test("monthlyEquivalent spreads every recurrence over a month; one-offs aren't commitments", () => {
  assert.equal(Math.round(monthlyEquivalent(100_000, "weekly")), 433_333);
  assert.equal(monthlyEquivalent(300_000, "monthly"), 300_000);
  assert.equal(monthlyEquivalent(300_000, "quarterly"), 100_000);
  assert.equal(monthlyEquivalent(1_200_000, "yearly"), 100_000);
  assert.equal(monthlyEquivalent(500_000, "none"), 0);
  assert.equal(monthlyEquivalent(null, "monthly"), 0);
});

test("recurringCommitment ignores paused and one-off bills", () => {
  const commitment = recurringCommitment([
    { amount: 200_000, recurrence: "monthly" },
    { amount: 1_200_000, recurrence: "yearly" },
    { amount: 999_000, recurrence: "monthly", is_paused: true },
    { amount: 700_000, recurrence: "none" },
  ]);
  assert.deepEqual(commitment, { monthly: 300_000, annual: 3_600_000, count: 2 });
});

test("monthlySpendSeries buckets by the Colombian month the bill was paid", () => {
  const series = monthlySpendSeries(
    [
      { completed_at: "2026-09-03T15:00:00Z", amount: 100_000 },
      { completed_at: "2026-09-10T15:00:00Z", amount: 50_000 },
      // 8pm Bogotá on Aug 31 - UTC already says September.
      { completed_at: "2026-09-01T01:00:00Z", amount: 70_000 },
      { completed_at: "2026-03-15T15:00:00Z", amount: 999_999 }, // outside the window
    ],
    TODAY,
    6
  );
  assert.deepEqual(
    series.map((bucket) => bucket.month),
    ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]
  );
  assert.deepEqual(series.at(-1), { month: "2026-09", total: 150_000, count: 2 });
  assert.deepEqual(series.at(-2), { month: "2026-08", total: 70_000, count: 1 });
  assert.equal(series[0].total, 0); // zero-filled, not skipped
});

test("shiftMonth and seriesStartISO cross year boundaries", () => {
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-11", 3), "2027-02");
  assert.equal(seriesStartISO(TODAY, 6), "2026-04-01T05:00:00.000Z");
});

test("categoryBreakdown groups by the logo's category, largest first", () => {
  const breakdown = categoryBreakdown([
    { amount: 164_000, recurrence: "monthly", logo: "luz" },
    { amount: 150_000, recurrence: "bimonthly", logo: "agua" },
    { amount: 44_900, recurrence: "monthly", logo: "netflix" },
    { amount: 2_000_000, recurrence: "monthly", logo: "house" },
    { amount: 90_000, recurrence: "monthly", logo: "netflix", is_paused: true },
  ]);
  assert.equal(breakdown[0].category, "vivienda");
  assert.equal(breakdown[1].category, "servicios");
  assert.equal(breakdown[1].monthly, 164_000 + 75_000);
  assert.equal(breakdown[1].count, 2);
  const shares = breakdown.reduce((sum, entry) => sum + entry.share, 0);
  assert.ok(Math.abs(shares - 1) < 1e-9);
  assert.equal(categoryOf("unknown-logo"), "otros");
});

test("onTimeRate counts completions on or before their due date", () => {
  assert.deepEqual(
    onTimeRate([
      { completed_at: "2026-09-05T12:00:00Z", due_date: "2026-09-05" },
      { completed_at: "2026-09-03T12:00:00Z", due_date: "2026-09-01" },
    ]),
    { onTime: 1, total: 2, rate: 0.5 }
  );
  assert.equal(onTimeRate([]).rate, null);
});

test("forecastWindow expands recurring bills and keeps overdue separate", () => {
  const forecast = forecastWindow(
    [
      // Weekly from the 15th: 15, 22, 29 Sep, 6 and 13 Oct all land in 30 days.
      { amount: 10_000, recurrence: "weekly", due_date: "2026-09-15", is_paid: false },
      // Paid this cycle; the next one (14 Oct) is 31 days out.
      { amount: 500_000, recurrence: "monthly", due_date: "2026-09-14", is_paid: true },
      // Overdue: owed now, and its next cycle (10 Oct) is still coming.
      { amount: 100_000, recurrence: "monthly", due_date: "2026-09-10", is_paid: false },
      // One-off, in window.
      { amount: 70_000, recurrence: "none", due_date: "2026-09-30", is_paid: false },
      // Paused: off the radar.
      { amount: 999_000, recurrence: "monthly", due_date: "2026-09-20", is_paid: false, is_paused: true },
    ],
    TODAY,
    30
  );
  assert.deepEqual(forecast, {
    upcoming: 5 * 10_000 + 100_000 + 70_000,
    upcomingCount: 7,
    overdue: 100_000,
    overdueCount: 1,
  });
});

test("priceIncreases flags a bill that got 10%+ pricier than last time", () => {
  const events = [
    { payment_id: "luz", name: "Luz", amount: 150_000, completed_at: "2026-08-05T12:00:00Z" },
    { payment_id: "luz", name: "Luz", amount: 180_000, completed_at: "2026-09-05T12:00:00Z" },
    { payment_id: "agua", name: "Agua", amount: 100_000, completed_at: "2026-08-05T12:00:00Z" },
    { payment_id: "agua", name: "Agua", amount: 105_000, completed_at: "2026-09-05T12:00:00Z" },
    { payment_id: "gas", name: "Gas", amount: 60_000, completed_at: "2026-08-05T12:00:00Z" },
    { payment_id: "gas", name: "Gas", amount: 40_000, completed_at: "2026-09-05T12:00:00Z" },
    { payment_id: "tv", name: "TV", amount: 30_000, completed_at: "2026-09-05T12:00:00Z" },
  ];
  const increases = priceIncreases(events);
  assert.equal(increases.length, 1);
  assert.equal(increases[0].name, "Luz");
  assert.ok(Math.abs(increases[0].change - 0.2) < 1e-9);
});

test("incomeCommitment bands follow the 50/30/20 needs line", () => {
  assert.equal(incomeCommitment(1_000_000, 4_000_000)?.band, "healthy");
  assert.equal(incomeCommitment(2_400_000, 4_000_000)?.band, "tight");
  assert.equal(incomeCommitment(3_200_000, 4_000_000)?.band, "critical");
  assert.equal(incomeCommitment(1_000_000, null), null);
  assert.equal(incomeCommitment(1_000_000, 0), null);
});

test("niceCeiling rounds axis maxima to readable numbers", () => {
  assert.equal(niceCeiling(1_775_000), 2_000_000);
  assert.equal(niceCeiling(450_000), 500_000);
  assert.equal(niceCeiling(220_000), 250_000);
  assert.equal(niceCeiling(100), 100);
  assert.equal(niceCeiling(0), 1);
});

test("formatCompactCOP keeps tick labels short", () => {
  assert.equal(formatCompactCOP(1_500_000), "$1,5 M");
  assert.equal(formatCompactCOP(2_000_000), "$2 M");
  assert.equal(formatCompactCOP(850_000), "$850 mil");
  assert.equal(formatCompactCOP(900), "$900");
});

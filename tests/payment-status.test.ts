import test from "node:test";
import assert from "node:assert/strict";

import { describeDue, formatDueDate } from "../src/lib/payment-status.ts";

test("formatDueDate reads the date's own parts, never a local Date", () => {
  // The trap: new Date("2026-09-10").toLocaleDateString() renders "9 sep"
  // anywhere west of Greenwich, because the string parses as UTC midnight.
  assert.equal(formatDueDate("2026-09-10"), "10 sep");
  assert.equal(formatDueDate("2026-01-01"), "1 ene");
  assert.equal(formatDueDate("2026-12-31"), "31 dic");
  assert.equal(formatDueDate("2026-12-31", true), "31 dic 2026");
});

test("describeDue speaks in days, not dates, while it still matters", () => {
  const today = "2026-09-13";
  assert.deepEqual(describeDue("2026-09-13", today), {
    tone: "today",
    days: 0,
    label: "Vence hoy",
  });
  assert.equal(describeDue("2026-09-14", today).label, "Vence mañana");
  assert.equal(describeDue("2026-09-18", today).label, "En 5 días");
  assert.equal(describeDue("2026-09-12", today).label, "Venció ayer");
  assert.equal(describeDue("2026-09-10", today).label, "Venció hace 3 días");
});

test("describeDue escalates tone toward the due date", () => {
  const today = "2026-09-13";
  assert.equal(describeDue("2026-09-10", today).tone, "overdue");
  assert.equal(describeDue("2026-09-13", today).tone, "today");
  assert.equal(describeDue("2026-09-14", today).tone, "soon");
  assert.equal(describeDue("2026-09-20", today).tone, "soon"); // exactly 7 days
  assert.equal(describeDue("2026-09-21", today).tone, "upcoming"); // 8 days
  assert.equal(describeDue("2026-10-13", today).tone, "upcoming"); // 30 days
  assert.equal(describeDue("2026-10-14", today).tone, "far"); // 31 days
});

test("describeDue falls back to a plain date once the countdown is noise", () => {
  // "En 94 días" tells the reader nothing useful; the date does.
  assert.equal(describeDue("2026-12-16", "2026-09-13").label, "16 dic");
});

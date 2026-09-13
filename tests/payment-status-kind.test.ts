import test from "node:test";
import assert from "node:assert/strict";

import { formatMonthShort, paymentStatus } from "../src/lib/payment-status.ts";

const TODAY = "2026-09-13";

test("paymentStatus: paused and paid outrank any due date", () => {
  assert.equal(
    paymentStatus({ is_paid: false, is_paused: true, due_date: "2026-09-01" }, TODAY).kind,
    "paused"
  );
  const paid = paymentStatus({ is_paid: true, is_paused: false, due_date: "2026-09-01" }, TODAY);
  assert.equal(paid.kind, "paid");
  assert.equal(paid.detail, "Al día");
});

test("paymentStatus buckets open bills by urgency", () => {
  const at = (due_date: string) => paymentStatus({ is_paid: false, due_date }, TODAY);

  assert.equal(at("2026-09-10").kind, "overdue");
  assert.equal(at("2026-09-10").detail, "Venció hace 3 días");
  assert.equal(at("2026-09-13").kind, "today");
  assert.equal(at("2026-09-14").kind, "soon");
  assert.equal(at("2026-09-14").detail, "Vence mañana");
  assert.equal(at("2026-09-20").kind, "soon"); // exactly 7 days
  assert.equal(at("2026-09-21").kind, "pending"); // 8 days
});

test("every status ships a text label - colour is never the only cue", () => {
  const cases = [
    { is_paid: false, is_paused: true, due_date: "2026-09-10" },
    { is_paid: true, due_date: "2026-09-10" },
    { is_paid: false, due_date: "2026-09-10" },
    { is_paid: false, due_date: "2026-09-13" },
    { is_paid: false, due_date: "2026-09-15" },
    { is_paid: false, due_date: "2026-10-30" },
  ];
  for (const payment of cases) {
    const status = paymentStatus(payment, TODAY);
    assert.ok(status.label.length > 0, `missing label for ${status.kind}`);
    assert.ok(status.detail.length > 0, `missing detail for ${status.kind}`);
  }
});

test("formatMonthShort labels chart axes from the string, not a Date", () => {
  assert.equal(formatMonthShort("2026-09-01"), "sep");
  assert.equal(formatMonthShort("2026-12"), "dic");
  assert.equal(formatMonthShort("2027-01-31"), "ene");
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildScopeIndex,
  filterEventsByScope,
  filterPaymentsByScope,
  matchesScope,
  peopleInScope,
  type ShareLink,
} from "../src/lib/scope.ts";

const ME = "me";
const ALE = "ale";
const CARLOS = "carlos";

const payments = [
  { id: "solo", user_id: ME }, // mine, nobody else on it
  { id: "arriendo", user_id: ME }, // mine, shared out to Ale
  { id: "internet", user_id: ALE }, // Ale's, shared with me
  { id: "gym", user_id: ME }, // invited Carlos, still pending
];

const shares: ShareLink[] = [
  { payment_id: "arriendo", shared_with: ALE, invited_by: ME, status: "accepted" },
  { payment_id: "internet", shared_with: ME, invited_by: ALE, status: "accepted" },
  { payment_id: "gym", shared_with: CARLOS, invited_by: ME, status: "pending" },
];

const index = buildScopeIndex(payments, shares, ME);

test("buildScopeIndex records who owns each payment and who else is on it", () => {
  assert.deepEqual(index.get("solo"), { mine: true, people: [] });
  assert.deepEqual(index.get("arriendo"), { mine: true, people: [ALE] });
  // Somebody else's payment: the owner counts as company, and it isn't mine.
  assert.deepEqual(index.get("internet"), { mine: false, people: [ALE] });
});

test("a pending invitation isn't company yet", () => {
  assert.deepEqual(index.get("gym"), { mine: true, people: [] });
});

test("Míos keeps everything you own, including what you shared out", () => {
  const mine = filterPaymentsByScope(payments, { kind: "mine" }, index);
  // "arriendo" is shared with Ale and still mine; "internet" is Ale's.
  assert.deepEqual(mine.map((p) => p.id), ["solo", "arriendo", "gym"]);
});

test("Compartidos is everything with company, whoever created it", () => {
  const shared = filterPaymentsByScope(payments, { kind: "shared" }, index);
  assert.deepEqual(shared.map((p) => p.id), ["arriendo", "internet"]);
});

test("the two overlap on purpose: a payment you own and shared is in both", () => {
  assert.equal(matchesScope("arriendo", { kind: "mine" }, index), true);
  assert.equal(matchesScope("arriendo", { kind: "shared" }, index), true);
  // Only what someone else brought you is missing from "Míos".
  assert.equal(matchesScope("internet", { kind: "mine" }, index), false);
});

test("filtering by person narrows to what that person is actually on", () => {
  const withAle = filterPaymentsByScope(payments, { kind: "shared", personId: ALE }, index);
  assert.deepEqual(withAle.map((p) => p.id), ["arriendo", "internet"]);

  const withCarlos = filterPaymentsByScope(payments, { kind: "shared", personId: CARLOS }, index);
  assert.deepEqual(withCarlos, []);
});

test("a completion whose payment was deleted only ever answers 'mine'", () => {
  const events = [
    { id: "e1", payment_id: "internet" },
    { id: "e2", payment_id: null },
  ];
  assert.deepEqual(
    filterEventsByScope(events, { kind: "mine" }, index).map((e) => e.id),
    ["e2"]
  );
  assert.deepEqual(
    filterEventsByScope(events, { kind: "shared" }, index).map((e) => e.id),
    ["e1"]
  );
  assert.equal(matchesScope(null, { kind: "shared", personId: ALE }, index), false);
});

test("peopleInScope collects everyone you share with, once each", () => {
  assert.deepEqual(peopleInScope(index).sort(), [ALE]);
});

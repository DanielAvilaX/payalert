import test from "node:test";
import assert from "node:assert/strict";

import {
  collaboratorsByPayment,
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
  { id: "solo", user_id: ME }, // only mine
  { id: "arriendo", user_id: ME }, // mine, shared out to Ale
  { id: "internet", user_id: ALE }, // Ale's, shared with me
  { id: "gym", user_id: ME }, // invited Carlos, still pending
];

const shares: ShareLink[] = [
  { payment_id: "arriendo", shared_with: ALE, invited_by: ME, status: "accepted" },
  { payment_id: "internet", shared_with: ME, invited_by: ALE, status: "accepted" },
  { payment_id: "gym", shared_with: CARLOS, invited_by: ME, status: "pending" },
];

const collaborators = collaboratorsByPayment(payments, shares, ME);

test("collaboratorsByPayment lists everyone else on a payment, never yourself", () => {
  assert.deepEqual(collaborators.get("solo"), []);
  assert.deepEqual(collaborators.get("arriendo"), [ALE]);
  // The owner counts as a collaborator when the owner isn't me.
  assert.deepEqual(collaborators.get("internet"), [ALE]);
});

test("a pending invitation isn't a collaboration yet", () => {
  assert.deepEqual(collaborators.get("gym"), []);
});

test("todos / solo míos / compartidos partition the list instead of overlapping", () => {
  const all = filterPaymentsByScope(payments, { kind: "all" }, collaborators);
  const mine = filterPaymentsByScope(payments, { kind: "mine" }, collaborators);
  const shared = filterPaymentsByScope(payments, { kind: "shared" }, collaborators);

  assert.equal(all.length, 4);
  // "gym" is mine alone until Carlos accepts.
  assert.deepEqual(mine.map((p) => p.id), ["solo", "gym"]);
  assert.deepEqual(shared.map((p) => p.id), ["arriendo", "internet"]);
  assert.equal(mine.length + shared.length, all.length);
});

test("filtering by person narrows to what that person is actually on", () => {
  const withAle = filterPaymentsByScope(payments, { kind: "shared", personId: ALE }, collaborators);
  assert.deepEqual(withAle.map((p) => p.id), ["arriendo", "internet"]);

  const withCarlos = filterPaymentsByScope(
    payments,
    { kind: "shared", personId: CARLOS },
    collaborators
  );
  assert.deepEqual(withCarlos, []);
});

test("a completion whose payment was deleted only ever answers 'mine'", () => {
  const events = [
    { id: "e1", payment_id: "arriendo" },
    { id: "e2", payment_id: null },
  ];
  assert.deepEqual(
    filterEventsByScope(events, { kind: "mine" }, collaborators).map((e) => e.id),
    ["e2"]
  );
  assert.deepEqual(
    filterEventsByScope(events, { kind: "shared" }, collaborators).map((e) => e.id),
    ["e1"]
  );
  assert.equal(matchesScope(null, { kind: "shared", personId: ALE }, collaborators), false);
});

test("peopleInScope collects everyone you share with, once each", () => {
  assert.deepEqual(peopleInScope(collaborators).sort(), [ALE]);
});

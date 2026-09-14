import test from "node:test";
import assert from "node:assert/strict";

import { describeActivity, describeChange, diffPayment } from "../src/lib/activity.ts";

test("diffPayment only reports the fields that actually changed", () => {
  const before = {
    name: "Netflix",
    amount: 44900,
    due_date: "2026-09-20",
    recurrence: "monthly",
    notes: null,
  };
  const after = { ...before, amount: 52900, notes: "Plan familiar" };

  assert.deepEqual(diffPayment(before, after), {
    amount: { from: 44900, to: 52900 },
    notes: { from: null, to: "Plan familiar" },
  });
});

test("diffPayment doesn't invent a change out of Postgres' numeric strings", () => {
  // numeric columns come back as strings; "44900" and 44900 are the same money.
  assert.deepEqual(diffPayment({ amount: "44900.00" }, { amount: 44900 }), {});
  // ...and empty-vs-null is the same absence of a note.
  assert.deepEqual(diffPayment({ notes: null }, { notes: "" }), {});
});

test("is_paid and is_paused never show up as edits - they have their own actions", () => {
  assert.deepEqual(diffPayment({ is_paid: false }, { is_paid: true }), {});
  assert.deepEqual(diffPayment({ is_paused: false }, { is_paused: true }), {});
});

test("describeChange spells values out the way the rest of the app does", () => {
  assert.equal(
    describeChange("amount", { from: 44900, to: 52900 }),
    "Monto: $44.900 → $52.900"
  );
  assert.equal(
    describeChange("due_date", { from: "2026-09-20", to: "2026-10-05" }),
    "Vencimiento: 20 sep 2026 → 5 oct 2026"
  );
  assert.equal(
    describeChange("recurrence", { from: "monthly", to: "yearly" }),
    "Frecuencia: Mensual → Anual"
  );
  assert.equal(
    describeChange("remind_days_before", { from: 3, to: 0 }),
    "Aviso: 3 días antes → el mismo día"
  );
  assert.equal(describeChange("notes", { from: null, to: "Ref 2304" }), "Nota: vacío → Ref 2304");
});

test("describeActivity turns an entry into a sentence and its specifics", () => {
  assert.deepEqual(describeActivity("paid", { amount: 425000, dueDate: "2026-09-12" }), {
    verb: "marcó como pagado",
    lines: ["Monto: $425.000", "Ciclo del 12 sep 2026"],
  });

  assert.deepEqual(
    describeActivity("updated", { changes: { name: { from: "Luz", to: "Luz EPM" } } }),
    { verb: "editó el pago", lines: ["Nombre: Luz → Luz EPM"] }
  );

  assert.deepEqual(describeActivity("shared", { person: "Alejandra" }), {
    verb: "compartió el pago con Alejandra",
    lines: [],
  });

  assert.deepEqual(describeActivity("share_revoked", { person: "carlos@correo.com" }), {
    verb: "le quitó el acceso a carlos@correo.com",
    lines: [],
  });

  assert.deepEqual(describeActivity("rolled_over", { nextDueDate: "2026-10-12" }), {
    verb: "pasó al siguiente ciclo",
    lines: ["Nueva fecha: 12 oct 2026"],
  });
});

test("an edit that changed nothing trackable says so instead of looking empty", () => {
  assert.deepEqual(describeActivity("updated", { changes: {} }).lines, ["Sin cambios registrados"]);
  assert.deepEqual(describeActivity("updated", null).lines, ["Sin cambios registrados"]);
});

import test from "node:test";
import assert from "node:assert/strict";

import { toCSV } from "../src/lib/csv.ts";

test("toCSV uses semicolons and quotes what needs quoting", () => {
  assert.equal(
    toCSV([
      ["Pago", "Monto"],
      ["Luz", 164000],
      ['Dice "hola"; ok', -5],
      ["Sin monto", null],
    ]),
    'Pago;Monto\r\nLuz;164000\r\n"Dice ""hola""; ok";-5\r\nSin monto;'
  );
});

test("toCSV defuses spreadsheet formulas in text, not in numbers", () => {
  // A note like this would execute when the export is opened in Excel.
  assert.equal(toCSV([["=HYPERLINK(\"x\")"]]), "\"'=HYPERLINK(\"\"x\"\")\"");
  assert.equal(toCSV([["+57 300"]]), "'+57 300");
  assert.equal(toCSV([["@SUM(A1)"]]), "'@SUM(A1)");
  assert.equal(toCSV([[-120000]]), "-120000");
});

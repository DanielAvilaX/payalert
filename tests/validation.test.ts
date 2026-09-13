import test from "node:test";
import assert from "node:assert/strict";

import {
  isValidISODate,
  parseIntInRange,
  parseName,
  parseOptionalText,
  parsePaymentUrl,
  parseTimeOfDay,
} from "../src/lib/validation.ts";
import { formatMoneyInput, parseMoneyInput } from "../src/lib/format.ts";

test("isValidISODate rejects well-formed dates that don't exist", () => {
  assert.equal(isValidISODate("2026-02-28"), true);
  assert.equal(isValidISODate("2028-02-29"), true); // leap year
  assert.equal(isValidISODate("2026-02-29"), false); // not a leap year
  assert.equal(isValidISODate("2026-02-31"), false);
  assert.equal(isValidISODate("2026-13-01"), false);
  assert.equal(isValidISODate("2026-00-10"), false);
  assert.equal(isValidISODate("13/09/2026"), false);
  assert.equal(isValidISODate(""), false);
});

test("parseIntInRange treats a blank field as missing, not as zero", () => {
  // Number("") is 0, so a cleared "días antes" box used to save silently as
  // "remind me the same day" instead of failing the submit.
  assert.equal(parseIntInRange("", 0, 365), null);
  assert.equal(parseIntInRange("   ", 0, 365), null);
  assert.equal(parseIntInRange("0", 0, 365), 0);
  assert.equal(parseIntInRange("3", 0, 365), 3);
  assert.equal(parseIntInRange("-1", 0, 365), null);
  assert.equal(parseIntInRange("366", 0, 365), null);
  assert.equal(parseIntInRange("2.5", 0, 365), null);
  assert.equal(parseIntInRange("abc", 0, 365), null);
});

test("parseName trims and enforces a length ceiling", () => {
  assert.equal(parseName("  Luz  "), "Luz");
  assert.equal(parseName(""), null);
  assert.equal(parseName("   "), null);
  assert.equal(parseName("x".repeat(80)), "x".repeat(80));
  assert.equal(parseName("x".repeat(81)), null);
});

test("parseTimeOfDay accepts what <input type=time> emits", () => {
  assert.equal(parseTimeOfDay("09:00"), "09:00");
  assert.equal(parseTimeOfDay("09:00:00"), "09:00"); // Postgres time round-trip
  assert.equal(parseTimeOfDay("23:59"), "23:59");
  assert.equal(parseTimeOfDay("24:00"), null);
  assert.equal(parseTimeOfDay("09:60"), null);
  assert.equal(parseTimeOfDay("9:00"), null);
  assert.equal(parseTimeOfDay(""), null);
});

test("parsePaymentUrl refuses anything that isn't http(s)", () => {
  // This value ends up in an href and in a Telegram button, so a
  // javascript: or data: URL would be script execution on tap.
  assert.equal(parsePaymentUrl("javascript:alert(1)"), null);
  assert.equal(parsePaymentUrl("data:text/html,<script>x</script>"), null);
  assert.equal(parsePaymentUrl("file:///etc/passwd"), null);
  assert.equal(parsePaymentUrl("no es una url"), null);
  assert.equal(parsePaymentUrl("x".repeat(501)), null);
});

test("parsePaymentUrl accepts a pasted domain and normalises it", () => {
  assert.equal(
    parsePaymentUrl("https://sucursalvirtual.bancolombia.com"),
    "https://sucursalvirtual.bancolombia.com/"
  );
  assert.equal(parsePaymentUrl("bancolombia.com"), "https://bancolombia.com/");
  assert.equal(parsePaymentUrl("  "), undefined); // blank means "cleared"
});

test("parseOptionalText treats blank as absent and caps length", () => {
  assert.equal(parseOptionalText("  ref 12345  "), "ref 12345");
  assert.equal(parseOptionalText(""), null);
  assert.equal(parseOptionalText("x".repeat(500)), "x".repeat(500));
  assert.equal(parseOptionalText("x".repeat(501)), null);
});

test("money input survives a format/parse round trip", () => {
  assert.equal(formatMoneyInput("660000"), "$660.000");
  assert.equal(parseMoneyInput("$660.000"), 660000);
  assert.equal(parseMoneyInput(""), null);
  assert.equal(parseMoneyInput("abc"), null);
  assert.equal(parseMoneyInput(formatMoneyInput("1775000")), 1775000);
});

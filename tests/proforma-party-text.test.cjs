require("./register-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { proformaPartyTextLines } = require("../lib/proforma-party-text.ts");

test("party text preserves spaces, Unicode and line breaks within 45 characters", () => {
  for (const value of [
    "A".repeat(45),
    "A".repeat(46),
    "Company name with spaces ".repeat(5),
    "😀".repeat(50),
    "First line\n\nSecond line",
    "",
  ]) {
    const lines = proformaPartyTextLines(value);
    assert.ok(lines.every((line) => Array.from(line).length <= 45));
    assert.equal(lines.join(""), value.replace(/\r?\n/g, ""));
  }
  assert.deepEqual(proformaPartyTextLines("First line\n\nSecond line"), [
    "First line",
    "",
    "Second line",
  ]);
});

test("party text wraps before a word that crosses the character limit", () => {
  const prefix = "A".repeat(39) + " ";
  assert.deepEqual(proformaPartyTextLines(prefix + "Company Limited"), [
    prefix,
    "Company Limited",
  ]);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// ponytail: plain node needs import attributes for JSON, so read the files;
// tsc already enforces de === en keys via Record<I18nKey, string>.
const en = JSON.parse(
  readFileSync(
    new URL("../src/lib/dictionaries/en.json", import.meta.url),
    "utf8",
  ),
) as Record<string, string>;
const de = JSON.parse(
  readFileSync(
    new URL("../src/lib/dictionaries/de.json", import.meta.url),
    "utf8",
  ),
) as Record<string, string>;

const placeholders = (template: string): string[] =>
  [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

test("german dictionary covers every english key", () => {
  const enEntries = Object.entries(en);
  assert.ok(enEntries.length > 50, "dictionary should hold the UI strings");
  for (const [key, value] of enEntries) {
    assert.equal(typeof value, "string", `en.${key} must be a string`);
    assert.equal(typeof de[key], "string", `missing de: ${key}`);
  }
  assert.equal(Object.keys(de).length, enEntries.length);
});

test("interpolated templates keep matching placeholders", () => {
  for (const key of [
    "search.suggestReady",
    "results.capacitySuffix",
    "events.count",
    "assessment.note",
  ]) {
    assert.deepEqual(placeholders(de[key]), placeholders(en[key]));
  }
});

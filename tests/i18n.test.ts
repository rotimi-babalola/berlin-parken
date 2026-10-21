import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// ponytail: plain node needs import attributes for JSON, so read the files;
// tsc already enforces de === en keys via Record<Locale, Dictionary>.
function leaves(
  value: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") entries[path] = child;
    else Object.assign(entries, leaves(child as Record<string, unknown>, path));
  }
  return entries;
}

const en = JSON.parse(
  readFileSync(
    new URL("../src/lib/dictionaries/en.json", import.meta.url),
    "utf8",
  ),
) as Record<string, unknown>;
const de = JSON.parse(
  readFileSync(
    new URL("../src/lib/dictionaries/de.json", import.meta.url),
    "utf8",
  ),
) as Record<string, unknown>;

const enFlat = leaves(en);
const deFlat = leaves(de);

const placeholders = (template: string): string[] =>
  [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

test("german dictionary covers every english key", () => {
  const enEntries = Object.entries(enFlat);
  assert.ok(enEntries.length > 50, "dictionary should hold the UI strings");
  for (const [key, value] of enEntries) {
    assert.equal(typeof value, "string", `en.${key} must be a string`);
    assert.equal(typeof deFlat[key], "string", `missing de: ${key}`);
  }
  assert.equal(Object.keys(deFlat).length, enEntries.length);
});

test("interpolated templates keep matching placeholders", () => {
  for (const key of [
    "search.suggestReady",
    "results.capacitySuffix",
    "events.count",
    "assessment.note",
  ]) {
    assert.deepEqual(placeholders(deFlat[key]), placeholders(enFlat[key]));
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { equivalentPath, localizedPath } from "../src/lib/locale-path.ts";

test("localizedPath prefixes German and keeps English at the root", () => {
  assert.equal(localizedPath("en"), "/");
  assert.equal(localizedPath("de"), "/de");
  assert.equal(localizedPath("en", "/results"), "/results");
  assert.equal(localizedPath("de", "/results"), "/de/results");
  assert.equal(localizedPath("en", "parking/mitte"), "/parking/mitte");
  assert.equal(localizedPath("de", "parking/mitte"), "/de/parking/mitte");
});

test("equivalentPath swaps the language prefix", () => {
  assert.equal(equivalentPath("/", "de"), "/de");
  assert.equal(equivalentPath("/de", "en"), "/");
  assert.equal(equivalentPath("/de/", "en"), "/");
  assert.equal(equivalentPath("/results", "de"), "/de/results");
  assert.equal(equivalentPath("/de/results", "en"), "/results");
  assert.equal(equivalentPath("/parking/mitte", "de"), "/de/parking/mitte");
  assert.equal(equivalentPath("/de/parking/mitte", "en"), "/parking/mitte");
  assert.equal(equivalentPath("/de/parking/mitte", "de"), "/de/parking/mitte");
});

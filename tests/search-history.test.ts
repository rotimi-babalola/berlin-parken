import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
  loadRecentSearches,
  recordRecentSearch,
} from "../src/lib/search-history.ts";

function installMemoryStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    } satisfies Pick<Storage, "getItem" | "setItem" | "removeItem" | "clear">,
    configurable: true,
    writable: true,
  });
  return store;
}

beforeEach(() => {
  installMemoryStorage();
});

test("loads nothing when there is no history", () => {
  assert.deepEqual(loadRecentSearches(), []);
});

test("records searches newest-first, dedupes, and caps at five", () => {
  for (let index = 1; index <= 6; index += 1) {
    recordRecentSearch({
      id: `street:${index}`,
      label: `Platz ${index}`,
      detail: "Berlin",
      latitude: 52.5 + index / 1000,
      longitude: 13.4,
    });
  }
  recordRecentSearch({
    id: "street:2",
    label: "Platz 2",
    detail: "Berlin",
    latitude: 52.502,
    longitude: 13.4,
  });

  const recent = loadRecentSearches();
  assert.equal(recent.length, 5);
  assert.equal(recent[0].label, "Platz 2");
  assert.ok(!recent.some((item) => item.label === "Platz 1"));
});

test("keeps distinct places that share a label", () => {
  recordRecentSearch({
    id: "street:1",
    label: "Hauptstrasse 1",
    detail: "Kreuzberg",
    latitude: 52.499,
    longitude: 13.401,
  });
  recordRecentSearch({
    id: "street:2",
    label: "Hauptstrasse 1",
    detail: "Schoeneberg",
    latitude: 52.488,
    longitude: 13.352,
  });

  const recent = loadRecentSearches();
  assert.equal(recent.length, 2);
  assert.equal(recent[0].detail, "Schoeneberg");
  assert.equal(recent[1].detail, "Kreuzberg");
});

test("ignores corrupt or shapeless stored entries", () => {
  globalThis.localStorage.setItem("berlin-parken-recent-searches", "nope{[");
  assert.deepEqual(loadRecentSearches(), []);
  globalThis.localStorage.setItem(
    "berlin-parken-recent-searches",
    JSON.stringify([{ label: 42 }, null, "x"]),
  );
  assert.deepEqual(loadRecentSearches(), []);
});

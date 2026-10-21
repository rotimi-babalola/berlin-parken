import assert from "node:assert/strict";
import test from "node:test";
import { buildResultsUrl, parseResultsParams } from "../src/lib/results-url.ts";
import { defaultArrivalValue } from "../src/lib/search-time.ts";

const DAY = 24 * 60 * 60 * 1000;

function validQuery() {
  return {
    label: "Alexanderplatz 1",
    latitude: 52.521,
    longitude: 13.413,
    radius: 500,
    arrival: defaultArrivalValue(Date.now() + DAY),
    duration: 60,
  };
}

test("the results URL round-trips the search query", () => {
  const query = validQuery();
  const url = buildResultsUrl(query, "en");
  assert.match(url, /^\/results\?/);
  const parsed = parseResultsParams(
    new URL(url, "http://localhost").searchParams,
  );
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.label, query.label);
  assert.equal(parsed.value.latitude, query.latitude);
  assert.equal(parsed.value.longitude, query.longitude);
  assert.equal(parsed.value.radius, query.radius);
  assert.equal(parsed.value.arrival, query.arrival);
  assert.equal(parsed.value.duration, query.duration);
  assert.ok(Number.isFinite(parsed.value.arrivalMs));
});

test("German results URLs keep the query on the /de route", () => {
  const url = buildResultsUrl(validQuery(), "de");
  assert.match(url, /^\/de\/results\?/);
  assert.equal(
    parseResultsParams(new URL(url, "http://localhost").searchParams).ok,
    true,
  );
});

test("rejects missing, out-of-Berlin, and out-of-range params", () => {
  const query = validQuery();
  const params = (overrides: Record<string, string>) => {
    const url = new URL(buildResultsUrl(query, "en"), "http://localhost");
    for (const [key, value] of Object.entries(overrides))
      url.searchParams.set(key, value);
    return url.searchParams;
  };
  assert.equal(parseResultsParams(new URLSearchParams()).ok, false);
  assert.equal(
    parseResultsParams(params({ lat: "48.1", lon: "11.5" })).ok,
    false,
  );
  assert.equal(parseResultsParams(params({ radius: "50" })).ok, false);
  assert.equal(parseResultsParams(params({ radius: "1500" })).ok, false);
  assert.equal(
    parseResultsParams(params({ arrival: "2000-01-01T10:00" })).ok,
    false,
  );
  assert.equal(parseResultsParams(params({ duration: "5" })).ok, false);
  assert.equal(parseResultsParams(params({ label: "   " })).ok, false);
});

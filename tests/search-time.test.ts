import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_DURATION_MINUTES,
  defaultArrivalValue,
  parseArrival,
  parseArrivalInstant,
  parseDuration,
} from "../src/lib/search-time.ts";
import { getParkingContext } from "../src/lib/parking-context.ts";
import { toEpsg25833 } from "../src/lib/parking.ts";

const DAY = 24 * 60 * 60 * 1000;

test("defaults keep quick search usable", () => {
  const now = Date.now();
  const arrival = parseArrival(defaultArrivalValue(now), now);
  assert.equal(arrival.ok, true);
  assert.equal(parseDuration(DEFAULT_DURATION_MINUTES).ok, true);
});

test("rejects missing, malformed, past, and too-far arrival times", () => {
  const now = Date.now();
  assert.equal(parseArrival("", now).ok, false);
  assert.equal(parseArrival("not-a-date", now).ok, false);
  assert.equal(parseArrival("2000-01-01T10:00", now).ok, false);
  const far = defaultArrivalValue(now + 15 * DAY);
  assert.equal(parseArrival(far, now).ok, false);
  assert.equal(parseArrival(defaultArrivalValue(now + 2 * DAY), now).ok, true);
});

test("arrival instants and durations share the same bounds", () => {
  const now = Date.now();
  const iso = new Date(now + DAY).toISOString();
  assert.equal(parseArrivalInstant(iso, now).ok, true);
  assert.equal(parseArrivalInstant("garbage", now).ok, false);
  assert.equal(parseDuration("60").ok, true);
  assert.equal(parseDuration(5).ok, false);
  assert.equal(parseDuration(2000).ok, false);
});

test("visit window drops events outside the stay but keeps dateless ones", async (t) => {
  const [east, north] = toEpsg25833(13.405, 52.52);
  const square = (x: number, y: number) => ({
    type: "Polygon",
    coordinates: [
      [
        [east + x - 5, north + y - 5],
        [east + x + 5, north + y - 5],
        [east + x + 5, north + y + 5],
        [east + x - 5, north + y + 5],
        [east + x - 5, north + y - 5],
      ],
    ],
  });
  const isoDay = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
  const events = [
    {
      type: "Feature",
      id: "during",
      geometry: square(10, 0),
      properties: {
        strasse: "Torstraße",
        dat_beginn: isoDay(2),
        dat_ende: isoDay(3),
      },
    },
    {
      type: "Feature",
      id: "after",
      geometry: square(20, 0),
      properties: {
        strasse: "Linienstraße",
        dat_beginn: isoDay(6),
        dat_ende: isoDay(7),
      },
    },
    {
      type: "Feature",
      id: "dateless",
      geometry: square(30, 0),
      properties: { strasse: "Gormannstraße" },
    },
  ];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("parkraumbewirtschaftung"))
      return new Response(
        JSON.stringify({ type: "FeatureCollection", features: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    return new Response(
      JSON.stringify({
        type: "FeatureCollection",
        features: events,
        totalFeatures: events.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const arrivalMs = Date.now() + 2 * DAY;
  const result = await getParkingContext(13.405, 52.52, 500, {
    arrivalMs,
    durationMinutes: 60,
  });

  assert.deepEqual(result.events.items.map((item) => item.id).sort(), [
    "dateless",
    "during",
  ]);
});

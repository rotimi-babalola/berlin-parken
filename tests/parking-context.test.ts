import assert from "node:assert/strict";
import test from "node:test";
import { getParkingContext } from "../src/lib/parking-context.ts";
import { toEpsg25833 } from "../src/lib/parking.ts";

const [east, north] = toEpsg25833(13.405, 52.52);

function square(x: number, y: number, half = 5) {
  return {
    type: "Polygon",
    coordinates: [
      [
        [east + x - half, north + y - half],
        [east + x + half, north + y - half],
        [east + x + half, north + y + half],
        [east + x - half, north + y + half],
        [east + x - half, north + y - half],
      ],
    ],
  };
}

function zoneFeature(id: string, x: number, y: number, props = {}) {
  return {
    type: "Feature",
    id,
    geometry: square(x, y),
    properties: { parkzone: "A", bezirk: "Mitte", ...props },
  };
}

function eventFeature(id: string, x: number, y: number, props = {}) {
  return {
    type: "Feature",
    id,
    geometry: square(x, y),
    properties: { strasse: "Sample Street", bezirk: "Mitte", ...props },
  };
}

function collection(features: unknown[], extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({ type: "FeatureCollection", features, ...extra }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

test("keeps intersecting zones and drops features outside the radius", async (t) => {
  const zones = [zoneFeature("in", 10, 10), zoneFeature("out", 400, 400)];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("parkraumbewirtschaftung"))
      return collection(zones, { totalFeatures: zones.length });
    return collection([], { totalFeatures: 0 });
  });

  const result = await getParkingContext(13.405, 52.52, 100);

  assert.equal(result.zones.items.length, 1);
  assert.equal(result.zones.items[0].id, "in");
  assert.equal(result.zones.source.status, "available");
  assert.equal(result.events.source.status, "empty");
  assert.deepEqual(result.events.items, []);
});

const iso = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

test("keeps active and upcoming events within 14 days, drops expired and far-future ones", async (t) => {
  const events = [
    eventFeature("active", 10, 0, {
      dat_beginn: iso(-2),
      dat_ende: iso(2),
    }),
    eventFeature("upcoming", 20, 0, { dat_beginn: iso(5), dat_ende: iso(6) }),
    eventFeature("expired", 30, 0, {
      dat_beginn: iso(-10),
      dat_ende: iso(-5),
    }),
    eventFeature("far", 40, 0, { dat_beginn: iso(30), dat_ende: iso(31) }),
  ];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("parkraumbewirtschaftung"))
      return collection([], { totalFeatures: 0 });
    return collection(events, { totalFeatures: events.length });
  });

  const result = await getParkingContext(13.405, 52.52, 500);

  assert.deepEqual(
    result.events.items.map((item) => item.id).sort(),
    ["active", "upcoming"],
  );
  assert.equal(result.events.source.status, "available");
});

test("distinguishes empty responses from upstream failures per service", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("parkraumbewirtschaftung"))
      return collection([], { totalFeatures: 0 });
    return new Response("upstream unavailable", { status: 503 });
  });

  const result = await getParkingContext(13.405, 52.52, 500);

  assert.equal(result.zones.source.status, "empty");
  assert.equal(result.events.source.status, "unavailable");
  assert.match(
    result.events.source.status === "unavailable"
      ? result.events.source.message
      : "",
    /error|unavailable/,
  );
});

test("keeps the working service when the other one fails", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("parkraumbewirtschaftung"))
      return new Response("upstream unavailable", { status: 503 });
    return collection([eventFeature("only", 10, 0)], { totalFeatures: 1 });
  });

  const result = await getParkingContext(13.405, 52.52, 500);

  assert.equal(result.zones.source.status, "unavailable");
  assert.equal(result.events.source.status, "available");
  assert.equal(result.events.items.length, 1);
});

test("marks results partial when the page budget is reached", async (t) => {
  let zonePages = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("planb_ereignisse"))
      return collection([], { totalFeatures: 0 });
    zonePages += 1;
    return collection([zoneFeature(`page-${zonePages}`, 10, 0)], {
      totalFeatures: 6,
      ...(zonePages < 6
        ? {
            links: [
              {
                rel: "next",
                href: `https://gdi.berlin.de/services/wfs/parkraumbewirtschaftung?page=${zonePages + 1}`,
              },
            ],
          }
        : {}),
    });
  });

  const result = await getParkingContext(13.405, 52.52, 500);

  assert.equal(zonePages, 5);
  assert.equal(result.zones.source.status, "partial");
  assert.match(
    result.zones.source.status === "partial"
      ? result.zones.source.message
      : "",
    /page limit/,
  );
});

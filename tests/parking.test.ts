import assert from "node:assert/strict";
import test from "node:test";
import { getNearbyParking, toEpsg25833 } from "../src/lib/parking.ts";

const destination = toEpsg25833(13.405, 52.52);

function feature(id: string, x: number, y: number, spaces: number, category: string, street: string) {
  const [east, north] = destination;
  const half = 5;
  return {
    type: "Feature",
    id,
    geometry: {
      type: "Polygon",
      coordinates: [[
        [east + x - half, north + y - half],
        [east + x + half, north + y - half],
        [east + x + half, north + y + half],
        [east + x - half, north + y + half],
        [east + x - half, north + y - half],
      ]],
    },
    properties: {
      anzahl_parkplaetze: spaces,
      category,
      oeffentlichesstrassenland: "Ja",
      strassenname: street,
    },
  };
}

function collection(features: unknown[], extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ type: "FeatureCollection", features, ...extra }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

test("projects a Berlin coordinate into the EPSG:25833 northing range", () => {
  const [east, north] = toEpsg25833(13.405, 52.52);

  assert.ok(Math.abs(east - 391779.26) < 1);
  assert.ok(Math.abs(north - 5820072.16) < 1);
});

test("requests a bounded EPSG:25833 box and filters features to the circular radius", async (t) => {
  let requestedUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestedUrl = String(input);
    return collection([
      feature("inside", 70, 70, 10, "Parken (ohne Beschränkungen)", "First Street"),
      feature("radius-boundary", 105, 0, 2, "Parken (ohne Beschränkungen)", "Boundary Street"),
      feature("outside-circle", 90, 90, 99, "Parken (ohne Beschränkungen)", "Far Street"),
    ], { totalFeatures: 3 });
  });

  const result = await getNearbyParking(13.405, 52.52, 100);
  const url = new URL(requestedUrl);
  const bbox = url.searchParams.get("BBOX")?.split(",");

  assert.equal(url.searchParams.get("COUNT"), "500");
  assert.equal(url.searchParams.get("TYPENAMES"), "parkplaetze:parkplaetze_aussen");
  assert.equal(bbox?.[4], "EPSG:25833");
  assert.ok(Math.abs(Number(bbox?.[0]) - (destination[0] - 100)) < 0.001);
  assert.ok(Math.abs(Number(bbox?.[3]) - (destination[1] + 100)) < 0.001);
  assert.equal(result.featureCount, 2);
  assert.equal(result.mappedSpaces, 12);
  assert.deepEqual(result.streets.map(({ name }) => name), ["First Street", "Boundary Street"]);
});

test("aggregates mapped capacity by usability and street, preserving unknown categories", async (t) => {
  t.mock.method(globalThis, "fetch", async () => collection([
    feature("free", 0, 0, 10, "Parken (ohne Beschränkungen)", "Same Street"),
    feature("time", 20, 0, 4, "Parken mit zeitlicher Beschränkung", "Same Street"),
    feature("ban", 40, 0, 3, "Parkverbot", "Restricted Road"),
    feature("unknown", 60, 0, 2, "New Category", "Unknown Road"),
  ], { totalFeatures: 4 }));

  const result = await getNearbyParking(13.405, 52.52, 100);

  assert.equal(result.status, "available");
  assert.equal(result.mappedSpaces, 19);
  assert.equal(result.usableSpaces, 10);
  assert.equal(result.conditionalSpaces, 4);
  assert.equal(result.restrictedSpaces, 3);
  assert.equal(result.unknownSpaces, 2);
  assert.deepEqual(result.streets[0], { name: "Same Street", mappedSpaces: 14, features: 2 });
});

test("distinguishes a successful empty response from an upstream failure", async (t) => {
  t.mock.method(globalThis, "fetch", async () => collection([], { totalFeatures: 0 }));
  const empty = await getNearbyParking(13.405, 52.52, 500);
  assert.equal(empty.status, "empty");
  assert.equal(empty.mappedSpaces, 0);

  t.mock.method(globalThis, "fetch", async () => new Response("upstream unavailable", { status: 503 }));
  const unavailable = await getNearbyParking(13.405, 52.52, 500);
  assert.equal(unavailable.status, "unavailable");
  assert.notEqual(unavailable.message, undefined);
});

test("keeps valid first-page results marked partial when a later page fails", async (t) => {
  let pages = 0;
  t.mock.method(globalThis, "fetch", async () => {
    pages += 1;
    return pages === 1
      ? collection([feature("first", 0, 0, 7, "Parken (ohne Beschränkungen)", "Sample Street")], {
          totalFeatures: 2,
          links: [{ rel: "next", href: "https://gdi.berlin.de/services/wfs/parkplaetze?page=2" }],
        })
      : new Response("upstream unavailable", { status: 503 });
  });

  const result = await getNearbyParking(13.405, 52.52, 500);

  assert.equal(pages, 2);
  assert.equal(result.status, "partial");
  assert.equal(result.mappedSpaces, 7);
  assert.match(result.message ?? "", /error/);
});

test("includes features returned on a valid next page", async (t) => {
  let pages = 0;
  t.mock.method(globalThis, "fetch", async () => {
    pages += 1;
    return pages === 1
      ? collection([feature("first", 0, 0, 7, "Parken (ohne Beschränkungen)", "Sample Street")], {
          totalFeatures: 2,
          links: [{ rel: "next", href: "https://gdi.berlin.de/services/wfs/parkplaetze?page=2" }],
        })
      : collection([feature("second", 20, 0, 5, "Parken (ohne Beschränkungen)", "Sample Street")], { totalFeatures: 2 });
  });

  const result = await getNearbyParking(13.405, 52.52, 500);

  assert.equal(pages, 2);
  assert.equal(result.status, "available");
  assert.equal(result.featureCount, 2);
  assert.equal(result.mappedSpaces, 12);
});

test("does not follow a next-page link to another host", async (t) => {
  let pages = 0;
  t.mock.method(globalThis, "fetch", async () => {
    pages += 1;
    return collection([feature("first", 0, 0, 7, "Parken (ohne Beschränkungen)", "Sample Street")], {
      totalFeatures: 2,
      links: [{ rel: "next", href: "https://attacker.example/collect" }],
    });
  });

  const result = await getNearbyParking(13.405, 52.52, 500);

  assert.equal(pages, 1);
  assert.equal(result.status, "partial");
  assert.equal(result.mappedSpaces, 7);
});

test("stops pagination at the configured page budget and marks results partial", async (t) => {
  let pages = 0;
  t.mock.method(globalThis, "fetch", async () => {
    pages += 1;
    return collection([feature(`page-${pages}`, pages, 0, 1, "Parken (ohne Beschränkungen)", "Sample Street")], {
      totalFeatures: 6,
      ...(pages < 6 ? { links: [{ rel: "next", href: `https://gdi.berlin.de/services/wfs/parkplaetze?page=${pages + 1}` }] } : {}),
    });
  });

  const result = await getNearbyParking(13.405, 52.52, 500);

  assert.equal(pages, 5);
  assert.equal(result.status, "partial");
  assert.equal(result.featureCount, 5);
  assert.match(result.message ?? "", /page limit/);
});

test("marks malformed feature responses unavailable instead of reporting zero supply", async (t) => {
  t.mock.method(globalThis, "fetch", async () => collection([{ type: "Feature", properties: {} }]));

  const result = await getNearbyParking(13.405, 52.52, 500);

  assert.equal(result.status, "unavailable");
  assert.match(result.message ?? "", /invalid response/);
});

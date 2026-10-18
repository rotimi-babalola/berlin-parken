import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";
import {
  getNearbyParking,
  parseMaxStayMinutes,
  parseValidityWindows,
  suggestedAreas,
  toEpsg25833,
} from "../src/lib/parking.ts";

const destination = toEpsg25833(13.405, 52.52);

function feature(
  id: string,
  x: number,
  y: number,
  spaces: number,
  category: string,
  street: string,
) {
  const [east, north] = destination;
  const half = 5;
  return {
    type: "Feature",
    id,
    geometry: {
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
    },
    properties: {
      anzahl_parkplaetze: spaces,
      category,
      oeffentlichesstrassenland: "Ja",
      strassenname: street,
    },
  };
}

function insideFeature(
  id: string,
  x: number,
  y: number,
  spaces: number,
  street: string,
  restrictions: Record<string, unknown> = {},
) {
  const { geometry } = feature(id, x, y, spaces, "", street);
  return {
    type: "Feature",
    id,
    geometry,
    properties: {
      errechnete_anzahl_parkplaetze: spaces,
      oeffentliches_strassenland: "Ja",
      strassenname: street,
      beschraenkung: "",
      grund_fuer_beschraenkung: "",
      geltungszeit_der_beschraenkung: "",
      parkgebuehr: "",
      hoechstparkdauer: "",
      nur_schwerbehinderte: "nein",
      carsharing: "nein",
      ...restrictions,
    },
  };
}

function collection(features: unknown[], extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({ type: "FeatureCollection", features, ...extra }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function mockOutsideFetch(
  t: TestContext,
  handler: (input: string | URL | Request) => Promise<Response>,
) {
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) =>
    new URL(String(input)).searchParams.get("TYPENAMES") ===
    "parkplaetze:parkplaetze"
      ? collection([], { totalFeatures: 0 })
      : handler(input),
  );
}

test("projects a Berlin coordinate into the EPSG:25833 northing range", () => {
  const [east, north] = toEpsg25833(13.405, 52.52);

  assert.ok(Math.abs(east - 391779.26) < 1);
  assert.ok(Math.abs(north - 5820072.16) < 1);
});

test("combines inside and outside parking with their distinct capacity and restriction fields", async (t) => {
  const requestedLayers: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const layer = new URL(String(input)).searchParams.get("TYPENAMES")!;
    requestedLayers.push(layer);
    if (layer === "parkplaetze:parkplaetze_aussen")
      return collection([
        feature(
          "outside",
          30,
          0,
          3,
          "Parken (ohne Beschränkungen)",
          "Outside Street",
        ),
      ]);
    const insidePaid = insideFeature("inside-paid", 0, 0, 8, "Inside Street", {
      parkgebuehr: "4,00 Euro",
    });
    const insideRestricted = insideFeature(
      "inside-restricted",
      20,
      0,
      4,
      "Restricted Street",
      { beschraenkung: "Haltverbot" },
    );
    return collection([insidePaid, insideRestricted]);
  });

  const result = await getNearbyParking(13.405, 52.52, 100);

  assert.deepEqual(requestedLayers.sort(), [
    "parkplaetze:parkplaetze",
    "parkplaetze:parkplaetze_aussen",
  ]);
  assert.equal(result.status, "available");
  assert.equal(result.featureCount, 3);
  assert.equal(result.mappedSpaces, 15);
  assert.equal(result.usableSpaces, 3);
  assert.equal(result.conditionalSpaces, 8);
  assert.equal(result.restrictedSpaces, 4);
  assert.deepEqual(
    result.streets.map(({ name }) => name),
    ["Inside Street", "Outside Street"],
  );
});

test("keeps time-limited inside restrictions conditional and permanent restrictions excluded", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) =>
    new URL(String(input)).searchParams.get("TYPENAMES") ===
    "parkplaetze:parkplaetze_aussen"
      ? collection([], { totalFeatures: 0 })
      : collection([
          insideFeature("free", 0, 0, 2, "Free Street"),
          insideFeature("timed", 20, 0, 5, "Timed Street", {
            beschraenkung: "Haltverbot",
            grund_fuer_beschraenkung: "Ladezone",
            geltungszeit_der_beschraenkung: "Mo-Fr 07:00-15:00 Uhr",
          }),
          insideFeature("permanent", 40, 0, 3, "Banned Street", {
            beschraenkung: "Haltverbot",
          }),
          insideFeature("reserved", 60, 0, 4, "Reserved Street", {
            nur_schwerbehinderte: "ja",
            geltungszeit_der_beschraenkung: "Mo-Fr 07:00-15:00 Uhr",
          }),
        ]),
  );

  const result = await getNearbyParking(13.405, 52.52, 100);

  assert.equal(result.usableSpaces, 2);
  assert.equal(result.conditionalSpaces, 5);
  assert.equal(result.restrictedSpaces, 7);
  assert.deepEqual(
    result.streets.map(({ name }) => name),
    ["Timed Street", "Free Street"],
  );
});

test("marks results partial when one parking layer fails", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) =>
    new URL(String(input)).searchParams.get("TYPENAMES") ===
    "parkplaetze:parkplaetze_aussen"
      ? new Response("unavailable", { status: 503 })
      : collection([insideFeature("inside", 0, 0, 5, "Inside Street")]),
  );

  const result = await getNearbyParking(13.405, 52.52, 100);

  assert.equal(result.status, "partial");
  assert.equal(result.mappedSpaces, 5);
  assert.match(result.message ?? "", /error/);
});

test("requests a bounded EPSG:25833 box and filters features to the circular radius", async (t) => {
  let requestedUrl = "";
  mockOutsideFetch(t, async (input) => {
    requestedUrl = String(input);
    return collection(
      [
        feature(
          "inside",
          70,
          70,
          10,
          "Parken (ohne Beschränkungen)",
          "First Street",
        ),
        feature(
          "radius-boundary",
          105,
          0,
          2,
          "Parken (ohne Beschränkungen)",
          "Boundary Street",
        ),
        feature(
          "outside-circle",
          90,
          90,
          99,
          "Parken (ohne Beschränkungen)",
          "Far Street",
        ),
      ],
      { totalFeatures: 3 },
    );
  });

  const result = await getNearbyParking(13.405, 52.52, 100);
  const url = new URL(requestedUrl);
  const bbox = url.searchParams.get("BBOX")?.split(",");

  assert.equal(url.searchParams.get("COUNT"), "500");
  assert.equal(
    url.searchParams.get("TYPENAMES"),
    "parkplaetze:parkplaetze_aussen",
  );
  assert.equal(bbox?.[4], "EPSG:25833");
  assert.ok(Math.abs(Number(bbox?.[0]) - (destination[0] - 100)) < 0.001);
  assert.ok(Math.abs(Number(bbox?.[3]) - (destination[1] + 100)) < 0.001);
  assert.equal(result.featureCount, 2);
  assert.equal(result.mappedSpaces, 12);
  assert.deepEqual(
    result.streets.map(({ name }) => name),
    ["First Street", "Boundary Street"],
  );
});

test("aggregates mapped capacity by usability and street, preserving unknown categories", async (t) => {
  mockOutsideFetch(t, async () =>
    collection(
      [
        feature(
          "free",
          0,
          0,
          10,
          "Parken (ohne Beschränkungen)",
          "Same Street",
        ),
        feature(
          "time",
          20,
          0,
          4,
          "Parken mit zeitlicher Beschränkung",
          "Same Street",
        ),
        feature("ban", 40, 0, 3, "Parkverbot", "Restricted Road"),
        feature("unknown", 60, 0, 2, "New Category", "Unknown Road"),
      ],
      { totalFeatures: 4 },
    ),
  );

  const result = await getNearbyParking(13.405, 52.52, 100);

  assert.equal(result.status, "available");
  assert.equal(result.mappedSpaces, 19);
  assert.equal(result.usableSpaces, 10);
  assert.equal(result.conditionalSpaces, 4);
  assert.equal(result.restrictedSpaces, 3);
  assert.equal(result.unknownSpaces, 2);
  assert.deepEqual(result.streets[0], {
    name: "Same Street",
    mappedSpaces: 14,
    features: 2,
    nearestMeters: 0,
  });
  assert.ok(
    result.streets.every(({ name }) => name !== "Restricted Road"),
    "restricted/prohibited streets are excluded from candidates",
  );
  assert.ok(
    result.streets.every(({ name }) => name !== "Unknown Road"),
    "unknown restrictions are excluded from candidates",
  );
});

test("does not suggest a street with zero mapped eligible capacity", async (t) => {
  mockOutsideFetch(t, async () =>
    collection([
      feature("zero", 0, 0, 0, "Parken (ohne Beschränkungen)", "Zero Street"),
    ]),
  );

  const result = await getNearbyParking(13.405, 52.52, 100);
  assert.equal(result.featureCount, 1);
  assert.deepEqual(result.streets, []);
});

test("exposes eligible candidates with a stable location and source-backed category", async (t) => {
  mockOutsideFetch(t, async () =>
    collection([
      feature("free", 0, 0, 10, "Parken (ohne Beschränkungen)", "Free Street"),
      feature(
        "timed",
        40,
        0,
        5,
        "Parken mit zeitlicher Beschränkung",
        "Timed Street",
      ),
    ]),
  );

  const result = await getNearbyParking(13.405, 52.52, 100);

  assert.deepEqual(
    result.candidates.map((candidate) => ({
      id: candidate.id,
      streetName: candidate.streetName,
      usability: candidate.usability,
      sourceCategory: candidate.sourceCategory,
      mappedSpaces: candidate.mappedSpaces,
      distanceMeters: candidate.distanceMeters,
      geometryType: candidate.geometry.type,
    })),
    [
      {
        id: "free",
        streetName: "Free Street",
        usability: "usable",
        sourceCategory: "Parken (ohne Beschränkungen)",
        mappedSpaces: 10,
        distanceMeters: 0,
        geometryType: "Polygon",
      },
      {
        id: "timed",
        streetName: "Timed Street",
        usability: "conditional",
        sourceCategory: "Parken mit zeitlicher Beschränkung",
        mappedSpaces: 5,
        distanceMeters: 35,
        geometryType: "Polygon",
      },
    ],
  );
});

test("never exposes restricted or unknown features as candidates", async (t) => {
  mockOutsideFetch(t, async () =>
    collection([
      feature("ok", 0, 0, 4, "Parken (ohne Beschränkungen)", "Good Street"),
      feature("banned", 20, 0, 30, "Parkverbot", "Banned Street"),
      feature("unknown", 40, 0, 9, "New Category", "Unknown Road"),
    ]),
  );

  const result = await getNearbyParking(13.405, 52.52, 100);

  assert.deepEqual(
    result.candidates.map(({ id }) => id),
    ["ok"],
  );
  assert.equal(result.restrictedSpaces, 30);
  assert.equal(result.unknownSpaces, 9);
});

test("excludes a timed outside segment when its loading restriction conflicts with the stay", async (t) => {
  const timed = feature(
    "timed",
    0,
    0,
    12,
    "Parken mit zeitlicher Beschränkung",
    "Timed Street",
  );
  Object.assign(timed.properties, {
    geltungszeit_ladezone: "Mo-Fr 07:00-15:00 Uhr",
    ladezone_einschraenkungen: "Ladezone",
  });
  mockOutsideFetch(t, async () => collection([timed]));
  const result = await getNearbyParking(13.405, 52.52, 100, {
    arrivalMs: monday("10:00:00"),
    durationMinutes: 60,
  });
  assert.equal(result.restrictedSpaces, 12);
  assert.deepEqual(result.candidates, []);
});

test("keeps every inside rule field on an eligible candidate", async (t) => {
  mockInsideFetch(t, {
    beschraenkung: "Haltverbot",
    grund_fuer_beschraenkung: "Ladezone",
    geltungszeit_der_beschraenkung: "Mo-Fr 07:00-15:00 Uhr",
    hoechstparkdauer: "2 Stunden",
    parkgebuehr: "2,00 Euro",
  });

  const result = await getNearbyParking(13.405, 52.52, 100, {
    arrivalMs: monday("16:00:00"),
    durationMinutes: 60,
  });

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].usability, "conditional");
  assert.deepEqual(result.candidates[0].rules, {
    restriction: "Haltverbot Ladezone",
    hours: "Mo-Fr 07:00-15:00 Uhr",
    fee: "2,00 Euro",
    maxStay: "2 Stunden",
  });
});

test("preserves outside loading-zone rule details on an eligible candidate", async (t) => {
  mockOutsideFetch(t, async () =>
    collection([
      outsideTimedFeature("Parkverbot", {
        geltungszeit_ladezone: "Mo-Fr 07:00-15:00 Uhr",
        ladezone_einschraenkungen: "Ladezone",
      }),
    ]),
  );

  const result = await getNearbyParking(13.405, 52.52, 100, {
    arrivalMs: monday("16:00:00"),
    durationMinutes: 60,
  });

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].usability, "usable");
  assert.deepEqual(result.candidates[0].rules, {
    restriction: "Ladezone",
    hours: "Mo-Fr 07:00-15:00 Uhr",
  });
});

test("derives a stable candidate id from geometry when the source omits one", async (t) => {
  const base = feature(
    "ignored",
    0,
    0,
    3,
    "Parken (ohne Beschränkungen)",
    "No Id Street",
  );
  const [[x, y]] = base.geometry.coordinates[0];
  mockOutsideFetch(t, async () =>
    collection([
      { type: "Feature", geometry: base.geometry, properties: base.properties },
    ]),
  );

  // The id is anchored to the segment's own geometry, not the destination
  // point, so a different query point must yield the same id.
  const first = await getNearbyParking(13.405, 52.52, 100);
  const shifted = await getNearbyParking(13.4055, 52.52, 100);
  assert.equal(
    first.candidates[0].id,
    `No Id Street@${Math.round(x)},${Math.round(y)}`,
  );
  assert.equal(first.candidates[0].id, shifted.candidates[0].id);
});

test("ranks eligible segments by stay suitability, mapped supply and distance", async (t) => {
  mockOutsideFetch(t, async () =>
    collection([
      feature("near-small", 0, 0, 1, "Parken (ohne Beschränkungen)", "Near"),
      feature("far-large", 70, 0, 12, "Parken (ohne Beschränkungen)", "Far"),
      feature(
        "near-large",
        20,
        0,
        12,
        "Parken (ohne Beschränkungen)",
        "Middle",
      ),
      feature(
        "conditional",
        0,
        0,
        100,
        "Parken mit zeitlicher Beschränkung",
        "Timed",
      ),
    ]),
  );

  const result = await getNearbyParking(13.405, 52.52, 100);
  assert.deepEqual(
    result.candidates.map(({ id }) => id),
    ["near-large", "far-large", "near-small", "conditional"],
  );
  assert.deepEqual(
    suggestedAreas([
      result.candidates[0],
      { ...result.candidates[0], id: "same-street" },
      result.candidates[1],
    ]).map(({ id }) => id),
    ["near-large", "far-large"],
  );
  assert.deepEqual(
    suggestedAreas([result.candidates[0]]).map(({ id }) => id),
    ["near-large"],
  );
});

test("caps candidates at the highest-ranked eligible segments", async (t) => {
  mockOutsideFetch(t, async () =>
    collection(
      Array.from({ length: 30 }, (_, index) =>
        feature(
          `c${index}`,
          10 + index * 3,
          0,
          1,
          "Parken (ohne Beschränkungen)",
          `Street ${index}`,
        ),
      ),
      { totalFeatures: 30 },
    ),
  );

  const result = await getNearbyParking(13.405, 52.52, 100);
  assert.equal(result.candidates.length, 25);
  assert.equal(result.candidates[0].id, "c0");
});

test("retains a distinct backup street when the best 25 segments share a street", async (t) => {
  mockOutsideFetch(t, async () =>
    collection([
      ...Array.from({ length: 25 }, (_, index) =>
        feature(
          `same-${index}`,
          10 + index,
          0,
          10,
          "Parken (ohne Beschränkungen)",
          "Same Street",
        ),
      ),
      feature(
        "backup",
        80,
        0,
        1,
        "Parken (ohne Beschränkungen)",
        "Other Street",
      ),
    ]),
  );
  const result = await getNearbyParking(13.405, 52.52, 100);
  assert.equal(result.candidates.length, 25);
  assert.deepEqual(
    suggestedAreas(result.candidates).map(({ id }) => id),
    ["same-0", "backup"],
  );
});

test("reports an empty candidate list when every mapped feature is ineligible", async (t) => {
  mockOutsideFetch(t, async () =>
    collection([
      feature("banned", 0, 0, 12, "Parkverbot", "Banned Street"),
      feature("zero", 20, 0, 0, "Parken (ohne Beschränkungen)", "Zero Street"),
    ]),
  );

  const result = await getNearbyParking(13.405, 52.52, 100);

  assert.equal(result.status, "available");
  assert.equal(result.featureCount, 2);
  assert.deepEqual(result.streets, []);
  assert.deepEqual(result.candidates, []);
});

test("always returns a candidates array, even with no parking data", async (t) => {
  mockOutsideFetch(t, async () => new Response("busy", { status: 429 }));
  const unavailable = await getNearbyParking(13.405, 52.52, 500);
  assert.deepEqual(unavailable.candidates, []);

  mockOutsideFetch(t, async () => collection([], { totalFeatures: 0 }));
  const empty = await getNearbyParking(13.405, 52.52, 500);
  assert.deepEqual(empty.candidates, []);
});

test("reports a rate-limited parking service as unavailable", async (t) => {
  mockOutsideFetch(t, async () => new Response("busy", { status: 429 }));

  const result = await getNearbyParking(13.405, 52.52, 100);
  assert.equal(result.status, "unavailable");
  assert.match(result.message ?? "", /busy/);
});

test("rejects oversized WFS pages", async (t) => {
  mockOutsideFetch(t, async () =>
    collection(
      Array.from({ length: 501 }, (_, index) =>
        feature(
          String(index),
          0,
          0,
          1,
          "Parken (ohne Beschränkungen)",
          "Street",
        ),
      ),
    ),
  );

  const result = await getNearbyParking(13.405, 52.52, 100);
  assert.equal(result.status, "unavailable");
  assert.match(result.message ?? "", /page limit/);
});

test("excludes prohibited features from street candidates but keeps them in supply totals", async (t) => {
  mockOutsideFetch(t, async () =>
    collection(
      [
        feature("ok", 0, 0, 10, "Parken (ohne Beschränkungen)", "Good Street"),
        feature("banned", 20, 0, 30, "Parkverbot", "Banned Street"),
      ],
      { totalFeatures: 2 },
    ),
  );

  const result = await getNearbyParking(13.405, 52.52, 100);

  assert.equal(result.mappedSpaces, 40);
  assert.equal(result.restrictedSpaces, 30);
  assert.deepEqual(
    result.streets.map(({ name }) => name),
    ["Good Street"],
  );
  assert.equal(result.streets[0].nearestMeters, 0);
});

test("distinguishes a successful empty response from an upstream failure", async (t) => {
  mockOutsideFetch(t, async () => collection([], { totalFeatures: 0 }));
  const empty = await getNearbyParking(13.405, 52.52, 500);
  assert.equal(empty.status, "empty");
  assert.equal(empty.mappedSpaces, 0);

  mockOutsideFetch(
    t,
    async () => new Response("upstream unavailable", { status: 503 }),
  );
  const unavailable = await getNearbyParking(13.405, 52.52, 500);
  assert.equal(unavailable.status, "unavailable");
  assert.notEqual(unavailable.message, undefined);
});

test("keeps valid first-page results marked partial when a later page fails", async (t) => {
  let pages = 0;
  mockOutsideFetch(t, async () => {
    pages += 1;
    return pages === 1
      ? collection(
          [
            feature(
              "first",
              0,
              0,
              7,
              "Parken (ohne Beschränkungen)",
              "Sample Street",
            ),
          ],
          {
            totalFeatures: 2,
            links: [
              {
                rel: "next",
                href: "https://gdi.berlin.de/services/wfs/parkplaetze?page=2",
              },
            ],
          },
        )
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
  mockOutsideFetch(t, async () => {
    pages += 1;
    return pages === 1
      ? collection(
          [
            feature(
              "first",
              0,
              0,
              7,
              "Parken (ohne Beschränkungen)",
              "Sample Street",
            ),
          ],
          {
            totalFeatures: 2,
            links: [
              {
                rel: "next",
                href: "https://gdi.berlin.de/services/wfs/parkplaetze?page=2",
              },
            ],
          },
        )
      : collection(
          [
            feature(
              "second",
              20,
              0,
              5,
              "Parken (ohne Beschränkungen)",
              "Sample Street",
            ),
          ],
          { totalFeatures: 2 },
        );
  });

  const result = await getNearbyParking(13.405, 52.52, 500);

  assert.equal(pages, 2);
  assert.equal(result.status, "available");
  assert.equal(result.featureCount, 2);
  assert.equal(result.mappedSpaces, 12);
});

test("does not follow a next-page link to another host", async (t) => {
  let pages = 0;
  mockOutsideFetch(t, async () => {
    pages += 1;
    return collection(
      [
        feature(
          "first",
          0,
          0,
          7,
          "Parken (ohne Beschränkungen)",
          "Sample Street",
        ),
      ],
      {
        totalFeatures: 2,
        links: [{ rel: "next", href: "https://attacker.example/collect" }],
      },
    );
  });

  const result = await getNearbyParking(13.405, 52.52, 500);

  assert.equal(pages, 1);
  assert.equal(result.status, "partial");
  assert.equal(result.mappedSpaces, 7);
});

test("keeps the original bounds and page size on pagination links", async (t) => {
  let nextUrl: URL | undefined;
  let pages = 0;
  mockOutsideFetch(t, async (input) => {
    pages += 1;
    if (pages === 2) nextUrl = new URL(String(input));
    return collection(
      [
        feature(
          String(pages),
          0,
          0,
          1,
          "Parken (ohne Beschränkungen)",
          "Street",
        ),
      ],
      pages === 1
        ? {
            totalFeatures: 2,
            links: [
              {
                rel: "next",
                href: "https://gdi.berlin.de/services/wfs/parkplaetze?page=2",
              },
            ],
          }
        : { totalFeatures: 2 },
    );
  });

  await getNearbyParking(13.405, 52.52, 100);
  assert.equal(nextUrl?.searchParams.get("COUNT"), "500");
  assert.equal(
    nextUrl?.searchParams.get("TYPENAMES"),
    "parkplaetze:parkplaetze_aussen",
  );
  assert.ok(nextUrl?.searchParams.get("BBOX")?.endsWith("EPSG:25833"));
});

test("stops pagination at the configured page budget and marks results partial", async (t) => {
  let pages = 0;
  mockOutsideFetch(t, async () => {
    pages += 1;
    return collection(
      [
        feature(
          `page-${pages}`,
          pages,
          0,
          1,
          "Parken (ohne Beschränkungen)",
          "Sample Street",
        ),
      ],
      {
        totalFeatures: 6,
        ...(pages < 6
          ? {
              links: [
                {
                  rel: "next",
                  href: `https://gdi.berlin.de/services/wfs/parkplaetze?page=${pages + 1}`,
                },
              ],
            }
          : {}),
      },
    );
  });

  const result = await getNearbyParking(13.405, 52.52, 500);

  assert.equal(pages, 5);
  assert.equal(result.status, "partial");
  assert.equal(result.featureCount, 5);
  assert.match(result.message ?? "", /page limit/);
});

test("marks malformed feature responses unavailable instead of reporting zero supply", async (t) => {
  mockOutsideFetch(t, async () =>
    collection([{ type: "Feature", properties: {} }]),
  );

  const result = await getNearbyParking(13.405, 52.52, 500);

  assert.equal(result.status, "unavailable");
  assert.match(result.message ?? "", /invalid response/);
});

test("rejects malformed coordinate nesting without throwing during radius filtering", async (t) => {
  mockOutsideFetch(t, async () =>
    collection([
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[391779, 5820072]] },
        properties: {
          anzahl_parkplaetze: 10,
          category: "Parken (ohne Beschränkungen)",
        },
      },
    ]),
  );

  const result = await getNearbyParking(13.405, 52.52, 500);

  assert.equal(result.status, "unavailable");
  assert.match(result.message ?? "", /invalid response/);
});

// 2026-10-12 is a Monday; offsets pin the Berlin-local expectations.
const monday = (time: string) => Date.parse(`2026-10-12T${time}+02:00`);

function outsideTimedFeature(category: string, extra: Record<string, unknown>) {
  const base = feature("outside", 0, 0, 5, category, "Outside Street");
  return {
    ...base,
    properties: {
      ...(base.properties as Record<string, unknown>),
      ...extra,
    },
  };
}

function mockInsideFetch(
  t: TestContext,
  restrictions: Record<string, unknown>,
  outside?: unknown[],
) {
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) =>
    new URL(String(input)).searchParams.get("TYPENAMES") ===
    "parkplaetze:parkplaetze_aussen"
      ? collection(outside ?? [], { totalFeatures: outside?.length ?? 0 })
      : collection([
          insideFeature("inside", 0, 0, 5, "Inside Street", restrictions),
        ]),
  );
}

test("classifies a time-limited ban against the full stay: inactive means usable, mid-stay start means restricted", async (t) => {
  const timed = {
    beschraenkung: "Haltverbot",
    geltungszeit_der_beschraenkung: "Mo-Fr 07:00-15:00 Uhr",
  };
  mockInsideFetch(t, timed);

  const before = await getNearbyParking(13.405, 52.52, 100, {
    arrivalMs: monday("06:00:00"),
    durationMinutes: 30,
  });
  assert.equal(before.usableSpaces, 5);
  assert.equal(before.restrictedSpaces, 0);

  const overlapping = await getNearbyParking(13.405, 52.52, 100, {
    arrivalMs: monday("06:30:00"),
    durationMinutes: 120,
  });
  assert.equal(overlapping.restrictedSpaces, 5);
  assert.equal(overlapping.usableSpaces, 0);
  assert.deepEqual(overlapping.streets, []);
  assert.deepEqual(overlapping.candidates, []);
});

test("handles stays crossing midnight against overnight and next-day windows", async (t) => {
  mockInsideFetch(t, {
    beschraenkung: "Haltverbot",
    geltungszeit_der_beschraenkung: "Mo-So 22:00-06:00 Uhr",
  });

  const overnight = await getNearbyParking(13.405, 52.52, 100, {
    arrivalMs: monday("23:00:00"),
    durationMinutes: 120,
  });
  assert.equal(overnight.restrictedSpaces, 5);

  const daytime = await getNearbyParking(13.405, 52.52, 100, {
    arrivalMs: monday("10:00:00"),
    durationMinutes: 60,
  });
  assert.equal(daytime.usableSpaces, 5);
});

test("handles duration limits explicitly: fitting stays stay conditional, exceeding stays restricted", async (t) => {
  mockInsideFetch(t, { hoechstparkdauer: "2 Stunden" });
  const fits = await getNearbyParking(13.405, 52.52, 100, {
    arrivalMs: monday("10:00:00"),
    durationMinutes: 60,
  });
  assert.equal(fits.conditionalSpaces, 5);

  const exceeds = await getNearbyParking(13.405, 52.52, 100, {
    arrivalMs: monday("10:00:00"),
    durationMinutes: 180,
  });
  assert.equal(exceeds.restrictedSpaces, 5);
  assert.deepEqual(exceeds.streets, []);
});

test("marks reserved segments restricted, never allowed", async (t) => {
  mockInsideFetch(t, {
    nur_schwerbehinderte: "ja",
    geltungszeit_der_beschraenkung: "Mo-Fr 07:00-15:00 Uhr",
  });
  const reserved = await getNearbyParking(13.405, 52.52, 100, {
    arrivalMs: monday("10:00:00"),
    durationMinutes: 60,
  });
  assert.equal(reserved.restrictedSpaces, 5);
  assert.equal(reserved.usableSpaces, 0);
});

test("marks uninterpretable time rules unknown, never allowed", async (t) => {
  mockInsideFetch(t, {
    beschraenkung: "Haltverbot",
    geltungszeit_der_beschraenkung: "werktags",
  });
  const ambiguous = await getNearbyParking(13.405, 52.52, 100, {
    arrivalMs: monday("10:00:00"),
    durationMinutes: 60,
  });
  assert.equal(ambiguous.unknownSpaces, 5);
  assert.equal(ambiguous.usableSpaces, 0);
  assert.deepEqual(ambiguous.streets, []);
});

test("marks uninterpretable duration limits unknown, never allowed", async (t) => {
  mockInsideFetch(t, { hoechstparkdauer: "nach Bedarf" });
  const vagueDuration = await getNearbyParking(13.405, 52.52, 100, {
    arrivalMs: monday("10:00:00"),
    durationMinutes: 60,
  });
  assert.equal(vagueDuration.unknownSpaces, 5);
  assert.equal(vagueDuration.usableSpaces, 0);
});

test("applies stay windows to outside loading-zone bans, keeping unparsable hours unknown", async (t) => {
  mockInsideFetch(t, {}, [
    outsideTimedFeature("Parkverbot", {
      geltungszeit_ladezone: "Mo-Fr 07:00-15:00 Uhr",
    }),
  ]);
  const outside = await getNearbyParking(13.405, 52.52, 100, {
    arrivalMs: monday("16:00:00"),
    durationMinutes: 60,
  });
  assert.equal(outside.usableSpaces, 10);
});

test("parses mapped validity and duration text without guessing", () => {
  assert.ok(parseValidityWindows("Mo-Fr 07:00-15:00 Uhr")?.length === 1);
  assert.equal(parseValidityWindows("werktags"), null);
  assert.deepEqual(parseValidityWindows(""), []);
  assert.equal(parseMaxStayMinutes("2 Stunden"), 120);
  assert.equal(parseMaxStayMinutes("nach Bedarf"), null);
});

test("rejects invalid clock times instead of guessing permission", () => {
  assert.equal(parseValidityWindows("Mo-Fr 07:99-08:00"), null);
  assert.equal(parseValidityWindows("Mo-Fr 08:00-08:00"), null);
  assert.equal(parseValidityWindows("Montag-Freitag 07:00-15:00"), null);
  assert.equal(parseValidityWindows("werktags 07:00-15:00"), null);
  assert.equal(parseValidityWindows("Mo-Fr 07:00-24:00 Uhr")?.length, 1);
});

test("shares days and times across comma and und chunks", () => {
  assert.deepEqual(parseValidityWindows("Sa, So 10:00-18:00 Uhr"), [
    { days: [0, 6], start: 600, end: 1080 },
  ]);
  assert.deepEqual(
    parseValidityWindows("Mo-Fr 07:00-12:00 und 14:00-18:00 Uhr"),
    [
      { days: [1, 2, 3, 4, 5], start: 420, end: 720 },
      { days: [1, 2, 3, 4, 5], start: 840, end: 1080 },
    ],
  );
});

test("treats a shared weekend window as usable on Saturday morning", async (t) => {
  mockInsideFetch(t, {
    beschraenkung: "Haltverbot",
    geltungszeit_der_beschraenkung: "Sa, So 10:00-18:00 Uhr",
  });
  // 2026-10-10 is a Saturday.
  const saturday = (time: string) => Date.parse(`2026-10-10T${time}+02:00`);

  const morning = await getNearbyParking(13.405, 52.52, 100, {
    arrivalMs: saturday("08:00:00"),
    durationMinutes: 60,
  });
  assert.equal(morning.usableSpaces, 5);

  const midday = await getNearbyParking(13.405, 52.52, 100, {
    arrivalMs: saturday("11:00:00"),
    durationMinutes: 60,
  });
  assert.equal(midday.restrictedSpaces, 5);
});

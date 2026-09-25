import assert from "node:assert/strict";
import test from "node:test";
import {
  createPhotonProvider,
  normalizePhotonFeature,
} from "../src/lib/geocoder/photon.ts";

test("normalizes a Berlin house suggestion into the provider-neutral shape", () => {
  const result = normalizePhotonFeature({
    type: "Feature",
    geometry: { type: "Point", coordinates: [13.405, 52.52] },
    properties: {
      osm_type: "N",
      osm_id: 123,
      type: "house",
      housenumber: "10",
      street: "Beispielstraße",
      postcode: "10115",
      district: "Mitte",
      city: "Berlin",
      countrycode: "DE",
    },
  });

  assert.deepEqual(result, {
    id: "N:123",
    label: "Beispielstraße 10",
    detail: "10115 · Mitte · Berlin",
    latitude: 52.52,
    longitude: 13.405,
  });
});

test("rejects suggestions outside Berlin or without point coordinates", () => {
  const outsideBerlin = normalizePhotonFeature({
    type: "Feature",
    geometry: { type: "Point", coordinates: [13.6, 52.5] },
    properties: {
      city: "Potsdam",
      countrycode: "DE",
      osm_type: "N",
      osm_id: 4,
    },
  });
  const invalidGeometry = normalizePhotonFeature({
    type: "Feature",
    geometry: { type: "LineString", coordinates: [] },
    properties: { city: "Berlin", countrycode: "DE", osm_type: "W", osm_id: 5 },
  });

  assert.equal(outsideBerlin, null);
  assert.equal(invalidGeometry, null);
});

test("sends the query with a Berlin bounding box and returns normalized suggestions", async () => {
  let requestedUrl = "";
  const provider = createPhotonProvider(async (input) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({
        features: [1, 2].map((osmId) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [13.405, 52.52] },
          properties: {
            osm_type: "N",
            osm_id: osmId,
            name: "Alexanderplatz",
            city: "Berlin",
            countrycode: "DE",
          },
        })),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const suggestions = await provider.suggest("Alexanderplatz");
  const url = new URL(requestedUrl);

  assert.equal(url.searchParams.get("q"), "Alexanderplatz");
  assert.equal(url.searchParams.get("bbox"), "13.0884,52.3383,13.7611,52.6755");
  assert.equal(suggestions[0]?.label, "Alexanderplatz");
  assert.equal(suggestions[0]?.longitude, 13.405);
  assert.equal(suggestions.length, 1);
});

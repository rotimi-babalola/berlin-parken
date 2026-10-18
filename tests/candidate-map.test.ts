import assert from "node:assert/strict";
import test from "node:test";
import { candidateMapUrl } from "../src/lib/candidate-map.ts";
import { toEpsg25833, type ParkingCandidate } from "../src/lib/parking.ts";

test("links to the nearest point on a long mapped segment", () => {
  const center = toEpsg25833(13.413, 52.521);
  const candidate: ParkingCandidate = {
    id: "segment",
    streetName: "Torstraße",
    usability: "usable",
    mappedSpaces: 10,
    distanceMeters: 50,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [center[0] - 400, center[1] + 50],
          [center[0] + 400, center[1] + 50],
          [center[0] + 400, center[1] + 60],
          [center[0] - 400, center[1] + 60],
          [center[0] - 400, center[1] + 50],
        ],
      ],
    },
  };

  const url = new URL(candidateMapUrl(candidate, 13.413, 52.521));
  assert.equal(url.hostname, "www.openstreetmap.org");
  const pin = toEpsg25833(
    Number(url.searchParams.get("mlon")),
    Number(url.searchParams.get("mlat")),
  );
  assert.ok(Math.hypot(pin[0] - center[0], pin[1] - center[1] - 50) < 1);
});

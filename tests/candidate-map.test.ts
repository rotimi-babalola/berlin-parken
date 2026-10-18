import assert from "node:assert/strict";
import test from "node:test";
import {
  candidateMapPoint,
  candidateNavigationUrl,
  candidateWalkingUrl,
} from "../src/lib/candidate-map.ts";
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

  const point = candidateMapPoint(candidate, 13.413, 52.521);
  const pin = toEpsg25833(point.longitude, point.latitude);
  assert.ok(Math.hypot(pin[0] - center[0], pin[1] - center[1] - 50) < 1);

  const navigation = new URL(candidateNavigationUrl(candidate, 13.413, 52.521));
  assert.equal(navigation.searchParams.get("travelmode"), "driving");
  const [navLat, navLon] = navigation.searchParams
    .get("destination")!
    .split(",")
    .map(Number);
  assert.ok(Math.abs(navLat - point.latitude) < 0.000001);
  assert.ok(Math.abs(navLon - point.longitude) < 0.000001);
  const walking = new URL(candidateWalkingUrl(candidate, 13.413, 52.521));
  assert.equal(walking.searchParams.get("engine"), "fossgis_osrm_foot");
  assert.ok(walking.searchParams.get("route")?.endsWith(";52.521,13.413"));
});

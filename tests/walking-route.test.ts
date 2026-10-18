import assert from "node:assert/strict";
import test from "node:test";
import { getWalkingRoute } from "../src/lib/walking-route.ts";

const from = { latitude: 52.521, longitude: 13.413 };
const to = { latitude: 52.5215, longitude: 13.414 };

test("uses pedestrian routing distance, time and path", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(JSON.parse(String(init?.body)).costing, "pedestrian");
      return Response.json({
        routes: [
          {
            distance: 145.2,
            duration: 123,
            geometry: {
              coordinates: [
                [13.413, 52.521],
                [13.414, 52.5215],
              ],
            },
          },
        ],
      });
    },
  );
  assert.deepEqual(await getWalkingRoute(from, to), {
    distanceMeters: 145,
    durationMinutes: 3,
    coordinates: [
      [13.413, 52.521],
      [13.414, 52.5215],
    ],
  });
});

test("rejects invalid locations and malformed router responses", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ routes: [{ distance: 100, duration: 80 }] }),
  );
  await assert.rejects(getWalkingRoute({ latitude: 0, longitude: 0 }, to));
  assert.equal(fetchMock.mock.callCount(), 0);
  await assert.rejects(getWalkingRoute(from, to));
});

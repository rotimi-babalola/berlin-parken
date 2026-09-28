import assert from "node:assert/strict";
import test from "node:test";
import {
  TILE_SIZE,
  lonLatToTile,
  metersPerPixel,
  tileUrl,
  zoomForRadius,
} from "../src/lib/tiles.ts";

test("lonLatToTile centres Alexanderplatz on its tile", () => {
  const tile = lonLatToTile(13.413, 52.521, 16);
  assert.equal(tile.x, 35209);
  assert.equal(tile.y, 21492);
  assert.ok(tile.px >= 0 && tile.px < TILE_SIZE);
  assert.ok(tile.py >= 0 && tile.py < TILE_SIZE);
});

test("lonLatToTile clamps the antimeridian and poles", () => {
  const east = lonLatToTile(180, 0, 3);
  assert.equal(east.x, 7);
  const west = lonLatToTile(-180, 0, 3);
  assert.equal(west.x, 0);
});

test("metersPerPixel shrinks by half per zoom level", () => {
  const z15 = metersPerPixel(52.52, 15);
  const z16 = metersPerPixel(52.52, 16);
  assert.ok(Math.abs(z15 / 2 - z16) < 1e-9);
  // ~1.45 m/px over Berlin at z16: a 3×3 grid covers ~1.1 km.
  assert.ok(z16 > 1 && z16 < 2);
});

test("zoomForRadius keeps the radius inside a 3×3 grid", () => {
  assert.equal(zoomForRadius(100), 17);
  assert.equal(zoomForRadius(500), 16);
  assert.equal(zoomForRadius(1000), 15);
  for (const radius of [100, 500, 1000]) {
    const zoom = zoomForRadius(radius);
    const spanMeters = metersPerPixel(52.52, zoom) * TILE_SIZE * 3;
    assert.ok(spanMeters > radius * 2);
  }
});

test("tileUrl spreads subdomains and targets CARTO light tiles", () => {
  assert.equal(
    tileUrl(35209, 21492, 16),
    "https://b.basemaps.cartocdn.com/light_all/16/35209/21492.png",
  );
  assert.equal(
    tileUrl(35209, 21492, 16, "test-key"),
    "https://b.basemaps.cartocdn.com/light_all/16/35209/21492.png?key=test-key",
  );
});

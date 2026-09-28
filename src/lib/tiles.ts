// Pure slippy-map helpers for the static location map (CARTO light tiles).
// No network access here; the component only renders <img> URLs.

export const TILE_SIZE = 256;

export type TileRef = {
  x: number;
  y: number;
  /** Pixel of the point inside its tile (0–255). */
  px: number;
  py: number;
};

export function lonLatToTile(
  longitude: number,
  latitude: number,
  zoom: number,
): TileRef {
  const scale = 2 ** zoom;
  const xFloat = ((longitude + 180) / 360) * scale;
  const latRad = (latitude * Math.PI) / 180;
  const yFloat =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    scale;
  const x = Math.min(scale - 1, Math.max(0, Math.floor(xFloat)));
  const y = Math.min(scale - 1, Math.max(0, Math.floor(yFloat)));
  return {
    x,
    y,
    px: Math.min(255, Math.max(0, Math.floor((xFloat - x) * TILE_SIZE))),
    py: Math.min(255, Math.max(0, Math.floor((yFloat - y) * TILE_SIZE))),
  };
}

export function metersPerPixel(latitude: number, zoom: number): number {
  return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;
}

// Keeps the search radius comfortably inside a 3×3 tile grid.
export function zoomForRadius(radiusMeters: number): number {
  if (radiusMeters <= 200) return 17;
  if (radiusMeters <= 500) return 16;
  return 15;
}

export function tileUrl(
  x: number,
  y: number,
  zoom: number,
  key?: string,
): string {
  const sub = "abcd"[(x + y) % 4];
  const url = `https://${sub}.basemaps.cartocdn.com/light_all/${zoom}/${x}/${y}.png`;
  return key ? `${url}?key=${key}` : url;
}

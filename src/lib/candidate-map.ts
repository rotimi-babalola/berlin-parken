import {
  toEpsg25833,
  type ParkingCandidate,
  type Position,
} from "./parking.ts";

// Use the nearest mapped boundary point so the pin identifies the selected
// segment, even when several segments share a street name.
export function candidateMapUrl(
  candidate: ParkingCandidate,
  longitude: number,
  latitude: number,
): string {
  const origin = toEpsg25833(longitude, latitude);
  const polygons =
    candidate.geometry.type === "Polygon"
      ? [candidate.geometry.coordinates as Position[][]]
      : (candidate.geometry.coordinates as Position[][][]);
  let point: Position = polygons[0][0][0];
  let nearest = Infinity;
  for (const [outer] of polygons) {
    for (let index = 1; index < outer.length; index++) {
      const start = outer[index - 1];
      const end = outer[index];
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const length = dx * dx + dy * dy;
      const fraction = length
        ? Math.max(
            0,
            Math.min(
              1,
              ((origin[0] - start[0]) * dx + (origin[1] - start[1]) * dy) /
                length,
            ),
          )
        : 0;
      const x = start[0] + fraction * dx;
      const y = start[1] + fraction * dy;
      const distance = (x - origin[0]) ** 2 + (y - origin[1]) ** 2;
      if (distance < nearest) {
        point = [x, y];
        nearest = distance;
      }
    }
  }

  // Linearize the existing projection at the destination; searches stay
  // within 1 km, where this local inverse is accurate to map-pin scale.
  const step = 0.00001;
  const east = toEpsg25833(longitude + step, latitude);
  const north = toEpsg25833(longitude, latitude + step);
  const ex = east[0] - origin[0];
  const ey = east[1] - origin[1];
  const nx = north[0] - origin[0];
  const ny = north[1] - origin[1];
  const dx = point[0] - origin[0];
  const dy = point[1] - origin[1];
  const determinant = ex * ny - ey * nx;
  const pinLon = longitude + (step * (dx * ny - dy * nx)) / determinant;
  const pinLat = latitude + (step * (dy * ex - dx * ey)) / determinant;
  return `https://www.openstreetmap.org/?mlat=${pinLat.toFixed(6)}&mlon=${pinLon.toFixed(6)}#map=18/${pinLat.toFixed(6)}/${pinLon.toFixed(6)}`;
}

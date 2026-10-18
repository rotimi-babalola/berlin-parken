import { isInBerlin } from "./results-url.ts";

export type WalkingRoute = {
  distanceMeters: number;
  durationMinutes: number;
  coordinates: [number, number][];
};

export async function getWalkingRoute(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): Promise<WalkingRoute> {
  if (
    !isInBerlin(from.latitude, from.longitude) ||
    !isInBerlin(to.latitude, to.longitude) ||
    Math.hypot(
      (from.latitude - to.latitude) * 111_000,
      (from.longitude - to.longitude) * 68_000,
    ) > 2000
  ) {
    throw new RangeError("Invalid walking route coordinates");
  }

  const request = {
    locations: [
      { lat: from.latitude, lon: from.longitude },
      { lat: to.latitude, lon: to.longitude },
    ],
    costing: "pedestrian",
    format: "osrm",
    shape_format: "geojson",
    directions_type: "none",
  };
  const response = await fetch("https://valhalla1.openstreetmap.de/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Pedestrian routing unavailable");
  const payload = await response.json();
  const route = payload?.routes?.[0];
  const coordinates = route?.geometry?.coordinates;
  if (
    !Number.isFinite(route?.distance) ||
    route.distance < 0 ||
    !Number.isFinite(route?.duration) ||
    route.duration < 0 ||
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    !coordinates.every(
      (point: unknown) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        isInBerlin(point[1], point[0]),
    )
  ) {
    throw new Error("Invalid pedestrian route response");
  }
  return {
    distanceMeters: Math.round(route.distance),
    durationMinutes: Math.max(1, Math.ceil(route.duration / 60)),
    coordinates,
  };
}

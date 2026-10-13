import { parseArrival, parseDuration } from "./search-time.ts";

export type ResultsQuery = {
  label: string;
  latitude: number;
  longitude: number;
  radius: number;
  /** `datetime-local` value shown in the search form. */
  arrival: string;
  duration: number;
};

export type ParsedResultsQuery = ResultsQuery & { arrivalMs: number };

const BERLIN_BBOX = { minLon: 13.0, maxLon: 13.8, minLat: 52.3, maxLat: 52.7 };

export function buildResultsUrl(query: ResultsQuery): string {
  const params = new URLSearchParams({
    label: query.label,
    lat: String(query.latitude),
    lon: String(query.longitude),
    radius: String(query.radius),
    arrival: query.arrival,
    duration: String(query.duration),
  });
  return `/results?${params.toString()}`;
}

// Single validator for the shareable results URL, so refresh and shared
// links resolve to the same search. Mirrors the /api/parking bounds.
export function parseResultsParams(
  params: URLSearchParams,
): { ok: true; value: ParsedResultsQuery } | { ok: false } {
  const label = (params.get("label") ?? "").trim();
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));
  const radius = Number(params.get("radius"));
  const arrival = params.get("arrival") ?? "";
  const durationParam = params.get("duration") ?? "";
  if (!label || label.length > 200) return { ok: false };
  if (
    !Number.isFinite(latitude) ||
    latitude < BERLIN_BBOX.minLat ||
    latitude > BERLIN_BBOX.maxLat ||
    !Number.isFinite(longitude) ||
    longitude < BERLIN_BBOX.minLon ||
    longitude > BERLIN_BBOX.maxLon ||
    !Number.isInteger(radius) ||
    radius < 100 ||
    radius > 1000
  ) {
    return { ok: false };
  }
  const parsedArrival = parseArrival(arrival);
  const parsedDuration = parseDuration(durationParam);
  if (!parsedArrival.ok || !parsedDuration.ok) return { ok: false };
  return {
    ok: true,
    value: {
      label,
      latitude,
      longitude,
      radius,
      arrival,
      duration: parsedDuration.minutes,
      arrivalMs: parsedArrival.date.getTime(),
    },
  };
}

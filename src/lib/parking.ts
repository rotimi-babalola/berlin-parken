import { fetchWfsFeatures, wfsParams } from "./wfs.ts";

export type ParkingUsability =
  "usable" | "conditional" | "restricted" | "unknown";

export type ParkingSummary = {
  status: "available" | "empty" | "partial" | "unavailable";
  fetchedAt?: string;
  message?: string;
  mappedSpaces: number;
  usableSpaces: number;
  conditionalSpaces: number;
  restrictedSpaces: number;
  unknownSpaces: number;
  featureCount: number;
  streets: Array<{
    name: string;
    mappedSpaces: number;
    features: number;
    nearestMeters: number;
  }>;
};

export type Position = [number, number];
type Ring = Position[];
type Polygon = Ring[];
export type Geometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: Polygon | Polygon[];
};
type Feature = {
  type: "Feature";
  id?: string | number;
  geometry: Geometry | null;
  properties: Record<string, unknown>;
};
type FeatureCollection = {
  type: "FeatureCollection";
  features: Feature[];
  totalFeatures?: number;
  links?: Array<{ rel: string; href: string }>;
};

const endpoint = "https://gdi.berlin.de/services/wfs/parkplaetze";

export function toEpsg25833(longitude: number, latitude: number): Position {
  const a = 6378137;
  const e = 0.08181919084262149;
  const k0 = 0.9996;
  const radians = Math.PI / 180;
  const lat = latitude * radians;
  const lon = longitude * radians;
  const lon0 = 15 * radians;
  const ep2 = (e * e) / (1 - e * e);
  const n = a / Math.sqrt(1 - e * e * Math.sin(lat) ** 2);
  const t = Math.tan(lat) ** 2;
  const c = ep2 * Math.cos(lat) ** 2;
  const aa = Math.cos(lat) * (lon - lon0);
  const m =
    a *
    ((1 - (e * e) / 4 - (3 * e ** 4) / 64 - (5 * e ** 6) / 256) * lat -
      ((3 * e ** 2) / 8 + (3 * e ** 4) / 32 + (45 * e ** 6) / 1024) *
        Math.sin(2 * lat) +
      ((15 * e ** 4) / 256 + (45 * e ** 6) / 1024) * Math.sin(4 * lat) -
      ((35 * e ** 6) / 3072) * Math.sin(6 * lat));
  const east =
    500000 +
    k0 *
      n *
      (aa +
        ((1 - t + c) * aa ** 3) / 6 +
        ((5 - 18 * t + t ** 2 + 72 * c - 58 * ep2) * aa ** 5) / 120);
  const north =
    k0 *
    (m +
      n *
        Math.tan(lat) *
        (aa ** 2 / 2 +
          ((5 - t + 9 * c + 4 * c ** 2) * aa ** 4) / 24 +
          ((61 - 58 * t + t ** 2 + 600 * c - 330 * ep2) * aa ** 6) / 720));
  return [east, north];
}

function segmentDistance(
  point: Position,
  start: Position,
  end: Position,
): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  const fraction = lengthSquared
    ? Math.max(
        0,
        Math.min(
          1,
          ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) /
            lengthSquared,
        ),
      )
    : 0;
  return Math.hypot(
    point[0] - start[0] - fraction * dx,
    point[1] - start[1] - fraction * dy,
  );
}

function ringContains(point: Position, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i];
    const [jx, jy] = ring[j];
    if (
      y > point[1] !== jy > point[1] &&
      point[0] < ((jx - x) * (point[1] - y)) / (jy - y) + x
    )
      inside = !inside;
  }
  return inside;
}

function ringDistance(point: Position, ring: Ring): number {
  let distance = Infinity;
  for (let i = 1; i < ring.length; i++)
    distance = Math.min(distance, segmentDistance(point, ring[i - 1], ring[i]));
  return distance;
}

export function geometryDistance(point: Position, geometry: Geometry): number {
  const polygons =
    geometry.type === "Polygon"
      ? [geometry.coordinates as Polygon]
      : (geometry.coordinates as Polygon[]);
  let distance = Infinity;
  for (const polygon of polygons) {
    if (
      polygon[0] &&
      ringContains(point, polygon[0]) &&
      !polygon.slice(1).some((hole) => ringContains(point, hole))
    )
      return 0;
    for (const ring of polygon)
      distance = Math.min(distance, ringDistance(point, ring));
  }
  return distance;
}

function classify(category: string, publicLand: string): ParkingUsability {
  if (category === "Parken (ohne Beschränkungen)")
    return publicLand === "Ja" ? "usable" : "restricted";
  if (
    ["Parken mit zeitlicher Beschränkung", "Beschränkte Parkdauer"].includes(
      category,
    )
  )
    return "conditional";
  if (
    ["Parkverbot", "Nutzungsgruppe", "Ladezone", "Beschränkungen"].includes(
      category,
    )
  )
    return "restricted";
  return "unknown";
}

function classifyInside(properties: Record<string, unknown>): ParkingUsability {
  if (properties.oeffentliches_strassenland !== "Ja") return "restricted";
  if (
    properties.nur_schwerbehinderte === "ja" ||
    properties.carsharing === "ja"
  )
    return "restricted";
  if (properties.beschraenkung || properties.grund_fuer_beschraenkung)
    return properties.geltungszeit_der_beschraenkung
      ? "conditional"
      : "restricted";
  if (
    properties.parkgebuehr ||
    properties.hoechstparkdauer ||
    properties.geltungszeit_der_beschraenkung
  )
    return "conditional";
  return "usable";
}

function validCollection(value: unknown): value is FeatureCollection {
  if (!value || typeof value !== "object") return false;
  const collection = value as FeatureCollection;
  return (
    collection.type === "FeatureCollection" &&
    Array.isArray(collection.features) &&
    collection.features.every(
      (feature) =>
        feature?.type === "Feature" &&
        feature.properties &&
        typeof feature.properties === "object" &&
        typeof feature.geometry === "object" &&
        feature.geometry !== null &&
        validGeometry(feature.geometry),
    )
  );
}

function validPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every(
      (coordinate) =>
        typeof coordinate === "number" && Number.isFinite(coordinate),
    )
  );
}

function validRing(value: unknown): value is Ring {
  if (!Array.isArray(value) || value.length < 4 || !value.every(validPosition))
    return false;
  const first = value[0];
  const last = value[value.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

function validPolygon(value: unknown): value is Polygon {
  return Array.isArray(value) && value.length > 0 && value.every(validRing);
}

export function validGeometry(value: Geometry): boolean {
  if (value.type === "Polygon") return validPolygon(value.coordinates);
  return (
    value.type === "MultiPolygon" &&
    Array.isArray(value.coordinates) &&
    value.coordinates.length > 0 &&
    value.coordinates.every(validPolygon)
  );
}

export async function getNearbyParking(
  longitude: number,
  latitude: number,
  radiusMeters: number,
): Promise<ParkingSummary> {
  const unavailable = (message: string): ParkingSummary => ({
    status: "unavailable",
    message,
    mappedSpaces: 0,
    usableSpaces: 0,
    conditionalSpaces: 0,
    restrictedSpaces: 0,
    unknownSpaces: 0,
    featureCount: 0,
    streets: [],
  });
  const [east, north] = toEpsg25833(longitude, latitude);
  const layers = ["parkplaetze:parkplaetze", "parkplaetze:parkplaetze_aussen"];
  const results = await Promise.all(
    layers.map((layer) =>
      fetchWfsFeatures<Feature>(
        endpoint,
        wfsParams(layer, east, north, radiusMeters),
        validCollection,
      ),
    ),
  );
  const features = results.flatMap((result) => result.features);
  const fetchedAt = results
    .map((result) => result.fetchedAt)
    .sort()
    .at(-1)!;
  const failed = results.find((result) => "failed" in result);
  if (failed && !features.length) return unavailable(failed.failed);
  const incomplete = results.some(
    (result) => "failed" in result || result.incomplete,
  );
  return summarize(
    features,
    [east, north],
    radiusMeters,
    fetchedAt,
    incomplete,
    failed
      ? failed.failed
      : incomplete
        ? "Some nearby records may be missing because the service page limit was reached."
        : undefined,
  );
}

function summarize(
  features: Feature[],
  point: Position,
  radius: number,
  fetchedAt: string,
  partial?: boolean,
  message?: string,
): ParkingSummary {
  features = features.filter(
    (feature) =>
      feature.geometry && geometryDistance(point, feature.geometry) <= radius,
  );
  const status = partial ? "partial" : features.length ? "available" : "empty";
  const result: ParkingSummary = {
    status,
    fetchedAt,
    ...(message ? { message } : {}),
    mappedSpaces: 0,
    usableSpaces: 0,
    conditionalSpaces: 0,
    restrictedSpaces: 0,
    unknownSpaces: 0,
    featureCount: features.length,
    streets: [],
  };
  const streets = new Map<
    string,
    { mappedSpaces: number; features: number; nearestMeters: number }
  >();
  for (const feature of features) {
    const properties = feature.properties;
    const inside = "errechnete_anzahl_parkplaetze" in properties;
    const spaces = Number(
      inside
        ? properties.errechnete_anzahl_parkplaetze
        : properties.anzahl_parkplaetze,
    );
    const capacity = Number.isFinite(spaces) && spaces > 0 ? spaces : 0;
    const usability = inside
      ? classifyInside(properties)
      : classify(
          String(properties.category ?? ""),
          String(properties.oeffentlichesstrassenland ?? ""),
        );
    result.mappedSpaces += capacity;
    if (usability === "usable") result.usableSpaces += capacity;
    else if (usability === "conditional") result.conditionalSpaces += capacity;
    else if (usability === "restricted") result.restrictedSpaces += capacity;
    else result.unknownSpaces += capacity;
    // Only mapped usable or conditional capacity can support a street suggestion.
    if ((usability !== "usable" && usability !== "conditional") || !capacity)
      continue;
    const name = String(properties.strassenname ?? "").trim();
    if (name && feature.geometry) {
      const rounded = Math.round(geometryDistance(point, feature.geometry));
      const street = streets.get(name) ?? {
        mappedSpaces: 0,
        features: 0,
        nearestMeters: rounded,
      };
      street.mappedSpaces += capacity;
      street.features++;
      street.nearestMeters = Math.min(street.nearestMeters, rounded);
      streets.set(name, street);
    }
  }
  result.streets = [...streets]
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.mappedSpaces - a.mappedSpaces)
    .slice(0, 8);
  return result;
}

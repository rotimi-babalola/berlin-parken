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

export type StayInterval = { arrivalMs: number; durationMinutes: number };

const DAY_INDEX: Record<string, number> = {
  mo: 1,
  di: 2,
  mi: 3,
  do: 4,
  fr: 5,
  sa: 6,
  so: 0,
};

export type ValidityWindow = { days: Set<number>; start: number; end: number };

const TIME_RANGE =
  /(\d{1,2})[:.](\d{2})\s*(?:-|–|—|\bbis\b)\s*(\d{1,2})[:.](\d{2})/i;
const DAY_TOKEN = /(mo|di|mi|do|fr|sa|so)\.?/gi;

// Parses mapped time-limit text (e.g. "Mo-Fr 07:00-15:00 Uhr") into weekly
// windows. Returns null when the text is non-empty but not interpretable,
// so callers fall back to "unknown" instead of guessing "allowed".
export function parseValidityWindows(value: string): ValidityWindow[] | null {
  const text = value.trim();
  if (!text) return [];
  const segments = text
    .split(/[;,/]+|\bund\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!segments.length) return null;
  const windows: ValidityWindow[] = [];
  for (const segment of segments) {
    const dayMatches = [...segment.matchAll(DAY_TOKEN)].map((m) =>
      m[1].toLowerCase(),
    );
    const timeMatch = segment.match(TIME_RANGE);
    const days = new Set<number>();
    const range = segment.match(
      /(mo|di|mi|do|fr|sa|so)\.?\s*-\s*(mo|di|mi|do|fr|sa|so)\.?/i,
    );
    if (range) {
      let day = DAY_INDEX[range[1].toLowerCase()];
      const end = DAY_INDEX[range[2].toLowerCase()];
      for (;;) {
        days.add(day);
        if (day === end) break;
        day = (day + 1) % 7;
      }
    }
    for (const token of dayMatches) days.add(DAY_INDEX[token]);
    if (!dayMatches.length) for (let d = 0; d < 7; d++) days.add(d);
    if (!timeMatch) {
      // Explicit days without hours mean the whole day; anything else is
      // ambiguous rather than permission.
      if (!dayMatches.length) return null;
      windows.push({ days, start: 0, end: 24 * 60 });
      continue;
    }
    const start = Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
    const end = Number(timeMatch[3]) * 60 + Number(timeMatch[4]);
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      start >= 24 * 60 ||
      end < 0 ||
      end > 24 * 60
    )
      return null;
    windows.push({ days, start, end });
  }
  return windows.length ? windows : null;
}

// Parses mapped max-stay text (e.g. "2 Stunden", "120 Min."). Null means
// the limit exists but is not interpretable → "unknown".
export function parseMaxStayMinutes(value: string): number | null {
  const text = value.trim().toLowerCase().replace(",", ".");
  const match = text.match(
    /(\d+(?:\.\d+)?)\s*(std\.?|stunden?|h|hour|minutes?|min\.?)/i,
  );
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = match[2].toLowerCase();
  const minutes = unit.startsWith("min") ? amount : amount * 60;
  return Math.round(minutes);
}

const berlinFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const BERLIN_DAY: Record<string, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 0,
};

function berlinParts(ms: number): { day: number; minutes: number } {
  let day = new Date(ms).getDay();
  let minutes = 0;
  for (const part of berlinFormat.formatToParts(new Date(ms))) {
    if (part.type === "weekday")
      day = BERLIN_DAY[part.value.slice(0, 3).toLowerCase()] ?? day;
    if (part.type === "hour") minutes += Number(part.value) * 60;
    if (part.type === "minute") minutes += Number(part.value);
  }
  return { day, minutes: minutes % (24 * 60) };
}

function windowActiveAt(ms: number, windows: ValidityWindow[]): boolean {
  const { day, minutes } = berlinParts(ms);
  return windows.some(
    (window) =>
      window.days.has(day) &&
      (window.start <= window.end
        ? minutes >= window.start && minutes < window.end
        : minutes >= window.start || minutes < window.end),
  );
}

// Any overlap between the stay [arrival, departure) and a restriction
// window counts: leaving before the restriction starts is the only safe
// case, including stays that cross midnight (handled per-minute in Berlin
// local time).
export function restrictionOverlapsStay(
  windows: ValidityWindow[],
  arrivalMs: number,
  durationMinutes: number,
): boolean {
  const departureMs = arrivalMs + durationMinutes * 60 * 1000;
  if (departureMs <= arrivalMs) return windowActiveAt(arrivalMs, windows);
  for (let t = arrivalMs; t < departureMs; t += 60 * 1000)
    if (windowActiveAt(t, windows)) return true;
  return windowActiveAt(departureMs - 1, windows);
}

function textOf(properties: Record<string, unknown>, key: string): string {
  const value = properties[key];
  return typeof value === "string" ? value.trim() : "";
}

function overlapsOrUnknown(
  raw: string,
  stay: StayInterval | undefined,
  fallback: ParkingUsability,
): ParkingUsability {
  const windows = parseValidityWindows(raw);
  if (windows === null) return "unknown";
  if (!stay) return fallback;
  if (!windows.length) return fallback;
  return restrictionOverlapsStay(windows, stay.arrivalMs, stay.durationMinutes)
    ? "restricted"
    : "usable";
}
function classify(
  category: string,
  publicLand: string,
  properties: Record<string, unknown> = {},
  stay?: StayInterval,
): ParkingUsability {
  if (category === "Parken (ohne Beschränkungen)") {
    if (publicLand !== "Ja") return "restricted";
    const loadingTime = textOf(properties, "geltungszeit_ladezone");
    if (!loadingTime) return "usable";
    // A loading-window ban applies only while it overlaps the stay;
    // uninterpretable hours are never treated as permission.
    return overlapsOrUnknown(loadingTime, stay, "usable");
  }
  if (
    ["Parken mit zeitlicher Beschränkung", "Beschränkte Parkdauer"].includes(
      category,
    )
  )
    return "conditional";
  if (category === "Nutzungsgruppe") return "restricted";
  if (["Parkverbot", "Ladezone", "Beschränkungen"].includes(category)) {
    const loadingTime = textOf(properties, "geltungszeit_ladezone");
    if (!loadingTime) return "restricted";
    return overlapsOrUnknown(loadingTime, stay, "restricted");
  }
  return "unknown";
}

function classifyInside(
  properties: Record<string, unknown>,
  stay?: StayInterval,
): ParkingUsability {
  if (properties.oeffentliches_strassenland !== "Ja") return "restricted";
  if (
    properties.nur_schwerbehinderte === "ja" ||
    properties.carsharing === "ja"
  )
    return "restricted";
  const restriction =
    `${textOf(properties, "beschraenkung")} ${textOf(properties, "grund_fuer_beschraenkung")}`.trim();
  const validity = textOf(properties, "geltungszeit_der_beschraenkung");
  const fee = textOf(properties, "parkgebuehr");
  const maxStay = textOf(properties, "hoechstparkdauer");
  if (restriction) {
    if (
      /bewohner|anwohner|carsharing|schwerbehindert|taxi|bus|behindert/i.test(
        restriction,
      )
    )
      return "restricted";
    if (validity) {
      const outcome = overlapsOrUnknown(validity, stay, "conditional");
      // An inactive time-limited ban falls through to fee/duration checks;
      // an active one (or uninterpretable hours) decides the segment.
      if (outcome !== "usable") return outcome;
    } else {
      return "restricted";
    }
  }
  if (maxStay) {
    const maxMinutes = parseMaxStayMinutes(maxStay);
    if (maxMinutes === null) return "unknown";
    if (stay && stay.durationMinutes > maxMinutes) return "restricted";
    return "conditional";
  }
  if (fee || validity) {
    if (!validity) return "conditional";
    const windows = parseValidityWindows(validity);
    if (windows === null) return "unknown";
    if (!stay) return "conditional";
    // A fee/time rule outside the stay leaves the segment unrestricted;
    // any overlap keeps it conditional.
    return restrictionOverlapsStay(
      windows,
      stay.arrivalMs,
      stay.durationMinutes,
    )
      ? "conditional"
      : "usable";
  }
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
  stay?: StayInterval,
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
    stay,
  );
}

function summarize(
  features: Feature[],
  point: Position,
  radius: number,
  fetchedAt: string,
  partial?: boolean,
  message?: string,
  stay?: StayInterval,
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
      ? classifyInside(properties, stay)
      : classify(
          String(properties.category ?? ""),
          String(properties.oeffentlichesstrassenland ?? ""),
          properties,
          stay,
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

import { fetchWfsFeatures, wfsParams } from "./wfs.ts";

export type ParkingUsability =
  "usable" | "conditional" | "restricted" | "unknown";

// An eligible mapped parking segment: a usable or conditional feature with
// positive mapped capacity. Unlike the street-wide totals, each candidate
// keeps its own geometry and source-backed rule details so downstream
// ranking and navigation can point at a specific area.
export type ParkingCandidate = {
  id: string;
  streetName?: string;
  usability: "usable" | "conditional";
  /** Outside layer's mapped `category`; inside layers carry their rules below. */
  sourceCategory?: string;
  mappedSpaces: number;
  distanceMeters: number;
  /** EPSG:25833 metres straight from the Berlin WFS, not WGS84 lng/lat. */
  geometry: Geometry;
  rules?: {
    restriction?: string;
    hours?: string;
    fee?: string;
    maxStay?: string;
  };
};

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
  candidates: ParkingCandidate[];
};

export function suggestedAreas(
  candidates: ParkingCandidate[],
): ParkingCandidate[] {
  const first = candidates.find((candidate) => candidate.streetName);
  if (!first) return [];
  const backup = candidates.find(
    (candidate) =>
      candidate.streetName && candidate.streetName !== first.streetName,
  );
  return backup ? [first, backup] : [first];
}

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

export type ValidityWindow = { days: number[]; start: number; end: number };

const TIME_RANGE =
  /(\d{1,2})[:.](\d{2})\s*(?:-|–|—|\bbis\b)\s*(\d{1,2})[:.](\d{2})/i;
const DAY_TOKEN = /(mo|di|mi|do|fr|sa|so)\.?/gi;
const DAY_RANGE = /(mo|di|mi|do|fr|sa|so)\.?\s*-\s*(mo|di|mi|do|fr|sa|so)\.?/i;
// Full day names and weekday aggregates never map to exact days here:
// guessing e.g. Mon–Sat for "werktags" would risk false permission, so any
// such residue makes the whole text uninterpretable (→ "unknown").
const UNMAPPABLE_DAY_WORDS =
  /montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonnabend|sonntag|werktags|wochentags|feiertags?|wochenende/i;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function unionDays(a: number[], b: number[]): number[] {
  return [...new Set([...a, ...b])].sort((x, y) => x - y);
}

// Parses mapped time-limit text (e.g. "Mo-Fr 07:00-15:00 Uhr") into weekly
// windows. Returns null when the text is non-empty but not interpretable,
// so callers fall back to "unknown" instead of guessing "allowed".
// Commas and "und" only split chunks that share days/times: "Sa, So
// 10:00-18:00" is one window for both days, and in "Mo-Fr 07:00-12:00 und
// 14:00-18:00" the second time inherits Mo-Fr instead of all days.
export function parseValidityWindows(value: string): ValidityWindow[] | null {
  const text = value.trim();
  if (!text) return [];
  const windows: ValidityWindow[] = [];
  // Semicolons separate independent rules; commas/"und" share context.
  for (const part of text.split(/[;/]+/)) {
    let pending: number[] | null = null;
    let last: number[] | null = null;
    const chunks = part.split(/\bund\b/i).flatMap((s) => s.split(/[,/]+/));
    for (let chunk of chunks) {
      chunk = chunk.trim();
      if (!chunk) continue;
      if (UNMAPPABLE_DAY_WORDS.test(chunk)) return null;
      const days = extractDays(chunk);
      const time = extractTime(chunk);
      if (time === null) return null;
      if (days && time) {
        const resolved = pending ? unionDays(pending, days) : days;
        windows.push({ days: resolved, ...time });
        last = resolved;
        pending = null;
      } else if (days) {
        pending = pending ? unionDays(pending, days) : days;
      } else if (time) {
        const resolved: number[] = pending ?? last ?? ALL_DAYS;
        windows.push({ days: resolved, ...time });
        last = resolved;
        pending = null;
      } else {
        return null;
      }
    }
    // Explicit days without hours mean the whole day.
    if (pending) windows.push({ days: pending, start: 0, end: 24 * 60 });
  }
  return windows.length ? windows : null;
}

function extractDays(chunk: string): number[] | null {
  const tokens = [...chunk.matchAll(DAY_TOKEN)].map((m) => m[1].toLowerCase());
  if (!tokens.length) return null;
  const days = new Set<number>();
  const range = chunk.match(DAY_RANGE);
  if (range) {
    let day = DAY_INDEX[range[1].toLowerCase()];
    const end = DAY_INDEX[range[2].toLowerCase()];
    for (let i = 0; i < 7; i++) {
      days.add(day);
      if (day === end) break;
      day = (day + 1) % 7;
    }
  }
  for (const token of tokens) days.add(DAY_INDEX[token]);
  return [...days].sort((a, b) => a - b);
}

// Undefined means no time in the chunk (days may be inherited); null means
// time-like but not interpretable → the whole text is "unknown".
function extractTime(
  chunk: string,
): { start: number; end: number } | null | undefined {
  const match = chunk.match(TIME_RANGE);
  if (!match) return /(\d{1,2})[:.](\d{2})/.test(chunk) ? null : undefined;
  const start = extractMinutes(match[1], match[2], false);
  const end = extractMinutes(match[3], match[4], true);
  if (start === null || end === null) return null;
  // An empty-or-full-day range is ambiguous rather than permission.
  if (start === end) return null;
  return { start, end };
}

function extractMinutes(
  hour: string,
  minute: string,
  allowMidnightEnd: boolean,
): number | null {
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isInteger(h) || !Number.isInteger(m) || m < 0 || m > 59)
    return null;
  if (h === 24 && m === 0 && allowMidnightEnd) return 24 * 60;
  if (h < 0 || h > 23) return null;
  return h * 60 + m;
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

const berlinWallFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

// Whole-minute Berlin offset (CET +60 / CEST +120) for an instant.
function berlinOffsetMs(ms: number): number {
  const parts: Record<string, string> = {};
  for (const part of berlinWallFormat.formatToParts(new Date(ms)))
    if (part.type !== "literal") parts[part.type] = part.value;
  const wallMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((wallMs - ms) / 60000) * 60000;
}

function berlinParts(ms: number): { day: number; minutes: number } {
  const date = new Date(ms);
  let day = date.getDay();
  let minutes = 0;
  for (const part of berlinFormat.formatToParts(date)) {
    if (part.type === "weekday")
      day = BERLIN_DAY[part.value.slice(0, 3).toLowerCase()] ?? day;
    else if (part.type === "hour") minutes += Number(part.value) * 60;
    else if (part.type === "minute") minutes += Number(part.value);
  }
  return { day, minutes };
}

function windowActiveAt(ms: number, windows: ValidityWindow[]): boolean {
  const { day, minutes } = berlinParts(ms);
  return windows.some(
    (window) =>
      window.days.includes(day) &&
      (window.start <= window.end
        ? minutes >= window.start && minutes < window.end
        : minutes >= window.start || minutes < window.end),
  );
}

function segmentOverlapsWindow(
  day: number,
  from: number,
  to: number,
  window: ValidityWindow,
): boolean {
  if (!window.days.includes(day)) return false;
  if (window.start <= window.end) return from < window.end && to > window.start;
  return to > window.start || from < window.end;
}

// Any overlap between the stay [arrival, departure) and a restriction
// window counts: leaving before the restriction starts is the only safe
// case. The stay is split at Berlin midnights (at most a few segments for
// the 24h max stay) instead of polled per minute, so this costs O(days)
// timezone conversions, not O(minutes).
function restrictionOverlapsStay(
  windows: ValidityWindow[],
  arrivalMs: number,
  durationMinutes: number,
): boolean {
  const departureMs = arrivalMs + durationMinutes * 60 * 1000;
  if (departureMs <= arrivalMs) return windowActiveAt(arrivalMs, windows);
  const offset = berlinOffsetMs(arrivalMs);
  if (berlinOffsetMs(departureMs - 1) !== offset) {
    // A DST transition inside the stay: keep the exact per-minute check.
    for (let t = arrivalMs; t < departureMs; t += 60 * 1000)
      if (windowActiveAt(t, windows)) return true;
    return windowActiveAt(departureMs - 1, windows);
  }
  let cursor = arrivalMs;
  while (cursor < departureMs) {
    const wall = new Date(cursor + offset);
    const minutesIntoDay =
      wall.getUTCHours() * 60 +
      wall.getUTCMinutes() +
      wall.getUTCSeconds() / 60 +
      wall.getUTCMilliseconds() / 60000;
    const segEnd = Math.min(
      departureMs,
      cursor + (24 * 60 - minutesIntoDay) * 60 * 1000,
    );
    const endMinutes = minutesIntoDay + (segEnd - cursor) / 60000;
    if (
      windows.some((window) =>
        segmentOverlapsWindow(
          wall.getUTCDay(),
          minutesIntoDay,
          endMinutes,
          window,
        ),
      )
    )
      return true;
    cursor = segEnd;
  }
  return false;
}

// Charged minutes of the stay [arrival, departure) covered by any window.
// Same segment splitting as restrictionOverlapsStay: O(days) timezone
// conversions, with an exact per-minute fallback across a DST transition.
// Overlapping windows are unioned so shared minutes count once.
export function chargedMinutesInWindows(
  windows: ValidityWindow[],
  arrivalMs: number,
  durationMinutes: number,
): number {
  if (
    !windows.length ||
    !Number.isFinite(arrivalMs) ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0
  )
    return 0;
  const departureMs = arrivalMs + durationMinutes * 60 * 1000;
  if (departureMs <= arrivalMs) return 0;
  const offset = berlinOffsetMs(arrivalMs);
  if (berlinOffsetMs(departureMs - 1) !== offset) {
    let charged = 0;
    for (let t = arrivalMs; t < departureMs; t += 60 * 1000)
      if (windowActiveAt(t, windows)) charged++;
    return charged;
  }
  let charged = 0;
  let cursor = arrivalMs;
  while (cursor < departureMs) {
    const wall = new Date(cursor + offset);
    const minutesIntoDay =
      wall.getUTCHours() * 60 +
      wall.getUTCMinutes() +
      wall.getUTCSeconds() / 60 +
      wall.getUTCMilliseconds() / 60000;
    const segEnd = Math.min(
      departureMs,
      cursor + (24 * 60 - minutesIntoDay) * 60 * 1000,
    );
    const endMinutes = minutesIntoDay + (segEnd - cursor) / 60000;
    const day = wall.getUTCDay();
    const intervals: Array<[number, number]> = [];
    for (const window of windows) {
      if (!window.days.includes(day)) continue;
      if (window.start <= window.end) {
        const start = Math.max(minutesIntoDay, window.start);
        const end = Math.min(endMinutes, window.end);
        if (end > start) intervals.push([start, end]);
      } else {
        const firstEnd = Math.min(endMinutes, 24 * 60);
        if (firstEnd > Math.max(minutesIntoDay, window.start))
          intervals.push([Math.max(minutesIntoDay, window.start), firstEnd]);
        if (Math.min(endMinutes, window.end) > minutesIntoDay)
          intervals.push([minutesIntoDay, Math.min(endMinutes, window.end)]);
      }
    }
    if (intervals.length) {
      intervals.sort((a, b) => a[0] - b[0]);
      let [currentStart, currentEnd] = intervals[0];
      for (let i = 1; i < intervals.length; i++) {
        const [start, end] = intervals[i];
        if (start <= currentEnd) currentEnd = Math.max(currentEnd, end);
        else {
          charged += currentEnd - currentStart;
          currentStart = start;
          currentEnd = end;
        }
      }
      charged += currentEnd - currentStart;
    }
    cursor = segEnd;
  }
  return Math.round(charged);
}

export function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textOf(properties: Record<string, unknown>, key: string): string {
  return cleanText(properties[key]);
}

function classifyByValidity(
  raw: string,
  stay: StayInterval | undefined,
  outcomes: {
    active: ParkingUsability;
    inactive: ParkingUsability;
    noStay: ParkingUsability;
  },
): ParkingUsability {
  const windows = parseValidityWindows(raw);
  if (windows === null) return "unknown";
  if (!stay || windows.length === 0) return outcomes.noStay;
  return restrictionOverlapsStay(windows, stay.arrivalMs, stay.durationMinutes)
    ? outcomes.active
    : outcomes.inactive;
}
// The single source of each layer's rule vocabulary, shared by the classifier
// and the preserved candidate details so the two cannot drift apart. Empty
// means the mapped record states no such rule.
function ruleFields(
  properties: Record<string, unknown>,
  inside: boolean,
): { restriction: string; hours: string; fee: string; maxStay: string } {
  if (inside)
    return {
      restriction:
        `${textOf(properties, "beschraenkung")} ${textOf(properties, "grund_fuer_beschraenkung")}`.trim(),
      hours: textOf(properties, "geltungszeit_der_beschraenkung"),
      fee: textOf(properties, "parkgebuehr"),
      maxStay: textOf(properties, "hoechstparkdauer"),
    };
  return {
    restriction: textOf(properties, "ladezone_einschraenkungen"),
    hours: textOf(properties, "geltungszeit_ladezone"),
    fee: "",
    maxStay: "",
  };
}

function classify(
  category: string,
  publicLand: string,
  properties: Record<string, unknown> = {},
  stay?: StayInterval,
): ParkingUsability {
  const { hours: loadingTime } = ruleFields(properties, false);
  if (category === "Parken (ohne Beschränkungen)") {
    if (publicLand !== "Ja") return "restricted";
    if (!loadingTime) return "usable";
    // A loading-window ban applies only while it overlaps the stay;
    // uninterpretable hours are never treated as permission.
    return classifyByValidity(loadingTime, stay, {
      active: "restricted",
      inactive: "usable",
      noStay: "usable",
    });
  }
  if (
    ["Parken mit zeitlicher Beschränkung", "Beschränkte Parkdauer"].includes(
      category,
    )
  )
    return loadingTime
      ? classifyByValidity(loadingTime, stay, {
          active: "restricted",
          inactive: "conditional",
          noStay: "conditional",
        })
      : "conditional";
  if (category === "Nutzungsgruppe") return "restricted";
  if (["Parkverbot", "Ladezone", "Beschränkungen"].includes(category)) {
    if (!loadingTime) return "restricted";
    return classifyByValidity(loadingTime, stay, {
      active: "restricted",
      inactive: "usable",
      noStay: "restricted",
    });
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
  const {
    restriction,
    hours: validity,
    fee,
    maxStay,
  } = ruleFields(properties, true);
  if (restriction) {
    if (
      /bewohner|anwohner|carsharing|schwerbehindert|taxi|bus|behindert/i.test(
        restriction,
      )
    )
      return "restricted";
    if (validity) {
      const outcome = classifyByValidity(validity, stay, {
        active: "restricted",
        inactive: "usable",
        noStay: "conditional",
      });
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
    // A fee/time rule outside the stay leaves the segment unrestricted;
    // any overlap keeps it conditional.
    return classifyByValidity(validity, stay, {
      active: "conditional",
      inactive: "usable",
      noStay: "conditional",
    });
  }
  return "usable";
}

// Source-backed rule fields for an eligible segment, kept in the layer's own
// vocabulary. Empty means the mapped record states no such rule.
function candidateRules(
  properties: Record<string, unknown>,
  inside: boolean,
): ParkingCandidate["rules"] {
  const { restriction, hours, fee, maxStay } = ruleFields(properties, inside);
  const rules: NonNullable<ParkingCandidate["rules"]> = {
    ...(restriction ? { restriction } : {}),
    ...(hours ? { hours } : {}),
    ...(fee ? { fee } : {}),
    ...(maxStay ? { maxStay } : {}),
  };
  return Object.keys(rules).length ? rules : undefined;
}

// Stable id: the service feature id when present, otherwise a
// geometry-anchored fallback so the same segment keeps the same id across
// searches instead of depending on ordering or the destination point.
function candidateId(
  sourceId: unknown,
  streetName: string,
  geometry: Geometry,
): string {
  if (sourceId !== undefined && sourceId !== null && String(sourceId).trim())
    return String(sourceId);
  const polygon =
    geometry.type === "Polygon"
      ? (geometry.coordinates as Polygon)
      : (geometry.coordinates as Polygon[])[0];
  const [x = 0, y = 0] = polygon?.[0]?.[0] ?? [];
  return `${streetName}@${Math.round(x)},${Math.round(y)}`;
}

// One eligible feature as a located, rule-carrying candidate, or undefined
// when the feature has no geometry to anchor it.
function toCandidate(
  feature: Feature,
  point: Position,
  inside: boolean,
  usability: "usable" | "conditional",
  capacity: number,
): ParkingCandidate | undefined {
  const geometry = feature.geometry;
  if (!geometry) return undefined;
  const properties = feature.properties;
  const streetName = String(properties.strassenname ?? "").trim();
  return {
    id: candidateId(feature.id ?? properties.polygonid, streetName, geometry),
    streetName: streetName || undefined,
    usability,
    sourceCategory: inside
      ? undefined
      : textOf(properties, "category") || undefined,
    mappedSpaces: capacity,
    distanceMeters: Math.round(geometryDistance(point, geometry)),
    geometry,
    rules: candidateRules(properties, inside),
  };
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
    candidates: [],
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

// Payload bound: return the strongest eligible segments without carrying
// every polygon in the radius.
const MAX_CANDIDATES = 25;

function compareCandidates(a: ParkingCandidate, b: ParkingCandidate): number {
  if (a.usability !== b.usability) return a.usability === "usable" ? -1 : 1;
  // A 100 m baseline keeps a tiny segment at the destination from
  // automatically outranking a much larger mapped segment nearby.
  const aScore = a.mappedSpaces / (a.distanceMeters + 100);
  const bScore = b.mappedSpaces / (b.distanceMeters + 100);
  return (
    bScore - aScore ||
    a.distanceMeters - b.distanceMeters ||
    a.id.localeCompare(b.id)
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
    candidates: [],
  };
  const streets = new Map<
    string,
    { mappedSpaces: number; features: number; nearestMeters: number }
  >();
  const candidates: ParkingCandidate[] = [];
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
    // Only mapped usable or conditional capacity can support a suggestion.
    if ((usability !== "usable" && usability !== "conditional") || !capacity)
      continue;
    const candidate = toCandidate(feature, point, inside, usability, capacity);
    if (!candidate) continue;
    candidates.push(candidate);
    const streetName = candidate.streetName;
    if (streetName) {
      const street = streets.get(streetName) ?? {
        mappedSpaces: 0,
        features: 0,
        nearestMeters: candidate.distanceMeters,
      };
      street.mappedSpaces += capacity;
      street.features++;
      street.nearestMeters = Math.min(
        street.nearestMeters,
        candidate.distanceMeters,
      );
      streets.set(streetName, street);
    }
  }
  result.streets = [...streets]
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.mappedSpaces - a.mappedSpaces)
    .slice(0, 8);
  const ranked = candidates.sort(compareCandidates);
  const retained = new Set(suggestedAreas(ranked));
  for (const candidate of ranked) {
    if (retained.size === MAX_CANDIDATES) break;
    retained.add(candidate);
  }
  result.candidates = [...retained].sort(compareCandidates);
  return result;
}

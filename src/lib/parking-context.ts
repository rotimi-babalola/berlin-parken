import {
  geometryDistance,
  toEpsg25833,
  type Geometry,
  type Position,
} from "@/lib/parking";

type Source =
  | { status: "available" | "empty"; fetchedAt: string }
  | { status: "partial"; fetchedAt: string; message: string }
  | { status: "unavailable"; message: string };

type RawFeature = {
  id?: string | number;
  geometry: Geometry;
  properties: Record<string, unknown>;
};
type Collection = {
  type: "FeatureCollection";
  features: RawFeature[];
  totalFeatures?: number;
  timeStamp?: string;
  links?: Array<{ rel: string; href: string }>;
};
export type ContextResult<T> = { source: Source; items: T[] };

export type ParkingZone = {
  id: string;
  zone?: string;
  borough?: string;
  hours?: string;
  fee?: string;
  note?: string;
  distanceMeters: number;
};
export type PlannedEvent = {
  id: string;
  street?: string;
  borough?: string;
  type?: string;
  restriction?: string;
  startsOn?: string;
  endsOn?: string;
  startTime?: string;
  endTime?: string;
  distanceMeters: number;
};
export type ParkingContext = {
  zones: ContextResult<ParkingZone>;
  events: ContextResult<PlannedEvent>;
};

const zoneEndpoint =
  "https://gdi.berlin.de/services/wfs/parkraumbewirtschaftung";
const eventEndpoint = "https://gdi.berlin.de/services/wfs/planb_ereignisse";
const pageSize = 500;
const maxPages = 5;

function validCollection(value: unknown): value is Collection {
  if (!value || typeof value !== "object") return false;
  const collection = value as Collection;
  return (
    collection.type === "FeatureCollection" &&
    Array.isArray(collection.features) &&
    collection.features.every(
      (feature) =>
        feature?.geometry &&
        ["Polygon", "MultiPolygon"].includes(feature.geometry.type) &&
        feature.properties &&
        typeof feature.properties === "object",
    )
  );
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function dateValue(value: unknown): number | undefined {
  if (typeof value !== "string" || !value.trim()) return;
  const normalized = value
    .trim()
    .replace(/^(\d{2})\.(\d{2})\.(\d{4})$/, "$3-$2-$1");
  const timestamp = Date.parse(
    normalized.length === 10 ? `${normalized}T23:59:59` : normalized,
  );
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function createParams(
  layer: string,
  east: number,
  north: number,
  radius: number,
) {
  return new URLSearchParams({
    SERVICE: "WFS",
    VERSION: "2.0.0",
    REQUEST: "GetFeature",
    TYPENAMES: layer,
    COUNT: String(pageSize),
    OUTPUTFORMAT: "application/json",
    BBOX: `${east - radius},${north - radius},${east + radius},${north + radius},EPSG:25833`,
  });
}

async function fetchFeatures(endpoint: string, params: URLSearchParams) {
  let url: URL | null = new URL(`${endpoint}?${params}`);
  const features: RawFeature[] = [];
  let totalFeatures: number | undefined;
  let fetchedAt = new Date().toISOString();
  try {
    for (let page = 0; page < maxPages && url; page++) {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error("Berlin data service returned an error.");
      const raw: unknown = await response.json();
      if (!validCollection(raw))
        throw new Error("Berlin data service returned an invalid response.");
      if (typeof raw.totalFeatures === "number")
        totalFeatures = raw.totalFeatures;
      if (raw.timeStamp) fetchedAt = raw.timeStamp;
      features.push(...raw.features);
      const next = raw.links?.find((link) => link.rel === "next")?.href;
      if (!next) {
        url = null;
        break;
      }
      const nextUrl = new URL(next, endpoint);
      const base = new URL(endpoint);
      if (nextUrl.origin !== base.origin || nextUrl.pathname !== base.pathname)
        throw new Error("Berlin data service returned an invalid page link.");
      url = nextUrl;
    }
  } catch (error) {
    return {
      features,
      fetchedAt,
      failed:
        error instanceof Error
          ? error.message
          : "Berlin data is temporarily unavailable.",
      incomplete: features.length > 0,
    };
  }
  return {
    features,
    fetchedAt,
    incomplete:
      !!url || (totalFeatures !== undefined && features.length < totalFeatures),
  };
}

function unavailable<T>(message: string | undefined): ContextResult<T> {
  return {
    source: {
      status: "unavailable",
      message:
        message ?? "This Berlin data service is temporarily unavailable.",
    },
    items: [],
  };
}

function sourceResult<T>(
  matchedCount: number,
  fetchedAt: string,
  incomplete: boolean,
  message?: string,
): ContextResult<T> {
  return {
    source: incomplete
      ? {
          status: "partial",
          fetchedAt,
          message:
            message ??
            "Some nearby records may be missing because the service page limit was reached.",
        }
      : { status: matchedCount ? "available" : "empty", fetchedAt },
    items: [],
  };
}

export async function getParkingContext(
  longitude: number,
  latitude: number,
  radiusMeters: number,
): Promise<ParkingContext> {
  const [east, north] = toEpsg25833(longitude, latitude);
  const point: Position = [east, north];
  const [zoneFetch, eventFetch] = await Promise.all([
    fetchFeatures(
      zoneEndpoint,
      createParams(
        "parkraumbewirtschaftung:parkzonen",
        east,
        north,
        radiusMeters,
      ),
    ),
    fetchFeatures(
      eventEndpoint,
      createParams("planb_ereignisse:ereignisse", east, north, radiusMeters),
    ),
  ]);

  const zoneItems: ParkingZone[] = zoneFetch.features
    .flatMap((feature, index) => {
      try {
        const distanceMeters = geometryDistance(point, feature.geometry);
        if (distanceMeters > radiusMeters) return [];
        const p = feature.properties;
        return [
          {
            id: String(feature.id ?? p.parkzone ?? `${p.bezirk}-${index}`),
            zone: text(p.parkzone),
            borough: text(p.bezirk),
            hours: text(p.zeiten),
            fee: text(p.gebuehr),
            note: text(p.bemerkung),
            distanceMeters: Math.round(distanceMeters),
          },
        ];
      } catch {
        return [];
      }
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  const now = Date.now();
  const horizon = now + 14 * 24 * 60 * 60 * 1000;
  const eventItems: PlannedEvent[] = eventFetch.features
    .flatMap((feature, index) => {
      try {
        const p = feature.properties;
        const start = dateValue(p.dat_beginn);
        const end = dateValue(p.dat_ende);
        if (
          (start !== undefined && start > horizon) ||
          (end !== undefined && end < now)
        )
          return [];
        const distanceMeters = geometryDistance(point, feature.geometry);
        if (distanceMeters > radiusMeters) return [];
        return [
          {
            id: String(feature.id ?? `${p.strasse}-${p.dat_beginn}-${index}`),
            street: text(p.strasse),
            borough: text(p.bezirk),
            type: text(p.ereignis),
            restriction: text(p.einschr),
            startsOn: text(p.dat_beginn),
            endsOn: text(p.dat_ende),
            startTime: text(p.uhr_beginn),
            endTime: text(p.uhr_ende),
            distanceMeters: Math.round(distanceMeters),
          },
        ];
      } catch {
        return [];
      }
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  const zones = sourceResult<ParkingZone>(
    zoneItems.length,
    zoneFetch.fetchedAt,
    zoneFetch.incomplete ?? false,
    "failed" in zoneFetch ? zoneFetch.failed : undefined,
  );
  const events = sourceResult<PlannedEvent>(
    eventItems.length,
    eventFetch.fetchedAt,
    eventFetch.incomplete ?? false,
    "failed" in eventFetch ? eventFetch.failed : undefined,
  );
  zones.items = zoneItems;
  events.items = eventItems;
  if ("failed" in zoneFetch && !zoneFetch.features.length)
    return { zones: unavailable(zoneFetch.failed), events };
  if ("failed" in eventFetch && !eventFetch.features.length)
    return { zones, events: unavailable(eventFetch.failed) };
  return { zones, events };
}

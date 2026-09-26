import {
  geometryDistance,
  toEpsg25833,
  validGeometry,
  type Geometry,
  type Position,
} from "./parking.ts";
import { fetchWfsFeatures, wfsParams } from "./wfs.ts";

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

export function missingContext(reason?: string): ParkingContext {
  const message =
    reason ?? "This Berlin data service is temporarily unavailable.";
  return {
    zones: {
      source: { status: "unavailable", message },
      items: [],
    },
    events: {
      source: { status: "unavailable", message },
      items: [],
    },
  };
}

export function ensureParkingContext(
  value: Record<string, unknown>,
): ParkingContext {
  const zones =
    value.zones && typeof value.zones === "object"
      ? (value.zones as ParkingContext["zones"])
      : missingContext("Parking-zone data is temporarily unavailable.").zones;
  const events =
    value.events && typeof value.events === "object"
      ? (value.events as ParkingContext["events"])
      : missingContext("Planned-event data is temporarily unavailable.").events;
  return { zones, events };
}

function validCollection(value: unknown): value is Collection {
  if (!value || typeof value !== "object") return false;
  const collection = value as Collection;
  return (
    collection.type === "FeatureCollection" &&
    Array.isArray(collection.features) &&
    collection.features.every(
      (feature) =>
        feature?.geometry &&
        validGeometry(feature.geometry) &&
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

function createSource<T>(
  matchedCount: number,
  fetchedAt: string,
  incomplete: boolean,
  items: T[],
  message?: string,
): ContextResult<T> {
  if (incomplete)
    return {
      source: {
        status: "partial",
        fetchedAt,
        message:
          message ??
          "Some nearby records may be missing because the service page limit was reached.",
      },
      items,
    };
  return {
    source: { status: matchedCount ? "available" : "empty", fetchedAt },
    items,
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
    fetchWfsFeatures<RawFeature>(
      zoneEndpoint,
      wfsParams("parkraumbewirtschaftung:parkzonen", east, north, radiusMeters),
      validCollection,
    ),
    fetchWfsFeatures<RawFeature>(
      eventEndpoint,
      wfsParams("planb_ereignisse:ereignisse", east, north, radiusMeters),
      validCollection,
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
            id: String(
              feature.id ?? `${p.parkzone ?? p.bezirk ?? "zone"}-${index}`,
            ),
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

  const zoneFailed = "failed" in zoneFetch ? zoneFetch.failed : undefined;
  const eventFailed = "failed" in eventFetch ? eventFetch.failed : undefined;
  return {
    zones:
      zoneFailed && !zoneFetch.features.length
        ? missingContext(zoneFailed).zones
        : createSource(
            zoneItems.length,
            zoneFetch.fetchedAt,
            zoneFetch.incomplete,
            zoneItems,
            zoneFailed,
          ),
    events:
      eventFailed && !eventFetch.features.length
        ? missingContext(eventFailed).events
        : createSource(
            eventItems.length,
            eventFetch.fetchedAt,
            eventFetch.incomplete,
            eventItems,
            eventFailed,
          ),
  };
}

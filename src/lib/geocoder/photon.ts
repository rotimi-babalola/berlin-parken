import type { AddressSuggestion, GeocoderProvider } from "./types";

const BERLIN_BOUNDS = "13.0884,52.3383,13.7611,52.6755";
const DEFAULT_ENDPOINT = "https://photon.komoot.io/api/";

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normalizePhotonFeature(value: unknown): AddressSuggestion | null {
  const feature = record(value);
  const properties = record(feature?.properties);
  const geometry = record(feature?.geometry);
  const coordinates = geometry?.coordinates;

  if (
    !properties ||
    geometry?.type !== "Point" ||
    !Array.isArray(coordinates) ||
    typeof coordinates[0] !== "number" ||
    typeof coordinates[1] !== "number" ||
    !Number.isFinite(coordinates[0]) ||
    !Number.isFinite(coordinates[1]) ||
    text(properties.city)?.toLocaleLowerCase() !== "berlin" ||
    text(properties.countrycode)?.toLocaleLowerCase() !== "de"
  ) return null;

  const street = text(properties.street);
  const houseNumber = text(properties.housenumber);
  const label = street && houseNumber
    ? `${street} ${houseNumber}`
    : text(properties.name) ?? street;

  if (!label) return null;

  const detail = [text(properties.postcode), text(properties.district), "Berlin"]
    .filter((part, index, all): part is string => Boolean(part) && all.indexOf(part) === index)
    .join(" · ");
  const osmType = text(properties.osm_type);
  const osmId = properties.osm_id;
  const id = osmType && (typeof osmId === "string" || typeof osmId === "number")
    ? `${osmType}:${osmId}`
    : `${coordinates[0]}:${coordinates[1]}:${label}`;

  return { id, label, detail, longitude: coordinates[0], latitude: coordinates[1] };
}

export function createPhotonProvider(fetcher: typeof fetch = fetch): GeocoderProvider {
  return {
    async suggest(query) {
      const endpoint = process.env.PHOTON_API_URL || DEFAULT_ENDPOINT;
      const url = new URL(endpoint);
      url.searchParams.set("q", query);
      url.searchParams.set("limit", "8");
      url.searchParams.set("lang", "de");
      url.searchParams.set("bbox", BERLIN_BOUNDS);

      const response = await fetcher(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`Photon returned ${response.status}`);

      const payload = record(await response.json());
      if (!payload || !Array.isArray(payload.features)) throw new Error("Photon returned an invalid response");

      const normalized = payload.features
        .map(normalizePhotonFeature)
        .filter((suggestion): suggestion is AddressSuggestion => suggestion !== null);
      const uniqueSuggestions = new Map<string, AddressSuggestion>();
      for (const suggestion of normalized) {
        const key = `${suggestion.label.toLocaleLowerCase()}|${suggestion.detail.toLocaleLowerCase()}`;
        if (!uniqueSuggestions.has(key)) uniqueSuggestions.set(key, suggestion);
      }
      return [...uniqueSuggestions.values()].slice(0, 6);
    },
  };
}

export const WFS_PAGE_SIZE = 500;
export const WFS_MAX_PAGES = 5;
const WFS_TIMEOUT_MS = 8_000;
const WFS_TOTAL_BUDGET_MS = 20_000;

type WfsCollection<T> = {
  features: T[];
  totalFeatures?: number;
  timeStamp?: string;
  links?: Array<{ rel: string; href: string }>;
};

export type WfsFetchResult<T> =
  | { features: T[]; fetchedAt: string; incomplete: boolean }
  | {
      features: T[];
      fetchedAt: string;
      failed: string;
      incomplete: boolean;
    };

export function wfsParams(
  layer: string,
  east: number,
  north: number,
  radius: number,
): URLSearchParams {
  return new URLSearchParams({
    SERVICE: "WFS",
    VERSION: "2.0.0",
    REQUEST: "GetFeature",
    TYPENAMES: layer,
    COUNT: String(WFS_PAGE_SIZE),
    OUTPUTFORMAT: "application/json",
    BBOX: `${east - radius},${north - radius},${east + radius},${north + radius},EPSG:25833`,
  });
}

function nextPageUrl(
  endpoint: string,
  href: string,
  params: URLSearchParams,
): URL {
  const nextUrl = new URL(href, endpoint);
  const base = new URL(endpoint);
  if (nextUrl.origin !== base.origin || nextUrl.pathname !== base.pathname)
    throw new Error("Berlin data service returned an invalid page link.");
  for (const [key, value] of params) {
    const returned = nextUrl.searchParams.get(key);
    if (returned !== null && returned !== value)
      throw new Error("Berlin data service changed the search bounds.");
    nextUrl.searchParams.set(key, value);
  }
  return nextUrl;
}

export async function fetchWfsFeatures<T>(
  endpoint: string,
  params: URLSearchParams,
  isValid: (value: unknown) => value is WfsCollection<T>,
): Promise<WfsFetchResult<T>> {
  let url: URL | null = new URL(`${endpoint}?${params}`);
  const features: T[] = [];
  let totalFeatures: number | undefined;
  let fetchedAt = new Date().toISOString();
  const deadline = Date.now() + WFS_TOTAL_BUDGET_MS;
  try {
    for (let page = 0; page < WFS_MAX_PAGES && url; page++) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0)
        throw new Error("Berlin data service timed out. Please try again.");
      const response = await fetch(url, {
        signal: AbortSignal.timeout(Math.min(WFS_TIMEOUT_MS, remainingMs)),
        cache: "no-store",
      });
      if (!response.ok) {
        if (response.status === 429)
          throw new Error("Berlin data service is busy. Please try again.");
        throw new Error("Berlin data service returned an error.");
      }
      const raw: unknown = await response.json();
      if (!isValid(raw))
        throw new Error("Berlin data service returned an invalid response.");
      if (raw.features.length > WFS_PAGE_SIZE)
        throw new Error("Berlin data service exceeded the page limit.");
      if (typeof raw.totalFeatures === "number")
        totalFeatures = raw.totalFeatures;
      if (raw.timeStamp) fetchedAt = raw.timeStamp;
      features.push(...raw.features);
      const next = raw.links?.find((link) => link.rel === "next")?.href;
      if (!next) {
        url = null;
        break;
      }
      url = nextPageUrl(endpoint, next, params);
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

import type { AddressSuggestion } from "./geocoder/types.ts";

const STORAGE_KEY = "berlin-parken-recent-searches";
const MAX_RECENT = 5;

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // SSR prerendering and private mode: history just doesn't persist.
    return null;
  }
}

// Past destination searches, newest first. localStorage only (v1 has no
// DB); every access is guarded for SSR prerendering and private mode.
export function loadRecentSearches(): AddressSuggestion[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is AddressSuggestion =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as AddressSuggestion).label === "string" &&
          Number.isFinite((item as AddressSuggestion).latitude) &&
          Number.isFinite((item as AddressSuggestion).longitude),
      )
      .slice(0, MAX_RECENT)
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : `recent:${item.label}`,
        label: item.label,
        detail: typeof item.detail === "string" ? item.detail : "",
        latitude: item.latitude,
        longitude: item.longitude,
      }));
  } catch {
    return [];
  }
}

export function recordRecentSearch(suggestion: AddressSuggestion): void {
  const store = storage();
  if (!store) return;
  try {
    const next = [
      suggestion,
      ...loadRecentSearches().filter((item) => item.label !== suggestion.label),
    ].slice(0, MAX_RECENT);
    store.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode: history just doesn't persist.
  }
}

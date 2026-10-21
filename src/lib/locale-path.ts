import type { Locale } from "./dictionaries.ts";

const PREFIX: Record<Locale, string> = { en: "", de: "/de" };

// German pages live under /de; English keeps the existing root URLs.
export function localizedPath(locale: Locale, path = "/"): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${PREFIX[locale]}${clean}` || "/";
}

// Map the current pathname to its other-language equivalent.
export function equivalentPath(pathname: string, locale: Locale): string {
  const path =
    pathname === "/de"
      ? "/"
      : pathname.startsWith("/de/")
        ? pathname.slice(3)
        : pathname;
  return localizedPath(locale, path || "/");
}

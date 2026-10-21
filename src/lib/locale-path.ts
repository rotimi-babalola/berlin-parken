import type { Locale } from "./dictionaries.ts";

const PREFIX: Record<Locale, string> = { en: "", de: "/de" };

// German pages live under /de; English keeps the existing root URLs.
export function localizedPath(locale: Locale, path = "/"): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${PREFIX[locale]}${clean}` || "/";
}

// Map the current pathname to its other-language equivalent.
export function equivalentPath(pathname: string, locale: Locale): string {
  return localizedPath(locale, stripLocale(pathname) || "/");
}

function stripLocale(pathname: string): string {
  return pathname === PREFIX.de || pathname.startsWith(`${PREFIX.de}/`)
    ? pathname.slice(PREFIX.de.length)
    : pathname;
}

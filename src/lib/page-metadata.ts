import type { Metadata } from "next";
import { getAreaCopy, type AreaGuide } from "./areas.ts";
import { translate, type Locale } from "./dictionaries.ts";
import { localizedPath } from "./locale-path.ts";

function languageAlternates(path: string) {
  return {
    en: localizedPath("en", path),
    de: localizedPath("de", path),
    "x-default": localizedPath("en", path),
  };
}

export function homeMetadata(locale: Locale): Metadata {
  return {
    title: translate(locale, "seo.homeTitle"),
    description: translate(locale, "seo.homeDescription"),
    alternates: {
      canonical: localizedPath(locale),
      languages: languageAlternates("/"),
    },
  };
}

export function resultsMetadata(locale: Locale): Metadata {
  return {
    title: translate(locale, "seo.resultsTitle"),
    description: translate(locale, "seo.resultsDescription"),
    alternates: {
      canonical: localizedPath(locale, "/results"),
      languages: languageAlternates("/results"),
    },
  };
}

export function areaMetadata(area: AreaGuide, locale: Locale): Metadata {
  const content = getAreaCopy(area, locale);
  const path = `/parking/${area.slug}`;
  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: {
      canonical: localizedPath(locale, path),
      languages: languageAlternates(path),
    },
    openGraph: {
      type: "website",
      siteName: "Berlin Parken",
      title: content.metaTitle,
      description: content.metaDescription,
      url: localizedPath(locale, path),
    },
  };
}

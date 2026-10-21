import { translate, type I18nKey, type Locale } from "./dictionaries.ts";

type AreaSlug = "mitte" | "kreuzberg" | "charlottenburg";

export type AreaRule = {
  term: string;
  detail: string;
};

export type AreaCopy = {
  name: string;
  short: string;
  eyebrow: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  lede: string;
  supplyTitle: string;
  supplyBody: string;
  rulesTitle: string;
  rules: AreaRule[];
  whereTitle: string;
  whereBody: string;
  caveat: string;
  sourcesTitle: string;
  sources: Array<{ label: string; href: string }>;
  sourceNote: string;
  searchCta: string;
  otherSearch: string;
};

export type AreaSource = {
  labelKey: I18nKey;
  href: string;
};

export type AreaGuide = {
  slug: AreaSlug;
  center: { latitude: number; longitude: number };
  radiusMeters: number;
  sources: AreaSource[];
};

const berlinSources: AreaSource[] = [
  {
    labelKey: "areas.source.streetParking",
    href: "https://daten.berlin.de/datensaetze/parken-im-strassenraum-wfs-2eb40df3",
  },
  {
    labelKey: "areas.source.zones",
    href: "https://daten.berlin.de/datensaetze/parkraumbewirtschaftung-parkzonen-wfs-86a217cc",
  },
  {
    labelKey: "areas.source.events",
    href: "https://daten.berlin.de/datensaetze/planbare-ereignisse-im-offentlichen-strassenland-wfs-2c6359e2",
  },
];

const ruleIds = [
  "managedZones",
  "timeLimits",
  "loadingBans",
  "events",
  "signs",
] as const;

export const AREAS: AreaGuide[] = [
  {
    slug: "mitte",
    center: { latitude: 52.5219, longitude: 13.4132 },
    radiusMeters: 500,
    sources: berlinSources,
  },
  {
    slug: "kreuzberg",
    center: { latitude: 52.499, longitude: 13.418 },
    radiusMeters: 500,
    sources: berlinSources,
  },
  {
    slug: "charlottenburg",
    center: { latitude: 52.5053, longitude: 13.3196 },
    radiusMeters: 500,
    sources: berlinSources,
  },
];

export function getArea(slug: string): AreaGuide | undefined {
  return AREAS.find((area) => area.slug === slug);
}

// Long-form area copy lives in the translation files. This assembles one
// locale's guide so page components never build translation keys themselves.
export function getAreaCopy(area: AreaGuide, locale: Locale): AreaCopy {
  const read = (key: I18nKey) => translate(locale, key);

  return {
    name: read(`areas.${area.slug}.name`),
    short: read(`areas.${area.slug}.short`),
    eyebrow: read("areas.guideEyebrow"),
    metaTitle: read(`areas.${area.slug}.metaTitle`),
    metaDescription: read(`areas.${area.slug}.metaDescription`),
    h1: read(`areas.${area.slug}.h1`),
    lede: read(`areas.${area.slug}.lede`),
    supplyTitle: read("areas.guideSupplyTitle"),
    supplyBody: read(`areas.${area.slug}.supplyBody`),
    rulesTitle: read("areas.guideRulesTitle"),
    rules: ruleIds.map((id) => ({
      term: read(`areas.rule.${id}.term`),
      detail: read(`areas.rule.${id}.detail`),
    })),
    whereTitle: read("areas.guideWhereTitle"),
    whereBody: read(`areas.${area.slug}.whereBody`),
    caveat: read("areas.guideCaveat"),
    sourcesTitle: read("areas.guideSourcesTitle"),
    sources: area.sources.map((source) => ({
      label: read(source.labelKey),
      href: source.href,
    })),
    sourceNote: read("areas.guideSourceNote"),
    searchCta: read(`areas.${area.slug}.searchCta`),
    otherSearch: read("areas.guideOtherSearch"),
  };
}

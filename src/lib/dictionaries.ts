import de from "./dictionaries/de.json" with { type: "json" };
import en from "./dictionaries/en.json" with { type: "json" };

export type Locale = "en" | "de";

type Widen<T> = {
  [K in keyof T]: T[K] extends string ? string : Widen<T[K]>;
};

type Dictionary = Widen<typeof en>;

type LeafPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${LeafPaths<T[K]>}`;
}[keyof T & string];

export type I18nKey = LeafPaths<typeof en>;

export const locales: Locale[] = ["en", "de"];
export const dictionaries: Record<Locale, Dictionary> = { en, de };

export function translate(locale: Locale, key: I18nKey): string {
  const value = key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      dictionaries[locale],
    );
  return typeof value === "string" ? value : key;
}

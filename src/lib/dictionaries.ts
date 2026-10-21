import de from "./dictionaries/de.json" with { type: "json" };
import en from "./dictionaries/en.json" with { type: "json" };

export type Locale = "en" | "de";
export type I18nKey = keyof typeof en;

export const locales: Locale[] = ["en", "de"];
export const dictionaries: Record<Locale, Record<I18nKey, string>> = { en, de };

export function translate(locale: Locale, key: I18nKey): string {
  return dictionaries[locale][key];
}

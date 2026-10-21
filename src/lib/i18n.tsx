"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { translate, type I18nKey, type Locale } from "./dictionaries";

export { locales } from "./dictionaries";
export type { I18nKey, Locale } from "./dictionaries";

const STORAGE_KEY = "berlin-parken-locale";

export function readStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "de" || stored === "en" ? stored : null;
  } catch {
    return null;
  }
}

export function rememberLocale(locale: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Private mode: the URL still carries the language for this visit.
  }
}

function format(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

type I18n = {
  locale: Locale;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18n>({
  locale: "en",
  t: (key, vars) => format(translate("en", key), vars),
});

// The route decides the language, so server HTML and metadata already match
// the URL. Only an explicit switcher click writes the stored preference, so
// the redirect can read it without racing this provider.
export function LocaleProvider({
  children,
  locale = "en",
}: {
  children: ReactNode;
  locale?: Locale;
}) {
  const value = useMemo<I18n>(
    () => ({
      locale,
      t: (key, vars) => format(translate(locale, key), vars),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale(): I18n {
  return useContext(I18nContext);
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import de from "./dictionaries/de.json";
import en from "./dictionaries/en.json";

export type Locale = "en" | "de";
export const locales: Locale[] = ["en", "de"];

export type I18nKey = keyof typeof en;

const dictionaries: Record<Locale, Record<I18nKey, string>> = { en, de };

const STORAGE_KEY = "berlin-parken-locale";

function readStoredLocale(): Locale {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "de" ? "de" : "en";
  } catch {
    return "en";
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
  setLocale: (locale: Locale) => void;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18n>({
  locale: "en",
  setLocale: () => {},
  t: (key, vars) => format(en[key] ?? key, vars),
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  // ponytail: client-first read avoids a language flash for returning users;
  // a stored "de" may warn about hydration text mismatch once, then settles.
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window === "undefined" ? "en" : readStoredLocale(),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Private mode: locale still applies to this session.
    }
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);

  const value = useMemo<I18n>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => format(dictionaries[locale][key] ?? key, vars),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale(): I18n {
  return useContext(I18nContext);
}

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
  // Render "en" on server and first client pass so hydration matches;
  // then pick up a stored locale in an effect (one extra render for
  // returning DE users, no discarded SSR tree).
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- stored-locale pickup after hydration-safe "en" first render.
    setLocaleState(readStoredLocale());
  }, []);

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

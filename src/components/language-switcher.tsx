"use client";

import { locales, useLocale, type Locale } from "@/lib/i18n";
import styles from "../app/page.module.css";

const labels: Record<Locale, string> = { en: "EN", de: "DE" };

// Dumb: EN/DE toggle; state lives in LocaleProvider (see lib/i18n).
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  return (
    <div
      className={styles.localeSwitch}
      role="group"
      aria-label={t("header.languageLabel")}
    >
      {locales.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={locale === option}
          className={
            locale === option ? styles.localeActive : styles.localeButton
          }
          onClick={() => setLocale(option)}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

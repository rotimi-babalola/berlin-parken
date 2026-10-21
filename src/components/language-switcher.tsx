"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { locales, rememberLocale, useLocale, type Locale } from "@/lib/i18n";
import { equivalentPath } from "@/lib/locale-path";
import styles from "../app/page.module.css";

const labels: Record<Locale, string> = { en: "EN", de: "DE" };

// Crawlable language links: each language has its own URL, and the query
// string survives when the visitor switches on a results page.
export function LanguageSwitcher() {
  return (
    <Suspense fallback={<LocaleLinks search="" />}>
      <LanguageLinksWithQuery />
    </Suspense>
  );
}

function LanguageLinksWithQuery() {
  const params = useSearchParams();
  const search = params.toString();
  return <LocaleLinks search={search ? `?${search}` : ""} />;
}

function LocaleLinks({ search }: { search: string }) {
  const { locale, t } = useLocale();
  const pathname = usePathname();
  return (
    <div
      className={styles.localeSwitch}
      role="group"
      aria-label={t("header.languageLabel")}
    >
      {locales.map((option) => (
        <Link
          key={option}
          href={`${equivalentPath(pathname, option)}${search}`}
          aria-current={locale === option ? "page" : undefined}
          className={
            locale === option ? styles.localeActive : styles.localeButton
          }
          onClick={() => rememberLocale(option)}
        >
          {labels[option]}
        </Link>
      ))}
    </div>
  );
}

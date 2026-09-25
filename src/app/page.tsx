"use client";

import { AddressSearch } from "@/components/address-search";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/lib/i18n";
import styles from "./page.module.css";

export default function Home() {
  const { t } = useLocale();
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="Berlin Parken home">
          <span className={styles.brandMark} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>
            berlin<span className={styles.brandLight}>parken</span>
          </span>
        </a>
        <span className={styles.headerNote}>
          <span className={styles.liveDot} /> {t("header.location")}
          <LanguageSwitcher />
        </span>
      </header>

      <div className={styles.content} id="top">
        <section className={styles.intro}>
          <h1>
            {t("intro.titleA")}
            <br />
            {t("intro.titleB")}
          </h1>
          <p className={styles.lede}>{t("intro.lede")}</p>
        </section>

        <AddressSearch />

        <footer className={styles.footer}>
          <span>{t("footer.tagline")}</span>
          <span>{t("footer.notice")}</span>
        </footer>
      </div>
    </main>
  );
}

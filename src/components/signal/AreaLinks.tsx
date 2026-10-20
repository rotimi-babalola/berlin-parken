"use client";

import Link from "next/link";
import { AREAS, getAreaCopy } from "@/lib/areas";
import { useLocale } from "@/lib/i18n";
import styles from "./signal.module.css";

export function AreaLinks() {
  const { locale, t } = useLocale();

  return (
    <section className={styles.areaLinks} aria-labelledby="area-links-title">
      <div className={styles.areaLinksHead}>
        <div>
          <span className={styles.eyebrow}>{t("areas.eyebrow")}</span>
          <h2 id="area-links-title">{t("areas.title")}</h2>
        </div>
        <p>{t("areas.lede")}</p>
      </div>
      <ul className={styles.areaCards}>
        {AREAS.map((area) => {
          const content = getAreaCopy(area, locale);
          return (
            <li key={area.slug}>
              <Link className={styles.areaCard} href={`/parking/${area.slug}`}>
                <strong>{content.name}</strong>
                <span>{content.short}</span>
                <small>{t("areas.open")}</small>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

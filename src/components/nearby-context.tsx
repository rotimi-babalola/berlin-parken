"use client";

import { useLocale } from "@/lib/i18n";
import styles from "./address-search.module.css";

// Dumb: static explainer card for the side rail. No props, no state;
// copy comes from i18n.
export function NearbyContext() {
  const { t } = useLocale();
  const dataSources = [
    t("context.source1"),
    t("context.source2"),
    t("context.source3"),
  ];
  return (
    <div className={styles.context}>
      <div className={styles.contextTop}>
        <h2>{t("context.title")}</h2>
        <p>{t("context.body")}</p>
      </div>
      <div className={styles.sourceList}>
        <span className={styles.sourceHeading}>{t("context.heading")}</span>
        {dataSources.map((source, index) => (
          <div className={styles.sourceRow} key={source}>
            <span className={styles.sourceIndex}>0{index + 1}</span>
            <span>{source}</span>
            <span className={styles.sourceArrow} aria-hidden="true">
              ↗
            </span>
          </div>
        ))}
      </div>
      <p className={styles.contextFoot}>{t("context.foot")}</p>
    </div>
  );
}

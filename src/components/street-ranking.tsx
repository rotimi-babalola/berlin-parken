import { useState } from "react";
import type { ParkingSummary } from "@/lib/parking";
import { useLocale } from "@/lib/i18n";
import styles from "./address-search.module.css";

const ROMAN = ["I.", "II.", "III.", "IV.", "V.", "VI.", "VII.", "VIII."];
const STREETS_PER_PAGE = 3;

// Dumb: ranked street list, best first, paged like the event carousel.
// Candidates exclude restricted/prohibited features (see lib/parking);
// distances are straight-line. Page index is local UI state; it resets
// whenever a new result arrives.
export function StreetRanking({
  streets,
}: {
  streets: ParkingSummary["streets"];
}) {
  const { t, locale } = useLocale();
  const [page, setPage] = useState(0);
  const [prevStreets, setPrevStreets] = useState(streets);
  if (prevStreets !== streets) {
    setPrevStreets(streets);
    setPage(0);
  }
  if (!streets.length)
    return (
      <div className={styles.streetList}>
        <h4>{t("streets.title")}</h4>
        <p>{t("streets.empty")}</p>
      </div>
    );
  const pageCount = Math.max(1, Math.ceil(streets.length / STREETS_PER_PAGE));
  const current = Math.min(page, pageCount - 1);
  const start = current * STREETS_PER_PAGE;
  const visible = streets.slice(start, start + STREETS_PER_PAGE);

  return (
    <div className={styles.streetList}>
      <h4>{t("streets.title")}</h4>
      <ol role="list">
        {visible.map((street, index) => (
          <li key={street.name}>
            <span className={styles.rank} aria-hidden="true">
              {ROMAN[start + index] ?? `${start + index + 1}.`}
            </span>
            <span>
              {street.name}
              <span className={styles.streetMeta}>
                {t("streets.meta", {
                  spaces: street.mappedSpaces.toLocaleString(locale),
                  distance: street.nearestMeters,
                })}
              </span>
            </span>
            <span className={styles.streetCount} aria-hidden="true">
              {street.mappedSpaces.toLocaleString(locale)}
            </span>
          </li>
        ))}
      </ol>
      {pageCount > 1 && (
        <div className={styles.carouselControls}>
          <button
            type="button"
            className={styles.carouselButton}
            disabled={current === 0}
            aria-label={t("streets.prevAria")}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            {t("streets.prev")}
          </button>
          <span role="status" className={styles.carouselStatus}>
            {t("streets.count", {
              from: start + 1,
              to: start + visible.length,
              total: streets.length,
            })}
          </span>
          <button
            type="button"
            className={styles.carouselButton}
            disabled={current === pageCount - 1}
            aria-label={t("streets.nextAria")}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            {t("streets.next")}
          </button>
        </div>
      )}
      <p className={styles.sourceNote}>{t("streets.note")}</p>
    </div>
  );
}

import type { ParkingSummary } from "@/lib/parking";
import { useLocale } from "@/lib/i18n";
import styles from "./address-search.module.css";

const ROMAN = ["I.", "II.", "III."];

// Dumb: ranked street list, best first. Candidates exclude restricted/
// prohibited features (see lib/parking); distances are straight-line.
export function StreetRanking({
  streets,
}: {
  streets: ParkingSummary["streets"];
}) {
  const { t, locale } = useLocale();
  if (!streets.length)
    return (
      <div className={styles.streetList}>
        <h4>{t("streets.title")}</h4>
        <p>{t("streets.empty")}</p>
      </div>
    );
  return (
    <div className={styles.streetList}>
      <h4>{t("streets.title")}</h4>
      <ol role="list">
        {streets.slice(0, 3).map((street, index) => (
          <li key={street.name}>
            <span className={styles.rank} aria-hidden="true">
              {ROMAN[index] ?? `${index + 1}.`}
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
      <p className={styles.sourceNote}>{t("streets.note")}</p>
    </div>
  );
}

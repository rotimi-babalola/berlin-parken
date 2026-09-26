import type { ParkingSummary } from "@/lib/parking";
import type { ParkingContext } from "@/lib/parking-context";
import { useLocale } from "@/lib/i18n";
import type { SearchReady } from "../hooks/use-address-search";
import { AssessmentCard } from "./assessment-card";
import { StreetRanking } from "./street-ranking";
import { SupplyTable } from "./supply-table";
import styles from "./address-search.module.css";

export type ParkingResult = ParkingSummary & ParkingContext;

type Props = {
  search: SearchReady | null;
  parking: (ParkingSummary & Partial<ParkingContext>) | null;
  loading: boolean;
  onRetry: () => void;
};

// Dumb composition: Bescheid supply report (centre rail aria-hidden).
// Stateful data lives in useAddressSearch; this file only renders props.
// Zones/events render in the side rail via ZoneSection/EventSection.
export function ParkingResults({ search, parking, loading, onRetry }: Props) {
  const { t, locale } = useLocale();
  if (!search) return null;
  const radius =
    search.radiusMeters < 1000 ? `${search.radiusMeters} m` : "1 km";

  return (
    <>
      <div className={styles.readyState} role="status" aria-live="polite">
        <span className={styles.readyIcon} aria-hidden="true">
          ✓
        </span>
        <span>
          <strong>{t("results.ready")}</strong>
          <br />
          {search.destination.label} · {t("results.within", { radius })}
        </span>
      </div>
      <section
        className={styles.parkingResult}
        aria-labelledby="parking-result-title"
        aria-live="polite"
      >
        <h3 id="parking-result-title">{t("results.title")}</h3>
        <p className={styles.resultAddress}>
          {search.destination.label} · {t("results.within", { radius })}
        </p>
        {loading ? (
          <div className={styles.loadingState}>
            <p role="status">{t("results.loading")}</p>
            <span className={styles.skeleton} aria-hidden="true" />
            <span className={styles.skeleton} aria-hidden="true" />
            <span className={styles.skeleton} aria-hidden="true" />
          </div>
        ) : parking?.status === "unavailable" ? (
          <div role="status">
            <p>{t("results.unavailablePrefix")}</p>
            <button className={styles.retry} type="button" onClick={onRetry}>
              {t("results.retry")}
            </button>
          </div>
        ) : parking ? (
          <>
            {parking.status === "empty" ? (
              <p>{t("results.empty")}</p>
            ) : (
              <div className={styles.report}>
                <div className={styles.reportMain}>
                  <p className={styles.capacity}>
                    {parking.mappedSpaces.toLocaleString(locale)}{" "}
                    <span>
                      {t("results.capacitySuffix", {
                        count: parking.featureCount,
                      })}
                    </span>
                  </p>
                  <SupplyTable
                    rows={[
                      [t("supply.unrestricted"), parking.usableSpaces],
                      [t("supply.conditional"), parking.conditionalSpaces],
                      [t("supply.restricted"), parking.restrictedSpaces],
                      [t("supply.unknown"), parking.unknownSpaces],
                    ]}
                  />
                  <StreetRanking streets={parking.streets} />
                </div>
                <div className={styles.rail} aria-hidden="true" />
                <div className={styles.reportSide}>
                  <AssessmentCard
                    mappedSpaces={parking.mappedSpaces}
                    usable={parking.usableSpaces}
                    conditional={parking.conditionalSpaces}
                    restricted={parking.restrictedSpaces}
                  />
                </div>
              </div>
            )}
            {parking.status === "partial" && (
              <p role="status">
                {t("results.partialPrefix")} {parking.message}
              </p>
            )}
            <p className={styles.sourceNote}>
              {t("results.sourceNote")}{" "}
              <a
                href="https://daten.berlin.de/datensaetze/parken-im-strassenraum-wfs-2eb40df3"
                target="_blank"
                rel="noreferrer"
              >
                Berlin Open Data
              </a>
              {parking.fetchedAt
                ? ` ${t("results.retrieved", {
                    date: new Date(parking.fetchedAt).toLocaleString(locale),
                  })}`
                : ""}
            </p>
          </>
        ) : null}
      </section>
    </>
  );
}

import type { ParkingSummary } from "@/lib/parking";
import type { ParkingContext } from "@/lib/parking-context";
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
};

// Dumb composition: Bescheid supply report (centre rail aria-hidden).
// Stateful data lives in useAddressSearch; this file only renders props.
// Zones/events render in the side rail via ZoneSection/EventSection.
export function ParkingResults({ search, parking, loading }: Props) {
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
          <strong>Search area set</strong>
          <br />
          {search.destination.label} · within {radius}
        </span>
      </div>
      <section
        className={styles.parkingResult}
        aria-labelledby="parking-result-title"
        aria-live="polite"
      >
        <h3 id="parking-result-title">Mapped street parking</h3>
        <p className={styles.resultAddress}>
          {search.destination.label} · within {radius}
        </p>
        {loading ? (
          <div className={styles.loadingState}>
            <p role="status">Loading nearby parking data…</p>
            <span className={styles.skeleton} aria-hidden="true" />
            <span className={styles.skeleton} aria-hidden="true" />
            <span className={styles.skeleton} aria-hidden="true" />
          </div>
        ) : parking?.status === "unavailable" ? (
          <p role="status">Parking data is unavailable. {parking.message}</p>
        ) : parking ? (
          <>
            {parking.status === "empty" ? (
              <p>No mapped parking areas were returned for this radius.</p>
            ) : (
              <div className={styles.report}>
                <div className={styles.reportMain}>
                  <p className={styles.capacity}>
                    {parking.mappedSpaces.toLocaleString()}{" "}
                    <span>
                      mapped spaces across {parking.featureCount} nearby areas
                    </span>
                  </p>
                  <SupplyTable
                    rows={[
                      ["Unrestricted", parking.usableSpaces],
                      ["Conditional", parking.conditionalSpaces],
                      ["Restricted", parking.restrictedSpaces],
                      ["Unknown category", parking.unknownSpaces],
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
              <p role="status">Partial results: {parking.message}</p>
            )}
            <p className={styles.sourceNote}>
              Mapped capacity and restrictions from{" "}
              <a
                href="https://daten.berlin.de/datensaetze/parken-im-strassenraum-wfs-2eb40df3"
                target="_blank"
                rel="noreferrer"
              >
                Berlin Open Data
              </a>
              . This inventory is not live availability.
              {parking.fetchedAt
                ? ` Retrieved ${new Date(parking.fetchedAt).toLocaleString()}.`
                : ""}
            </p>
          </>
        ) : null}
      </section>
    </>
  );
}

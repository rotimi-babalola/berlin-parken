import type { ParkingSummary } from "@/lib/parking";
import type { SearchReady } from "./use-address-search";
import styles from "./address-search.module.css";

type Props = {
  search: SearchReady | null;
  parking: ParkingSummary | null;
  loading: boolean;
};

export function ParkingResults({ search, parking, loading }: Props) {
  if (!search) return null;
  const radius = search.radiusMeters < 1000 ? `${search.radiusMeters} m` : "1 km";

  return (
    <>
      <div className={styles.readyState} role="status" aria-live="polite">
        <span className={styles.readyIcon} aria-hidden="true">✓</span>
        <span><strong>Search area set</strong><br />{search.destination.label} · within {radius}</span>
      </div>
      <section className={styles.parkingResult} aria-labelledby="parking-result-title" aria-live="polite">
        <h3 id="parking-result-title">Mapped street parking</h3>
        <p className={styles.resultAddress}>{search.destination.label} · within {radius}</p>
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
            {parking.status === "empty" ? <p>No mapped parking areas were returned for this radius.</p> : (
              <>
                <p className={styles.capacity}>{parking.mappedSpaces.toLocaleString()} <span>mapped spaces across {parking.featureCount} nearby areas</span></p>
                <dl className={styles.supplyBreakdown}>
                  <div><dt>Unrestricted</dt><dd>{parking.usableSpaces.toLocaleString()}</dd></div>
                  <div><dt>Conditional</dt><dd>{parking.conditionalSpaces.toLocaleString()}</dd></div>
                  <div><dt>Restricted</dt><dd>{parking.restrictedSpaces.toLocaleString()}</dd></div>
                  <div><dt>Unknown category</dt><dd>{parking.unknownSpaces.toLocaleString()}</dd></div>
                </dl>
                {parking.streets.length > 0 && <div className={styles.streetList}><strong>Nearby streets</strong>{parking.streets.map((street) => <p key={street.name}>{street.name}<span>{street.mappedSpaces.toLocaleString()} mapped</span></p>)}</div>}
              </>
            )}
            {parking.status === "partial" && <p role="status">Partial results: {parking.message}</p>}
            <p className={styles.sourceNote}>
              Mapped capacity and restrictions from <a href="https://daten.berlin.de/datensaetze/parken-im-strassenraum-wfs-2eb40df3" target="_blank" rel="noreferrer">Berlin Open Data</a>. This inventory is not live availability.
              {parking.fetchedAt ? ` Retrieved ${new Date(parking.fetchedAt).toLocaleString()}.` : ""}
            </p>
          </>
        ) : null}
      </section>
    </>
  );
}

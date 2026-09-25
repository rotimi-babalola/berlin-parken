import type { ParkingSummary } from "@/lib/parking";
import {
  ensureParkingContext,
  type ParkingContext,
} from "@/lib/parking-context";
import type { SearchReady } from "./use-address-search";
import styles from "./address-search.module.css";

export type ParkingResult = ParkingSummary & ParkingContext;

type Props = {
  search: SearchReady | null;
  parking: (ParkingSummary & Partial<ParkingContext>) | null;
  loading: boolean;
};

export function ParkingResults({ search, parking, loading }: Props) {
  if (!search) return null;
  const radius =
    search.radiusMeters < 1000 ? `${search.radiusMeters} m` : "1 km";
  const { zones, events } = ensureParkingContext(
    (parking ?? {}) as Record<string, unknown>,
  );

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
              <>
                <p className={styles.capacity}>
                  {parking.mappedSpaces.toLocaleString()}{" "}
                  <span>
                    mapped spaces across {parking.featureCount} nearby areas
                  </span>
                </p>
                <dl className={styles.supplyBreakdown}>
                  <div>
                    <dt>Unrestricted</dt>
                    <dd>{parking.usableSpaces.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Conditional</dt>
                    <dd>{parking.conditionalSpaces.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Restricted</dt>
                    <dd>{parking.restrictedSpaces.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Unknown category</dt>
                    <dd>{parking.unknownSpaces.toLocaleString()}</dd>
                  </div>
                </dl>
                {parking.streets.length > 0 && (
                  <div className={styles.streetList}>
                    <strong>Nearby streets</strong>
                    {parking.streets.map((street) => (
                      <p key={street.name}>
                        {street.name}
                        <span>
                          {street.mappedSpaces.toLocaleString()} mapped
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </>
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
      {!loading && parking && (
        <>
          <section
            className={styles.parkingResult}
            aria-labelledby="zones-title"
          >
            <h3 id="zones-title">Parking management zones</h3>
            {zones.source.status === "unavailable" ? (
              <p role="status">
                Zone data is unavailable. {zones.source.message}
              </p>
            ) : zones.items.length ? (
              <ul>
                {zones.items.map((zone) => (
                  <li key={zone.id}>
                    <strong>
                      {zone.zone ? `Zone ${zone.zone}` : "Managed parking zone"}
                    </strong>
                    {zone.borough ? ` · ${zone.borough}` : ""} ·{" "}
                    {zone.distanceMeters} m away
                    {zone.hours ? <div>Hours: {zone.hours}</div> : null}
                    {zone.fee ? <div>Fee: {zone.fee}</div> : null}
                    {zone.note ? <div>{zone.note}</div> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No managed parking zone intersects this search area.</p>
            )}
            {zones.source.status === "partial" && (
              <p role="status">Partial zone results: {zones.source.message}</p>
            )}
            <p className={styles.sourceNote}>
              Zone details are guidance; fees and hours can vary locally. Follow
              signs on site.{" "}
              <a
                href="https://daten.berlin.de/datensaetze/parkraumbewirtschaftung-parkzonen-wfs-86a217cc"
                target="_blank"
                rel="noreferrer"
              >
                Berlin Open Data zone source
              </a>
              {zones.source.status !== "unavailable"
                ? ` · Retrieved ${new Date(zones.source.fetchedAt).toLocaleString()}.`
                : ""}
            </p>
          </section>
          <section
            className={styles.parkingResult}
            aria-labelledby="events-title"
          >
            <h3 id="events-title">Planned street events</h3>
            {events.source.status === "unavailable" ? (
              <p role="status">
                Event data is unavailable. {events.source.message}
              </p>
            ) : events.items.length ? (
              <ul>
                {events.items.map((event) => (
                  <li key={event.id}>
                    <strong>{event.type ?? "Planned event"}</strong>
                    {event.street ? ` · ${event.street}` : ""}
                    {event.borough ? `, ${event.borough}` : ""} ·{" "}
                    {event.distanceMeters} m away
                    {event.startsOn || event.endsOn ? (
                      <div>
                        {event.startsOn ?? "Date unknown"}
                        {event.endsOn ? ` – ${event.endsOn}` : ""}
                        {event.startTime ? ` · ${event.startTime}` : ""}
                        {event.endTime ? `–${event.endTime}` : ""}
                      </div>
                    ) : null}
                    {event.restriction ? <div>{event.restriction}</div> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No matching approved or ongoing events were returned.</p>
            )}
            {events.source.status === "partial" && (
              <p role="status">
                Partial event results: {events.source.message}
              </p>
            )}
            <p className={styles.sourceNote}>
              This feed covers approved and ongoing events starting within the
              next 14 days; it may not include every disruption. An empty list
              does not confirm that streets are clear.{" "}
              <a
                href="https://daten.berlin.de/datensaetze/planbare-ereignisse-im-offentlichen-strassenland-wfs-2c6359e2"
                target="_blank"
                rel="noreferrer"
              >
                Berlin Open Data event source
              </a>
              {events.source.status !== "unavailable"
                ? ` · Retrieved ${new Date(events.source.fetchedAt).toLocaleString()}.`
                : ""}
            </p>
          </section>
        </>
      )}
    </>
  );
}

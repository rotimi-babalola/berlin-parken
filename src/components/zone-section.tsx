import { type ContextResult, type ParkingZone } from "@/lib/parking-context";
import styles from "./address-search.module.css";

// Dumb: managed-zone guidance.
export function ZoneSection({ zones }: { zones: ContextResult<ParkingZone> }) {
  return (
    <section className={styles.parkingResult} aria-labelledby="zones-title">
      <h3 id="zones-title">Parking management zones</h3>
      {zones.source.status === "unavailable" ? (
        <p role="status">Zone data is unavailable. {zones.source.message}</p>
      ) : zones.items.length ? (
        <ul className={styles.plainList}>
          {zones.items.map((zone) => (
            <li key={zone.id}>
              <strong>
                {zone.zone ? `Zone ${zone.zone}` : "Managed parking zone"}
              </strong>
              {zone.borough ? ` · ${zone.borough}` : ""} · {zone.distanceMeters}{" "}
              m away
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
        Zone details are guidance; fees and hours can vary locally. Follow signs
        on site.{" "}
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
  );
}

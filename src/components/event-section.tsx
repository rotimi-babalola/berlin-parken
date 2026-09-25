import { type ContextResult, type PlannedEvent } from "@/lib/parking-context";
import styles from "./address-search.module.css";
import { EventCarousel } from "./event-carousel";

// Dumb: 14-day planned events.
export function EventSection({
  events,
}: {
  events: ContextResult<PlannedEvent>;
}) {
  return (
    <section className={styles.parkingResult} aria-labelledby="events-title">
      <h3 id="events-title">Planned street events</h3>
      {events.source.status === "unavailable" ? (
        <p role="status">Event data is unavailable. {events.source.message}</p>
      ) : events.items.length ? (
        <EventCarousel items={events.items} />
      ) : (
        <p>No matching approved or ongoing events were returned.</p>
      )}
      {events.source.status === "partial" && (
        <p role="status">Partial event results: {events.source.message}</p>
      )}
      <p className={styles.sourceNote}>
        This feed covers approved and ongoing events starting within the next 14
        days; it may not include every disruption. An empty list does not
        confirm that streets are clear.{" "}
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
  );
}

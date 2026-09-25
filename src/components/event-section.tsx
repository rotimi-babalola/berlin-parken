import { type ContextResult, type PlannedEvent } from "@/lib/parking-context";
import { useLocale } from "@/lib/i18n";
import styles from "./address-search.module.css";
import { EventCarousel } from "./event-carousel";

// Dumb: 14-day planned events.
export function EventSection({
  events,
}: {
  events: ContextResult<PlannedEvent>;
}) {
  const { t } = useLocale();
  return (
    <section className={styles.parkingResult} aria-labelledby="events-title">
      <h3 id="events-title">{t("events.title")}</h3>
      {events.source.status === "unavailable" ? (
        <p role="status">
          {t("events.unavailablePrefix")} {events.source.message}
        </p>
      ) : events.items.length ? (
        <EventCarousel items={events.items} />
      ) : (
        <p>{t("events.empty")}</p>
      )}
      {events.source.status === "partial" && (
        <p role="status">
          {t("events.partialPrefix")} {events.source.message}
        </p>
      )}
      <p className={styles.sourceNote}>
        {t("events.sourceNote")}{" "}
        <a
          href="https://daten.berlin.de/datensaetze/planbare-ereignisse-im-offentlichen-strassenland-wfs-2c6359e2"
          target="_blank"
          rel="noreferrer"
        >
          {t("events.sourceLink")}
        </a>
        {events.source.status !== "unavailable"
          ? ` · ${t("results.retrieved", {
              date: new Date(events.source.fetchedAt).toLocaleString(),
            })}`
          : ""}
      </p>
    </section>
  );
}

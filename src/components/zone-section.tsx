import { type ContextResult, type ParkingZone } from "@/lib/parking-context";
import { useLocale } from "@/lib/i18n";
import styles from "./address-search.module.css";

// Dumb: managed-zone guidance.
export function ZoneSection({ zones }: { zones: ContextResult<ParkingZone> }) {
  const { t, locale } = useLocale();
  return (
    <section className={styles.parkingResult} aria-labelledby="zones-title">
      <h3 id="zones-title">{t("zones.title")}</h3>
      {zones.source.status === "unavailable" ? (
        <p role="status">
          {t("zones.unavailablePrefix")} {zones.source.message}
        </p>
      ) : zones.items.length ? (
        <ul className={styles.plainList}>
          {zones.items.map((zone) => (
            <li key={zone.id}>
              <strong>
                {zone.zone
                  ? t("zones.zonePrefix", { zone: zone.zone })
                  : t("zones.defaultName")}
              </strong>
              {zone.borough ? ` · ${zone.borough}` : ""}
              {t("zones.away", { distance: zone.distanceMeters })}
              {zone.hours ? (
                <div>{t("zones.hours", { hours: zone.hours })}</div>
              ) : null}
              {zone.fee ? <div>{t("zones.fee", { fee: zone.fee })}</div> : null}
              {zone.note ? <div>{zone.note}</div> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>{t("zones.empty")}</p>
      )}
      {zones.source.status === "partial" && (
        <p role="status">
          {t("zones.partialPrefix")} {zones.source.message}
        </p>
      )}
      <p className={styles.sourceNote}>
        {t("zones.sourceNote")}{" "}
        <a
          href="https://daten.berlin.de/datensaetze/parkraumbewirtschaftung-parkzonen-wfs-86a217cc"
          target="_blank"
          rel="noreferrer"
        >
          {t("zones.sourceLink")}
        </a>
        {zones.source.status !== "unavailable"
          ? ` · ${t("results.retrieved", {
              date: new Date(zones.source.fetchedAt).toLocaleString(locale),
            })}`
          : ""}
      </p>
    </section>
  );
}

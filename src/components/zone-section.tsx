import { type ContextResult, type ParkingZone } from "@/lib/parking-context";
import { useLocale } from "@/lib/i18n";
import { formatDuration } from "@/lib/search-time";
import { estimateZoneCost, formatEur } from "@/lib/zone-cost";
import styles from "./address-search.module.css";

type Stay = { arrivalMs: number; durationMinutes: number };

// Dumb: managed-zone guidance with a per-zone stay-cost explanation.
export function ZoneSection({
  zones,
  stay,
}: {
  zones: ContextResult<ParkingZone>;
  stay?: Stay | null;
}) {
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
              {stay ? <ZoneCostLine zone={zone} stay={stay} /> : null}
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

function ZoneCostLine({ zone, stay }: { zone: ParkingZone; stay: Stay }) {
  const { t, locale } = useLocale();
  const result = estimateZoneCost(zone, stay);
  if (result.kind === "estimate") {
    const rate = `${formatEur(result.rateEur, locale)} / ${formatDuration(result.perMinutes, locale)}`;
    return (
      <div className={styles.zoneCost} aria-live="polite">
        <span className={styles.zoneCostTitle}>{t("zones.costTitle")}</span>
        <span>
          {t("zones.costEstimate", {
            total: formatEur(result.totalEur, locale),
            charged: formatDuration(result.chargedMinutes, locale),
            stay: formatDuration(result.totalMinutes, locale),
            rate,
          })}
        </span>
        <small>{t("zones.costSource")}</small>
      </div>
    );
  }
  if (result.kind === "free") {
    return (
      <div className={styles.zoneCost} aria-live="polite">
        <span className={styles.zoneCostTitle}>{t("zones.costTitle")}</span>
        <span>
          {zone.hours
            ? t("zones.costFree", { hours: zone.hours })
            : t("zones.costGuidance", {
                reason: t("zones.costReasonMissing"),
              })}
        </span>
        <small>{t("zones.costSource")}</small>
      </div>
    );
  }
  const reason = t("zones.costReasonMissing");
  return (
    <div className={styles.zoneCost} aria-live="polite">
      <span className={styles.zoneCostTitle}>{t("zones.costTitle")}</span>
      <span>{t("zones.costGuidance", { reason })}</span>
      <small>{t("zones.costSource")}</small>
    </div>
  );
}

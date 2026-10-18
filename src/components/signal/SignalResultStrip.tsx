import type { SearchReady } from "@/hooks/use-address-search";
import { candidateMapUrl } from "@/lib/candidate-map";
import { suggestedAreas, type ParkingSummary } from "@/lib/parking";
import type { ParkingContext } from "@/lib/parking-context";
import { useLocale } from "@/lib/i18n";
import { formatVisit } from "@/lib/search-time";
import { LocationMap } from "./LocationMap";
import styles from "./signal.module.css";

type Props = {
  search: SearchReady | null;
  parking: (ParkingSummary & Partial<ParkingContext>) | null;
  loading: boolean;
  zones: ParkingContext["zones"];
  events: ParkingContext["events"];
  onRetry: () => void;
};

function formatRadius(meters: number): string {
  return meters < 1000 ? `${meters} m` : "1 km";
}

// Dumb: glanceable result strip (metric + map + checklist).
// All data comes from props; fetching lives on the results page.
export function SignalResultStrip({
  search,
  parking,
  loading,
  zones,
  events,
  onRetry,
}: Props) {
  const { t, locale } = useLocale();

  if (!search) {
    return (
      <section className={styles.results} aria-live="polite">
        <p className={styles.emptyResult}>{t("signal.empty")}</p>
      </section>
    );
  }

  const radius = formatRadius(search.radiusMeters);

  if (loading) {
    return (
      <section className={styles.results} aria-live="polite">
        <div className={styles.loadingNote}>
          <p role="status">{t("results.loading")}</p>
          <span className={styles.skeleton} aria-hidden="true" />
          <span className={styles.skeleton} aria-hidden="true" />
        </div>
      </section>
    );
  }

  if (parking?.status === "unavailable") {
    return (
      <section className={styles.results} aria-live="polite">
        <div className={styles.loadingNote}>
          <p role="status">{t("results.unavailablePrefix")}</p>
          <button className={styles.retry} type="button" onClick={onRetry}>
            {t("results.retry")}
          </button>
        </div>
      </section>
    );
  }

  if (!parking) return null;

  if (parking.status === "empty") {
    return (
      <section className={styles.results} aria-live="polite">
        <p className={styles.emptyResult} role="status">
          {t("results.empty")}
        </p>
      </section>
    );
  }

  const areas = suggestedAreas(parking.candidates);
  const zone = zones.items[0];
  const event = events.items[0];
  const zoneLabel = zone
    ? `${zone.zone ? t("zones.zonePrefix", { zone: zone.zone }) : t("zones.defaultName")}${zone.borough ? ` · ${zone.borough}` : ""}`
    : t("signal.noZone");

  return (
    <section className={styles.results} aria-live="polite">
      <div className={styles.metric}>
        <span>{t("signal.metricEyebrow", { radius })}</span>
        <strong>{parking.mappedSpaces.toLocaleString(locale)}</strong>
        <p>
          {t("signal.metricCaption", {
            destination: search.destination.label,
          })}
        </p>
        <p>
          {formatVisit(t, search.arrivalMs, search.durationMinutes, locale)}
        </p>
        <small>{t("signal.metricNote")}</small>
        {parking.status === "partial" && (
          <small role="status">{t("results.partialNotice")}</small>
        )}
      </div>
      <div className={styles.mapCell}>
        <LocationMap
          longitude={search.destination.longitude}
          latitude={search.destination.latitude}
          radiusMeters={search.radiusMeters}
          destination={search.destination.label}
          areas={areas}
        />
      </div>
      <div className={styles.checklist}>
        <span>{t("signal.checklistTitle")}</span>
        {areas.map((area, index) => (
          <div key={area.id}>
            <b>{index === 0 ? "01" : "02"}</b>
            <strong>
              {t(index === 0 ? "signal.firstArea" : "signal.backupArea")}:{" "}
              {area.streetName}
            </strong>
            <small>
              {t("signal.areaFactors", {
                suitability: t(
                  area.usability === "usable"
                    ? "signal.unrestricted"
                    : "signal.conditional",
                ),
                spaces: area.mappedSpaces.toLocaleString(locale),
                distance: area.distanceMeters,
              })}
            </small>
            <a
              className={styles.areaLink}
              href={candidateMapUrl(
                area,
                search.destination.longitude,
                search.destination.latitude,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("signal.showAreaOnMap")}
            </a>
          </div>
        ))}
        {!areas.length && (
          <div>
            <b>01</b>
            <strong>{t("signal.firstArea")}</strong>
            <small>
              {t(
                parking.candidates.length
                  ? "signal.unnamedArea"
                  : parking.status === "partial"
                    ? "signal.noAreaPartial"
                    : "signal.noArea",
              )}
            </small>
          </div>
        )}
        <div>
          <b>{areas.length === 2 ? "03" : "02"}</b>
          <strong>{t("signal.checkZone")}</strong>
          <small>{zoneLabel}</small>
        </div>
        <div>
          <b>{areas.length === 2 ? "04" : "03"}</b>
          <strong>{t("signal.checkEvent")}</strong>
          <small>
            {event
              ? `${event.type ?? t("events.defaultType")}${event.street ? ` · ${event.street}` : ""}`
              : t("signal.noEvent")}
          </small>
        </div>
        <small>{t("signal.rankingNote")}</small>
        <a className={styles.detailsJump} href="#explore-title">
          {t("signal.detailsLink")}
        </a>
      </div>
    </section>
  );
}

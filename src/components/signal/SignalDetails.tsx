import type { SearchReady } from "@/hooks/use-address-search";
import type { ParkingSummary } from "@/lib/parking";
import type { ParkingContext } from "@/lib/parking-context";
import { useLocale } from "@/lib/i18n";
import { AssessmentCard } from "@/components/assessment-card";
import { EventSection } from "@/components/event-section";
import { StreetRanking } from "@/components/street-ranking";
import { SupplyTable } from "@/components/supply-table";
import { ZoneSection } from "@/components/zone-section";
import styles from "./signal.module.css";

type Props = {
  search: SearchReady;
  parking: ParkingSummary;
  zones: ParkingContext["zones"];
  events: ParkingContext["events"];
};

function formatRadius(meters: number): string {
  return meters < 1000 ? `${meters} m` : "1 km";
}

// Dumb: full-picture <details> sections. Content renders the shared
// presentational components; data arrives via props.
export function SignalDetails({ search, parking, zones, events }: Props) {
  const { t } = useLocale();
  const radius = formatRadius(search.radiusMeters);

  return (
    <section className={styles.explore} aria-labelledby="explore-title">
      <div className={styles.detailHeading}>
        <div>
          <span className={styles.eyebrow}>{t("signal.detailEyebrow")}</span>
          <h2 id="explore-title">{t("signal.detailTitle")}</h2>
        </div>
        <p>
          {search.destination.label} · {t("results.within", { radius })}
        </p>
      </div>
      <div className={styles.detailGrid}>
        <details>
          <summary>
            <span>
              <small>{t("signal.streetEyebrow")}</small>
              <strong>{t("signal.streetDetail")}</strong>
            </span>
            <span className={styles.detailCount}>
              {t("signal.streetsCount", {
                count: parking.streets.length,
              })}{" "}
              <b aria-hidden="true">＋</b>
            </span>
          </summary>
          <div className={styles.detailBody}>
            <SupplyTable
              rows={[
                [t("supply.unrestricted"), parking.usableSpaces],
                [t("supply.conditional"), parking.conditionalSpaces],
                [t("supply.restricted"), parking.restrictedSpaces],
                [t("supply.unknown"), parking.unknownSpaces],
              ]}
            />
            <StreetRanking streets={parking.streets} />
            <AssessmentCard
              mappedSpaces={parking.mappedSpaces}
              usable={parking.usableSpaces}
              conditional={parking.conditionalSpaces}
              restricted={parking.restrictedSpaces}
            />
            <p className={styles.detailCaveat}>{t("streets.note")}</p>
          </div>
        </details>
        <details>
          <summary>
            <span>
              <small>{t("signal.zoneEyebrow")}</small>
              <strong>{t("signal.zoneDetail")}</strong>
            </span>
            <span className={styles.detailCount}>
              {t("signal.zonesCount", { count: zones.items.length })}{" "}
              <b aria-hidden="true">＋</b>
            </span>
          </summary>
          <div className={styles.detailBody}>
            <ZoneSection zones={zones} />
          </div>
        </details>
        <details>
          <summary>
            <span>
              <small>{t("signal.eventEyebrow")}</small>
              <strong>{t("signal.eventDetail")}</strong>
            </span>
            <span className={styles.detailCount}>
              {t("signal.eventsCount", { count: events.items.length })}{" "}
              <b aria-hidden="true">＋</b>
            </span>
          </summary>
          <div className={styles.detailBody}>
            <EventSection events={events} />
          </div>
        </details>
      </div>
      <p className={styles.detailSource}>{t("results.sourceNote")}</p>
    </section>
  );
}

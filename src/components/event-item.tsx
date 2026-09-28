import type { PlannedEvent } from "@/lib/parking-context";
import { useLocale } from "@/lib/i18n";

// Dumb: one planned-event row. Date/time and restriction render only
// when the source record carries them.
export function EventItem({ event }: { event: PlannedEvent }) {
  const { t } = useLocale();
  return (
    <li>
      <strong>{event.type ?? t("events.defaultType")}</strong>
      {event.street ? ` · ${event.street}` : ""}
      {event.borough ? `, ${event.borough}` : ""}
      {t("events.away", { distance: event.distanceMeters })}
      {event.startsOn || event.endsOn ? (
        <div>
          {event.startsOn ?? t("events.dateUnknown")}
          {event.endsOn ? ` – ${event.endsOn}` : ""}
          {event.startTime ? ` · ${event.startTime}` : ""}
          {event.endTime ? `–${event.endTime}` : ""}
        </div>
      ) : null}
      {event.restriction ? <div>{event.restriction}</div> : null}
    </li>
  );
}

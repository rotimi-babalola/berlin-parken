import type { ParkingSummary } from "@/lib/parking";
import styles from "./address-search.module.css";

const ROMAN = ["I.", "II.", "III."];

// Dumb: ranked street list, best first. Candidates exclude restricted/
// prohibited features (see lib/parking); distances are straight-line.
export function StreetRanking({
  streets,
}: {
  streets: ParkingSummary["streets"];
}) {
  if (!streets.length)
    return (
      <div className={styles.streetList}>
        <strong>Nearby streets</strong>
        <p>
          No eligible street candidates in this radius — nearby areas are all
          restricted or unmapped.
        </p>
      </div>
    );
  return (
    <div className={styles.streetList}>
      <strong>Nearby streets</strong>
      {streets.slice(0, 3).map((street, index) => (
        <p key={street.name}>
          <span className={styles.rank} aria-hidden="true">
            {ROMAN[index] ?? `${index + 1}.`}
          </span>
          <span>
            {street.name}
            <span className={styles.streetMeta}>
              {" "}
              · {street.mappedSpaces.toLocaleString()} mapped ·{" "}
              {street.nearestMeters} m away (straight line)
            </span>
          </span>
          <span className={styles.streetCount}>
            {street.mappedSpaces.toLocaleString()}
          </span>
        </p>
      ))}
      <p className={styles.sourceNote}>
        Best and backup areas are distinct nearby streets, excluding
        restricted/prohibited areas.
      </p>
    </div>
  );
}

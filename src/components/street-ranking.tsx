import type { ParkingSummary } from "@/lib/parking";
import styles from "./address-search.module.css";

const ROMAN = ["I.", "II.", "III."];

// Dumb: ranked street list, best first.
export function StreetRanking({
  streets,
}: {
  streets: ParkingSummary["streets"];
}) {
  if (!streets.length) return null;
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
              · {street.mappedSpaces.toLocaleString()} mapped
            </span>
          </span>
          <span className={styles.streetCount}>
            {street.mappedSpaces.toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  );
}

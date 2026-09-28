import styles from "./signal.module.css";

// Dumb: decorative stylized street map. Purely presentational.
export function MapArt({ destination }: { destination: string }) {
  return (
    <div
      className={styles.mapArt}
      role="img"
      aria-label={`Stylized street map near ${destination}`}
    >
      <span className={styles.roadOne} />
      <span className={styles.roadTwo} />
      <span className={styles.roadThree} />
      <span className={styles.roadFour} />
      <span className={styles.mapCircle} />
      <span className={styles.mapPin}>P</span>
      <span className={styles.mapStreet}>BERLIN STREETS</span>
    </div>
  );
}

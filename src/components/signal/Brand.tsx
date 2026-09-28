import styles from "./signal.module.css";

// Dumb: berlinparken wordmark. No props, no state.
export function Brand() {
  return (
    <span className={styles.brand}>
      <span className={styles.brandBars} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      berlin<strong>parken</strong>
    </span>
  );
}

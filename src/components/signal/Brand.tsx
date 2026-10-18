import Link from "next/link";
import styles from "./signal.module.css";

// Dumb: berlinparken wordmark and home link.
export function Brand() {
  return (
    <Link href="/" className={styles.brand} aria-label="Berlin Parken home">
      <span className={styles.brandBars} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      berlin<strong>parken</strong>
    </Link>
  );
}

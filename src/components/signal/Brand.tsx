import Link from "next/link";
import { useLocale } from "@/lib/i18n";
import { localizedPath } from "@/lib/locale-path";
import styles from "./signal.module.css";

// Dumb: berlinparken wordmark and home link.
export function Brand() {
  const { locale } = useLocale();
  return (
    <Link
      href={localizedPath(locale)}
      className={styles.brand}
      aria-label="Berlin Parken home"
    >
      <span className={styles.brandBars} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      berlin<strong>parken</strong>
    </Link>
  );
}

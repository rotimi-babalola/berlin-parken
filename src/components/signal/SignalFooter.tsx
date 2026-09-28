import { useLocale } from "@/lib/i18n";
import styles from "./signal.module.css";

// Dumb: closing guidance line. Copy from i18n; no props, no state.
export function SignalFooter() {
  const { t } = useLocale();
  return <footer className={styles.footer}>{t("signal.footer")}</footer>;
}

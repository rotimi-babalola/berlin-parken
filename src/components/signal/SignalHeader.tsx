import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/lib/i18n";
import { Brand } from "./Brand";
import styles from "./signal.module.css";

// Dumb: top bar. Copy comes from i18n; language state lives in LocaleProvider.
export function SignalHeader() {
  const { t } = useLocale();
  return (
    <header className={styles.header}>
      <Brand />
      <span className={styles.headerTag}>{t("signal.tagline")}</span>
      <span className={styles.headerRight}>
        <LanguageSwitcher />
        <a className={styles.headerLink} href="#search">
          {t("signal.start")}
        </a>
      </span>
    </header>
  );
}

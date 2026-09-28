import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n";
import styles from "./signal.module.css";

// Dumb: hero layout. Copy from i18n, search panel injected as children.
export function SignalHero({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  return (
    <section className={styles.hero}>
      <div className={styles.intro}>
        <h1>
          {t("signal.titleA")} <br />
          <em>{t("signal.titleB")}</em>
        </h1>
        <p>{t("signal.lede")}</p>
        <span className={styles.chip}>{t("signal.chip")}</span>
      </div>
      {children}
    </section>
  );
}

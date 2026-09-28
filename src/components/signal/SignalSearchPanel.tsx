import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n";
import styles from "./signal.module.css";

// Dumb: destination panel chrome. The live form is injected as children.
export function SignalSearchPanel({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  return (
    <div className={styles.panel} id="search">
      <div className={styles.panelTop}>
        <span>{t("signal.panelTitle")}</span>
        <span>{t("signal.panelStep")}</span>
      </div>
      {children}
    </div>
  );
}

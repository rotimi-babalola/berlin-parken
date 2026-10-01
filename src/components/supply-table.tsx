import { useLocale } from "@/lib/i18n";
import styles from "./address-search.module.css";

// Dumb: tabular Bestand with inline category hints (no tooltip-only).
export function SupplyTable({
  rows,
}: {
  rows: Array<{ label: string; value: number; hint?: string }>;
}) {
  const { locale } = useLocale();
  return (
    <table className={styles.supplyTable}>
      <tbody>
        {rows.map(({ label, value, hint }) => (
          <tr key={label}>
            <td>
              {label}
              {hint ? <span className={styles.supplyHint}>{hint}</span> : null}
            </td>
            <td className={styles.supplyValue}>
              {value.toLocaleString(locale)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

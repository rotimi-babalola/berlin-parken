import styles from "./address-search.module.css";

// Dumb: tabular Bestand.
export function SupplyTable({ rows }: { rows: Array<[string, number]> }) {
  return (
    <table className={styles.supplyTable}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td>{label}</td>
            <td className={styles.supplyValue}>{value.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

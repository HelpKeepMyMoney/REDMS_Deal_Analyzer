import styles from "../REDMS.module.css";

/**
 * Renders a row indicating cost, profit, total, or divider in the panels.
 */
export function DetailRow({ label, val, cls, tot, div, className }) {
  return (
    <div
      className={[
        styles.dr,
        tot && styles.tot,
        div && styles.div,
        cls && styles[cls],
        className && styles[className],
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={styles.dk}>{label}</span>
      <span className={styles.dv}>{val}</span>
    </div>
  );
}

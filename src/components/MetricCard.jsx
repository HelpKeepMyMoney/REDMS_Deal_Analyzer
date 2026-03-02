import styles from "../REDMS.module.css";

/**
 * Metric card with optional accent bar (hi/grn/red) and subtitle.
 */
export function MetricCard({ label, val, sub, c, hi, grn, red }) {
  return (
    <div
      className={[styles.mcard, hi && styles.hi, grn && styles.grn, red && styles.red]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.ml}>{label}</div>
      <div className={[styles.mv, styles[c]].filter(Boolean).join(" ")}>{val}</div>
      {sub && <div className={styles.ms}>{sub}</div>}
    </div>
  );
}

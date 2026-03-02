import { formatCurrency } from "../logic/formatters.js";
import styles from "../REDMS.module.css";

const $ = formatCurrency;

export function PropertyBrief({ inp, r, formatAddress }) {
  return (
    <div className={styles.panel}>
      <div className={styles.ph}>{formatAddress(inp)}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          padding: "10px 14px",
          gap: 10,
        }}
      >
        {[
          ["Beds", inp.bedrooms],
          ["Baths", inp.bathrooms],
          ["Sq Ft", Number(inp.sqft).toLocaleString()],
          ["Year", inp.yearBuilt],
          ["Rehab", inp.rehabLevel],
          ["Rehab $", $(r.rehabCost)],
          ["Rent/mo", $(inp.totalRent)],
          ["NOI/yr", $(r.noi)],
        ].map(([l, v]) => (
          <div key={l}>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 7,
                color: "var(--muted)",
                letterSpacing: 2,
                marginBottom: 3,
                textTransform: "uppercase",
              }}
            >
              {l}
            </div>
            <div style={{ fontFamily: "var(--display)", fontSize: 17, color: "var(--text)" }}>
              {v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

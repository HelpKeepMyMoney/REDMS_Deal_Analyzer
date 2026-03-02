import { formatCurrency, formatPct } from "../../logic/formatters.js";
import styles from "../../REDMS.module.css";

const $ = formatCurrency;
const pct = formatPct;

export function ProjectionsTab({ r }) {
    return (
        <div className={`${styles.panel} ${styles.scr}`} style={{ marginTop: 12 }} role="tabpanel" id="panel-proj" aria-labelledby="tab-proj">
            <div className={styles.ph}>
                30-Year Buy & Hold Projection · Initial Investment:{" "}
                {$(r.bhTotalInvestment)}
            </div>
            <table className={styles.ptbl}>
                <thead>
                    <tr>
                        <th>Yr</th>
                        <th>Rental Income</th>
                        <th>Prop Costs</th>
                        <th>Mtg Pmt</th>
                        <th>Net Cash</th>
                        <th>Depreciation</th>
                        <th>Reserves</th>
                        <th>ROI</th>
                        <th>ROE</th>
                        <th>Prop Value</th>
                    </tr>
                </thead>
                <tbody>
                    {r.projections.map((p) => (
                        <tr
                            key={p.yr}
                            className={[1, 5, 10, 15, 20, 25, 30].includes(p.yr) ? styles.hl : ""}
                        >
                            <td>{p.yr}</td>
                            <td style={{ color: "var(--green)" }}>{$(p.rentalIncome)}</td>
                            <td style={{ color: "var(--red)" }}>({$(p.propCosts)})</td>
                            <td style={{ color: "var(--red)" }}>({$(p.mortgagePayment)})</td>
                            <td style={{ color: "var(--green)" }}>{$(p.netCash)}</td>
                            <td style={{ color: "var(--muted2)" }}>{$(p.depr)}</td>
                            <td style={{ color: "var(--red)" }}>({$(Math.abs(p.reserves_yr))})</td>
                            <td style={{ color: "var(--amber)" }}>{pct(p.roi)}</td>
                            <td>{pct(p.roe)}</td>
                            <td>{$(p.propValue)}</td>
                        </tr>
                    ))}
                    <tr className={styles.sum}>
                        <td>∑</td>
                        <td>{$(r.gt.rentalIncome)}</td>
                        <td>({$(r.gt.propCosts)})</td>
                        <td>({$(r.gt.mortgagePayment)})</td>
                        <td>{$(r.gt.netCash)}</td>
                        <td>{$(r.gt.depr)}</td>
                        <td>({$(Math.abs(r.gt.reserves_yr))})</td>
                        <td>
                            {pct(
                                r.bhTotalInvestment > 0 ? r.gt.netCash / r.bhTotalInvestment : 0
                            )}
                        </td>
                        <td>—</td>
                        <td>{$(r.projections[29]?.propValue)}</td>
                    </tr>
                </tbody>
            </table>
            <div
                style={{
                    padding: "10px 14px",
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    color: "var(--muted2)",
                    display: "flex",
                    gap: 24,
                }}
            >
                <span>
                    Total 30-yr NOI: <span style={{ color: "var(--green)" }}>{$(r.gt.netCash)}</span>
                </span>
                <span>
                    Total Return:{" "}
                    <span style={{ color: "var(--amber)" }}>
                        {r.bhTotalInvestment > 0
                            ? ((r.gt.netCash / r.bhTotalInvestment) * 100).toFixed(0)
                            : 0}
                        %
                    </span>
                </span>
                <span>
                    Avg Annual Return:{" "}
                    <span style={{ color: "var(--amber)" }}>
                        {r.bhTotalInvestment > 0
                            ? ((r.gt.netCash / r.bhTotalInvestment / 30) * 100).toFixed(1)
                            : 0}
                        %
                    </span>
                </span>
                <span>
                    Final Property Value:{" "}
                    <span style={{ color: "var(--green)" }}>{$(r.projections[29]?.propValue)}</span>
                </span>
            </div>
        </div>
    );
}

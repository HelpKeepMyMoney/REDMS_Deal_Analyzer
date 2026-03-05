import { Field } from "../Field.jsx";
import { DetailRow } from "../DetailRow.jsx";
import { formatCurrency, formatPct } from "../../logic/formatters.js";
import styles from "../../REDMS.module.css";

const $ = formatCurrency;
const pct = formatPct;

export function RetailInvestorTab({ r, inp, upd }) {
    return (
        <div className={styles.two} style={{ marginTop: 12 }} role="tabpanel" id="panel-retail" aria-labelledby="tab-retail">
            <div className={styles.panel}>
                <div className={styles.ph}>Annual P&L — Retail Investor</div>
                <DetailRow label="Annual Gross Rent" val={$(r.annualGrossRent)} cls="g" />
                <DetailRow label="Less: Annual Insurance" val={`(${$(r.bhAnnualIns)})`} cls="r" />
                <DetailRow label="Less: Detroit Property Tax" val={`(${$(r.bhAnnualTax)})`} cls="r" />
                <DetailRow label="Less: Prop Mgmt Fee" val={`(${$(r.bhAnnualPmFee)})`} cls="r" />
                <DetailRow
                    label="Net Operating Income / NOI"
                    val={$(r.noi)}
                    tot
                    div
                    className="dr-white"
                />
                {r.bhAnnualMtg1 > 0 && (
                    <DetailRow label="Less: 1st Mortgage (annual)" val={`(${$(r.bhAnnualMtg1)})`} cls="r" />
                )}
                {r.bhAnnualMtg2 > 0 && (
                    <DetailRow label="Less: 2nd Mortgage (annual)" val={`(${$(r.bhAnnualMtg2)})`} cls="r" />
                )}
                <DetailRow
                    label="Cash Flow After Debt"
                    val={$(r.bhCashFlowAfterDebt)}
                    tot
                    div
                    className="dr-white"
                />
                <DetailRow label="NOI incl. Reserves" val={$(r.noiWithReserves)} cls="a" />
                <DetailRow
                    label="Cap Rate (based on Sell to Retail Investor)"
                    val={pct(r.capRateRetail)}
                    tot
                    className="dr-white"
                />
            </div>
            <div className={styles.panel}>
                <div className={styles.ph}>Investment Summary — Retail Investor</div>
                <DetailRow label="Sell to Retail Investor" val={$(r.arv)} />
                <div className={styles["bh-editable-field"]}>
                    <Field
                        label="Tenant Acquisition ($)"
                        name="retailTenantAcquisition"
                        value={inp.retailTenantAcquisition ?? 0}
                        onChange={upd}
                    />
                </div>
                <div className={styles["bh-editable-field"]}>
                    <Field
                        label="Recommended Reserves ($)"
                        name="retailRecommendedReserves"
                        value={inp.retailRecommendedReserves ?? r.retailReservesDefault}
                        onChange={upd}
                    />
                </div>
                <DetailRow
                    label="Total Retail Investment"
                    val={$(r.retailTotalInvestment)}
                    tot
                    className="dr-white"
                />
                <DetailRow label="Annual NOI" val={$(r.noi)} cls="a" />
                <DetailRow
                    label="Year-1 Cash-on-Cash"
                    val={pct(r.retailCashOnCash)}
                    tot
                    div
                    className="dr-white"
                />
            </div>
            <div className={`${styles.panel} ${styles.scr}`} style={{ marginTop: 12, gridColumn: "1 / -1" }}>
                <div className={styles.ph}>
                    30-Year Retail Investor Projection · Initial Investment:{" "}
                    {$(r.retailTotalInvestment)}
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
                                <td style={{ color: "var(--amber)" }}>
                                    {pct(r.retailTotalInvestment > 0 ? p.netCash / r.retailTotalInvestment : 0)}
                                </td>
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
                                    r.retailTotalInvestment > 0 ? r.gt.netCash / r.retailTotalInvestment : 0
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
                            {r.retailTotalInvestment > 0
                                ? ((r.gt.netCash / r.retailTotalInvestment) * 100).toFixed(0)
                                : 0}
                            %
                        </span>
                    </span>
                    <span>
                        Avg Annual Return:{" "}
                        <span style={{ color: "var(--amber)" }}>
                            {r.retailTotalInvestment > 0
                                ? ((r.gt.netCash / r.retailTotalInvestment / 30) * 100).toFixed(1)
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
        </div>
    );
}

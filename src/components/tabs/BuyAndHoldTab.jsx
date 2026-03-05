import { useState } from "react";
import { DetailRow } from "../DetailRow.jsx";
import { formatCurrency, formatPct } from "../../logic/formatters.js";
import styles from "../../REDMS.module.css";

const $ = formatCurrency;
const pct = formatPct;

export function BuyAndHoldTab({ r, inp, upd, maxTpc = 60000 }) {
    const [focused, setFocused] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const val = inp.businessCosts ?? r.bhBusinessCosts ?? 0;
    return (
        <div className={styles.two} style={{ marginTop: 12 }} role="tabpanel" id="panel-bh" aria-labelledby="tab-bh">
            <div className={styles.panel}>
                <div className={styles.ph}>Annual P&L — Buy & Hold Sheet</div>
                <DetailRow label="Annual Gross Rent" val={$(r.annualGrossRent)} cls="g" />
                <DetailRow label="Less: Annual Insurance" val={`(${$(r.bhAnnualIns)})`} cls="r" />
                <DetailRow label="Less: Detroit Property Tax" val={`(${$(r.bhAnnualTax)})`} cls="r" />
                <DetailRow label="Less: Prop Mgmt Fee" val={`(${$(r.bhAnnualPmFee)})`} cls="r" />
                <div className={`${styles.dr} ${styles.r}`}>
                    <span className={styles.dk}>Less: Business Costs</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        className={styles["bh-cost-input"]}
                        value={focused ? String(val) : (val ? `(${$(val)})` : "($0)")}
                        onChange={(e) => {
                            const raw = e.target.value.replace(/[$,()\s]/g, "");
                            const num = parseFloat(raw);
                            upd("businessCosts", raw === "" ? undefined : (Number.isFinite(num) ? num : 0));
                        }}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                    />
                </div>
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
                    label="Cap Rate"
                    val={pct(r.capRate)}
                    tot
                    className="dr-white"
                />
            </div>
            <div className={styles.panel}>
                <div className={styles.ph}>Investment Summary — Buy & Hold Sheet</div>
                <DetailRow label="Total Investment" val={$(r.bhPurchasePrice)} />
                <div className={styles.dr}>
                    <span className={styles.dk}>Tenant Acquisition ($)</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        className={styles["bh-cost-input"]}
                        value={focusedField === "tenantAcquisition" ? String(inp.tenantAcquisition ?? r.tenantAcq ?? "") : $(inp.tenantAcquisition ?? r.tenantAcq)}
                        onChange={(e) => {
                            const raw = e.target.value.replace(/[$,()\s]/g, "");
                            upd("tenantAcquisition", raw === "" ? undefined : (Number.isFinite(parseFloat(raw)) ? parseFloat(raw) : 0));
                        }}
                        onFocus={() => setFocusedField("tenantAcquisition")}
                        onBlur={() => setFocusedField(null)}
                    />
                </div>
                <div className={styles.dr}>
                    <span className={styles.dk}>Recommended Reserves ($)</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        className={styles["bh-cost-input"]}
                        value={focusedField === "recommendedReserves" ? String(inp.recommendedReserves ?? r.reserves ?? "") : $(inp.recommendedReserves ?? r.reserves)}
                        onChange={(e) => {
                            const raw = e.target.value.replace(/[$,()\s]/g, "");
                            upd("recommendedReserves", raw === "" ? undefined : (Number.isFinite(parseFloat(raw)) ? parseFloat(raw) : 0));
                        }}
                        onFocus={() => setFocusedField("recommendedReserves")}
                        onBlur={() => setFocusedField(null)}
                    />
                </div>
                <DetailRow
                    label="Total B&H Investment"
                    val={$(r.bhTotalInvestment)}
                    tot
                    className="dr-white"
                />
                <DetailRow label="Annual NOI" val={$(r.noi)} cls="a" />
                <DetailRow
                    label="Year-1 Cash-on-Cash"
                    val={pct(r.bhCashOnCash)}
                    tot
                    div
                    className="dr-white"
                />
                <DetailRow label="ARV (Sell to Retail Investor)" val={$(r.arv)} cls="a" />
                <DetailRow
                    label="Equity Created"
                    val={$(r.arv - r.bhTotalInvestment)}
                    cls={r.arv > r.bhTotalInvestment ? "g" : "r"}
                />
            </div>
        </div>
    );
}

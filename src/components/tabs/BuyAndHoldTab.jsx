import { Field } from "../Field.jsx";
import { DetailRow } from "../DetailRow.jsx";
import { formatCurrency, formatPct } from "../../logic/formatters.js";
import styles from "../../REDMS.module.css";

const $ = formatCurrency;
const pct = formatPct;

export function BuyAndHoldTab({ r, inp, upd, maxTpc = 60000 }) {
    return (
        <div className={styles.two} style={{ marginTop: 12 }} role="tabpanel" id="panel-bh" aria-labelledby="tab-bh">
            <div className={styles.panel}>
                <div className={styles.ph}>Annual P&L — Buy & Hold Sheet</div>
                <DetailRow label="Annual Gross Rent" val={$(r.annualGrossRent)} cls="g" />
                <DetailRow label="Less: Annual Insurance" val={`(${$(r.bhAnnualIns)})`} cls="r" />
                <DetailRow label="Less: Detroit Property Tax" val={`(${$(r.bhAnnualTax)})`} cls="r" />
                <DetailRow label="Less: Prop Mgmt Fee" val={`(${$(r.bhAnnualPmFee)})`} cls="r" />
                <DetailRow
                    label="Net Operating Income / NOI"
                    val={$(r.noi)}
                    cls={r.noi >= 7500 ? "g" : "a"}
                    tot
                    div
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
                    cls={r.bhCashFlowAfterDebt >= 0 ? "g" : "r"}
                    tot
                    div
                />
                <DetailRow label="NOI incl. Reserves" val={$(r.noiWithReserves)} cls="a" />
                <DetailRow
                    label="Cap Rate"
                    val={pct(r.capRate)}
                    cls={r.capRate >= 0.1 ? "g" : "a"}
                    tot
                />
            </div>
            <div className={styles.panel}>
                <div className={styles.ph}>Investment Summary — Buy & Hold Sheet</div>
                <DetailRow label="Total Investment" val={$(r.bhPurchasePrice)} />
                <div className={styles["bh-editable-field"]}>
                    <Field
                        label="Tenant Acquisition ($)"
                        name="tenantAcquisition"
                        value={inp.tenantAcquisition ?? r.tenantAcq}
                        onChange={upd}
                    />
                </div>
                <div className={styles["bh-editable-field"]}>
                    <Field
                        label="Recommended Reserves ($)"
                        name="recommendedReserves"
                        value={inp.recommendedReserves ?? r.reserves}
                        onChange={upd}
                    />
                </div>
                <DetailRow
                    label="Total B&H Investment"
                    val={$(r.bhTotalInvestment)}
                    cls={r.bhTotalInvestment <= maxTpc ? "g" : "r"}
                    tot
                />
                <DetailRow label="Annual NOI" val={$(r.noi)} cls="a" />
                <DetailRow
                    label="Year-1 Cash-on-Cash"
                    val={pct(r.bhCashOnCash)}
                    cls={r.bhCashOnCash >= 0.1 ? "g" : "a"}
                    tot
                    div
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

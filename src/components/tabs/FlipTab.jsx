import { DetailRow } from "../DetailRow.jsx";
import { formatCurrency, formatPct } from "../../logic/formatters.js";
import styles from "../../REDMS.module.css";

const $ = formatCurrency;
const pct = formatPct;

export function FlipTab({ r, inp }) {
    return (
        <div className={styles.two} style={{ marginTop: 12 }} role="tabpanel" id="panel-flip" aria-labelledby="tab-flip">
            <div className={styles.panel}>
                <div className={styles.ph}>Cost Stack — Purchase & Flip Sheet</div>
                <DetailRow label="Offer / Purchase Price" val={$(r.offerPrice)} cls="g" />
                <DetailRow label="Wholesale Fee" val={$(inp.wholesaleFee)} cls="g" />
                <DetailRow label="Rehab Cost" val={$(r.rehabCost)} cls="g" />
                <DetailRow label="1st Mtg Upfront Points" val={$(r.mortgage1Pts)} cls="g" />
                <DetailRow label="Upfront Out-of-Pocket" val={$(r.upfront)} cls="g" />
                <DetailRow label="  · Inspection" val={$(inp.inspectionFee)} />
                <DetailRow label="  · LLC Setup" val={$(inp.llcSetup)} />
                <DetailRow label="  · Appraisal" val={$(inp.appraisalFee)} />
                <DetailRow label="Closing Costs" val={$(r.closing)} cls="g" />
                <DetailRow label="  · Title Insurance" val={$(r.titleIns)} />
                <DetailRow label="  · Settlement" val={$(inp.settlementCosts)} />
                <DetailRow label="  · Misc Fees" val={$(inp.miscFees)} />
                <DetailRow label="  · Acq Management Fee" val={$(r.acqMgmtFee)} />
                <DetailRow label="  · Prepaid Insurance" val={$(r.prepaidIns)} />
                <DetailRow label="  · Buyer's Property Tax" val={$(r.buyerTax)} />
                <DetailRow label="  · Rehab Insurance" val={$(r.rehabIns)} />
                <DetailRow label="Holding Costs" val={$(r.holdingCosts)} cls="g" />
                <DetailRow label="2nd Mtg Points" val={$(r.mortgage2Pts)} cls="g" />
                <DetailRow
                    label="Less: 2nd Mortgage"
                    val={r.mortgage2Amt > 0 ? `(${$(r.mortgage2Amt)})` : $(0)}
                    cls="r"
                />
                <DetailRow
                    label="Less: 1st Mortgage"
                    val={r.mortgage1Amt > 0 ? `(${$(r.mortgage1Amt)})` : $(0)}
                    cls="r"
                />
                <DetailRow label="Total Investment" val={$(r.totalInvestment)} cls="g" tot className="dr-total" />
            </div>
            <div className={styles.panel}>
                <div className={styles.ph}>Profit Waterfall — Purchase & Flip Sheet</div>
                <DetailRow label="ARV / Target Sale Price (B43)" val={$(r.arv)} cls="g" />
                <DetailRow label="Less: Realtor/Sales Fee (B45)" val={`(${$(r.realtorFee)})`} cls="r" />
                {r.mortgage1Amt > 0 && (
                    <DetailRow label="Less: 1st Mortgage Payoff" val={`(${$(r.mortgage1Amt)})`} cls="r" />
                )}
                {r.mortgage2Amt > 0 && (
                    <DetailRow label="Less: 2nd Mortgage Payoff" val={`(${$(r.mortgage2Amt)})`} cls="r" />
                )}
                <DetailRow label="Net Proceeds" val={$(r.netProceedsAfterPayoffs)} cls="g" />
                <DetailRow label="Less: Total Investment" val={`(${$(r.totalInvestment)})`} cls="r" />
                <DetailRow label="Gross Profit (B55)" val={$(r.grossProfit)} cls="a" tot />
                <DetailRow label="Less: Preferred ROI / 10% (B56)" val={`(${$(r.preferredROI)})`} cls="r" />
                <DetailRow
                    label="Less: Initial Referral 1/9 (B57)"
                    val={`(${$(r.initialReferralDeduct)})`}
                    cls="r"
                />
                <DetailRow label="Profit to Split (B58)" val={$(r.profitToSplit)} tot />
                <DetailRow
                    label={`Investor ${100 - inp.profitSplitPct}% Share (B59)`}
                    val={$(r.investorSplit)}
                    cls="g"
                />
                <DetailRow
                    label="Less: Investor Referral 1/9 (B60)"
                    val={`(${$(r.investorSplitReferral)})`}
                    cls="r"
                />
                <DetailRow label={`BNIC ${inp.profitSplitPct}% Share (B61)`} val={$(r.bnicSplit)} />
                <DetailRow label="+ Preferred ROI to Investor (B38)" val={$(r.preferredROI)} cls="g" />
                <DetailRow
                    label="Total Investor Profit (B63)"
                    val={$(r.totalInvestorROI)}
                    cls="a"
                    tot
                    div
                />
                <DetailRow
                    label="Cash-on-Cash ROI (B51)"
                    val={pct(r.cashOnCash)}
                    cls={r.cashOnCash >= 0.2 ? "g" : "a"}
                    tot
                />
                <DetailRow label="Annualized ROI (B52)" val={pct(r.annualizedROI)} cls="a" />
                <DetailRow
                    label="Min Sales Price (B41)"
                    val={$(r.minSalesPrice)}
                    cls={r.minSalesPrice <= r.arv ? "g" : "r"}
                />
            </div>
        </div>
    );
}

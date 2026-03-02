import { MetricCard } from "./MetricCard.jsx";
import { formatCurrency, formatPct } from "../logic/formatters.js";
import styles from "../REDMS.module.css";

const $ = formatCurrency;
const pct = formatPct;

export function DealMetrics({ inp, r, maxTpc = 60000 }) {
    return (
        <>
            <div className={styles.logic}>
                <div className={styles["logic-item"]}>
                    <div className={styles["logic-label"]}>Check 1 · Flip Cash-on-Cash ≥ 25%</div>
                    <div className={`${styles["logic-val"]} ${r.dealCheck1 ? styles.logicValFail : styles.logicValPass}`}>
                        {r.dealCheck1 ? "✗ FAIL" : "✓ PASS"}
                    </div>
                    <div className={styles["logic-desc"]}>
                        {pct(r.cashOnCash)} flip cash-on-cash
                    </div>
                </div>
                <div className={styles["logic-item"]}>
                    <div className={styles["logic-label"]}>Check 2 · B&H CoC ≥ 10%</div>
                    <div className={`${styles["logic-val"]} ${r.dealCheck2 ? styles.logicValFail : styles.logicValPass}`}>
                        {r.dealCheck2 ? "✗ FAIL" : "✓ PASS"}
                    </div>
                    <div className={styles["logic-desc"]}>{pct(r.bhCashOnCash)} cash-on-cash</div>
                </div>
                <div className={styles["logic-item"]}>
                    <div className={styles["logic-label"]}>Check 3 · B&H Cash ≤ ${(maxTpc / 1000).toFixed(0)}K</div>
                    <div className={`${styles["logic-val"]} ${r.dealCheck3 ? styles.logicValFail : styles.logicValPass}`}>
                        {r.dealCheck3 ? "✗ FAIL" : "✓ PASS"}
                    </div>
                    <div className={styles["logic-desc"]}>{$(r.bhTotalInvestment)} required</div>
                </div>
            </div>

            <div className={styles.metrics}>
                <MetricCard
                    label="NOI (Annual)"
                    val={$(r.noi)}
                    sub="Net Operating Income"
                    c={r.noi > 7499 ? "g" : "a"}
                    grn={r.noi > 7499}
                    hi={r.noi <= 7499}
                />
                <MetricCard
                    label="B&H Cash-on-Cash"
                    val={pct(r.bhCashOnCash)}
                    sub="NOI ÷ total investment"
                    c={r.bhCashOnCash >= 0.1 ? "g" : "r"}
                    grn={r.bhCashOnCash >= 0.1}
                    red={r.bhCashOnCash < 0.1}
                />
                <MetricCard
                    label="Investment Required"
                    val={$(r.bhTotalInvestment)}
                    sub="Total B&H Investment"
                    c={r.bhTotalInvestment <= maxTpc ? "g" : "r"}
                    grn={r.bhTotalInvestment <= maxTpc}
                    red={r.bhTotalInvestment > maxTpc}
                />
                <MetricCard
                    label="Rent-to-Price Ratio"
                    val={pct((r.totalInvestment + r.mortgage1Amt + r.mortgage2Amt) > 0 ? inp.totalRent / (r.totalInvestment + r.mortgage1Amt + r.mortgage2Amt) : 0)}
                    sub="Monthly rent ÷ Total Investment"
                    c={(r.totalInvestment + r.mortgage1Amt + r.mortgage2Amt) > 0 && inp.totalRent / (r.totalInvestment + r.mortgage1Amt + r.mortgage2Amt) > 0.017 ? "g" : undefined}
                    grn={(r.totalInvestment + r.mortgage1Amt + r.mortgage2Amt) > 0 && inp.totalRent / (r.totalInvestment + r.mortgage1Amt + r.mortgage2Amt) > 0.017}
                />
                <MetricCard
                    label="Investor Flip Profit"
                    val={$(r.totalInvestorROI)}
                    sub="Pref ROI + 50% split"
                    c="a"
                    hi
                />
                <MetricCard
                    label="Flip Cash-on-Cash"
                    val={pct(r.cashOnCash)}
                    sub="Total investor ROI"
                    c={r.cashOnCash >= 0.2 ? "g" : "r"}
                    grn={r.cashOnCash >= 0.2}
                    red={r.cashOnCash < 0.2}
                />
                <MetricCard
                    label="Sell to Retail Investor"
                    val={$(r.arv)}
                    sub="ARV (Sell to Retail Investor)"
                    c="a"
                    hi
                />
                <MetricCard
                    label="Investor Cap Rate"
                    val={pct(inp.retailCapRate)}
                    sub="Retail Investor Cap Rate (%)"
                />
            </div>
        </>
    );
}

import { DetailRow } from "../DetailRow.jsx";
import { formatCurrency, formatPct } from "../../logic/formatters.js";
import styles from "../../REDMS.module.css";

const $ = formatCurrency;
const pct = formatPct;

/** Primary wholesaler tab — wholesale fee, offer price to buyer, investor attractiveness. */
export function WholesalerTab({ r, inp }) {
  const offerPriceToBuyer = r.offerPriceToBuyer ?? (inp.offerPrice + (inp.wholesaleFee || 0));
  const investorWouldTakeDeal = r.investorWouldTakeDeal ?? r.isDeal;
  const isWholesalerDeal = r.isWholesalerDeal ?? false;

  return (
    <div className={styles.two} style={{ marginTop: 12 }} role="tabpanel" id="panel-wholesaler" aria-labelledby="tab-wholesaler">
      <div className={styles.panel}>
        <div className={styles.ph}>Wholesaler Metrics</div>
        <DetailRow label="Contract Price (to seller)" val={$(r.offerPrice)} cls="g" />
        <DetailRow label="Wholesale Fee" val={$(inp.wholesaleFee)} cls="g" />
        <DetailRow label="Offer Price to Investor" val={$(offerPriceToBuyer)} cls="g" tot />
        <DetailRow label="Max Offer to Investor (Contract Price + Wholesale Fee)" val={$(r.maxOfferToBuyer)} cls="a" className="dr-highlight-yellow" />
      </div>
      <div className={styles.panel}>
        <div className={styles.ph}>Investor Attractiveness</div>
        <DetailRow
          label="Investor Would Take Deal"
          val={investorWouldTakeDeal ? "Yes" : "No"}
          cls={investorWouldTakeDeal ? "g" : "r"}
        />
        <DetailRow
          label="Flip Cash-on-Cash"
          val={pct(r.cashOnCash)}
          cls={r.cashOnCash >= 0.25 ? "g" : "r"}
        />
        <DetailRow
          label="B&H Cash-on-Cash"
          val={pct(r.bhCashOnCash)}
          cls={r.bhCashOnCash >= 0.1 ? "g" : "r"}
        />
        <DetailRow label="Total Investment" val={$(r.totalInvestment)} />
        <DetailRow label="ARV" val={$(r.arv)} />
      </div>
    </div>
  );
}

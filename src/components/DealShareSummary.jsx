import { useMemo } from "react";
import { Link } from "react-router-dom";
import { calc, sanitizeInput } from "../logic";
import { formatCurrency, formatPct } from "../logic/formatters.js";
import { useConfig } from "../contexts/ConfigContext.jsx";
import { formatDealListDate } from "../logic/dealListSort.js";
import styles from "./DealShareSummary.module.css";

const $ = formatCurrency;

function formatAddress(deal) {
  if (deal.street != null || deal.city != null || deal.state != null || deal.zipCode != null) {
    const line2 = [deal.city, deal.state, deal.zipCode].filter(Boolean).join(", ");
    return [deal.street, line2].filter(Boolean).join(", ") || "—";
  }
  return deal.address ?? "—";
}

/**
 * Read-only deal summary for admin Deal Sharing tab.
 */
export function DealShareSummary({ deal, users = [] }) {
  const { config } = useConfig();

  const { r, ownerEmail } = useMemo(() => {
    if (!deal?.id) return { r: null, ownerEmail: "" };
    try {
      const inp = sanitizeInput(deal);
      return {
        r: calc(inp, config),
        ownerEmail: users.find((u) => u.uid === deal.userId)?.email ?? deal.userId ?? "",
      };
    } catch {
      return { r: null, ownerEmail: users.find((u) => u.uid === deal.userId)?.email ?? "" };
    }
  }, [deal, config, users]);

  if (!deal?.id) {
    return (
      <div className={styles.empty}>
        <h3 className={styles.title}>Deal summary</h3>
        <p className={styles.emptyText}>Click an address in the list to preview metrics and sharing context.</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <h3 className={styles.title}>Deal summary</h3>
      <p className={styles.address}>{formatAddress(deal)}</p>
      {ownerEmail && (
        <p className={styles.meta}>
          Owner: <span className={styles.metaStrong}>{ownerEmail}</span>
        </p>
      )}
      <div className={styles.badges}>
        <span className={styles.badge}>{deal.status || "Available"}</span>
        {deal.archived === true && (
          <span className={styles.badgeArchived} role="status">
            Archived (hidden from users)
          </span>
        )}
        {r && (
          <span className={r.isDeal ? styles.badgeDeal : styles.badgeNoDeal} role="status">
            {r.isDeal ? "✓ DEAL" : "✗ NO DEAL"}
          </span>
        )}
      </div>
      {(deal.createdAt || deal.updatedAt) && (
        <p className={styles.dates}>
          {deal.createdAt && <>Created {formatDealListDate(deal.createdAt)}</>}
          {deal.createdAt && deal.updatedAt && " · "}
          {deal.updatedAt && <>Updated {formatDealListDate(deal.updatedAt)}</>}
        </p>
      )}
      <div className={styles.shareHint}>
        {deal.sharedWithAll ? (
          <span>Shared with <strong>all users</strong></span>
        ) : (
          <span>
            Shared with <strong>{Array.isArray(deal.sharedWith) ? deal.sharedWith.length : 0}</strong> user
            {(Array.isArray(deal.sharedWith) ? deal.sharedWith.length : 0) === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {!r ? (
        <p className={styles.warn}>Could not compute metrics for this deal.</p>
      ) : (
        <dl className={styles.metrics}>
          <div className={styles.metricRow}>
            <dt>Offer price</dt>
            <dd>{$(deal.offerPrice ?? 0)}</dd>
          </div>
          <div className={styles.metricRow}>
            <dt>Rehab</dt>
            <dd>
              {deal.rehabLevel ?? "—"} · {$(r.rehabCost)}
            </dd>
          </div>
          <div className={styles.metricRow}>
            <dt>Est. rent / mo</dt>
            <dd>{$(deal.totalRent ?? r.annualGrossRent / 12)}</dd>
          </div>
          <div className={styles.metricRow}>
            <dt>Annual NOI</dt>
            <dd>{$(r.noi)}</dd>
          </div>
          <div className={styles.metricRow}>
            <dt>B&amp;H cash-on-cash</dt>
            <dd>{formatPct(r.bhCashOnCash)}</dd>
          </div>
          <div className={styles.metricRow}>
            <dt>Investment required</dt>
            <dd>{$(r.bhTotalInvestment)}</dd>
          </div>
          <div className={styles.metricRow}>
            <dt>Cap rate</dt>
            <dd>{formatPct(r.capRate)}</dd>
          </div>
          <div className={styles.metricRow}>
            <dt>Flip cash-on-cash</dt>
            <dd>{formatPct(r.cashOnCash)}</dd>
          </div>
        </dl>
      )}

      <div className={styles.actions}>
        <Link to={`/investor?dealId=${deal.id}`} className={styles.openLink} target="_blank" rel="noopener noreferrer">
          Open in Investor module ↗
        </Link>
      </div>
    </div>
  );
}

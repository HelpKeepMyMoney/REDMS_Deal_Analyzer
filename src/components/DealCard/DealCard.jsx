import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { calc, sanitizeInput } from "../../logic";
import { formatCurrency, formatPct } from "../../logic/formatters.js";
import { useConfig } from "../../contexts/ConfigContext.jsx";
import styles from "../PropertySearch/PropertySearch.module.css";

const DEFAULT_IMAGE_PLACEHOLDER =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800";

export function DealCard({
  deal,
  users = [],
  onStatusChange,
  onAssignedUserChange,
  statusUpdating = false,
}) {
  const { config } = useConfig();
  const [imageError, setImageError] = useState(false);
  const imageSrc = imageError
    ? (deal.imageFallback || DEFAULT_IMAGE_PLACEHOLDER)
    : deal.image;

  const r = useMemo(() => {
    try {
      const inp = sanitizeInput(deal);
      return calc(inp, config);
    } catch {
      return null;
    }
  }, [deal, config]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const showUserSelector =
    ["Reserved", "Under Contract", "Sold"].includes(deal.status) && users.length > 0;

  return (
    <div className={styles.card}>
      <Link
        to={`/investor?dealId=${deal.id}`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div className={styles.cardImageWrapper}>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Deal property"
              className={styles.cardImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={styles.cardPlaceholder}>No Image Available</div>
          )}
          <div className={styles.cardBadges}>
            <div
              className={styles.cardStatus}
              style={{
                background:
                  deal.status === "Sold"
                    ? "var(--green, #22c55e)"
                    : deal.status === "Under Contract"
                      ? "var(--amber)"
                      : deal.status === "Reserved"
                        ? "var(--blue, #3b82f6)"
                        : "rgba(0, 0, 0, 0.7)",
              }}
            >
              {deal.status}
            </div>
            {r && (
              <div className={r.isDeal ? styles.dealBadge : styles.noDealBadge}>
                {r.isDeal
                  ? `Deal (${deal.rehabLevel ?? "Full"})`
                  : "No Deal"}
              </div>
            )}
            {deal.archived === true && (
              <div className={styles.cardStatus} style={{ background: "rgba(100, 116, 139, 0.85)" }} title="Hidden from non-admin users">
                Archived
              </div>
            )}
          </div>
        </div>
      </Link>
      <div className={styles.cardContent}>
        <Link
          to={`/investor?dealId=${deal.id}`}
          style={{ textDecoration: "none", color: "inherit", display: "block" }}
        >
          <div className={styles.cardPrice}>
            {formatPrice(deal.offerPrice)}
          </div>
          <div className={styles.cardDetails}>
            {deal.bedrooms > 0 && <span>{deal.bedrooms} beds</span>}
            {deal.bathrooms > 0 && <span>• {deal.bathrooms} baths</span>}
            {deal.sqft > 0 && (
              <span>• {Number(deal.sqft).toLocaleString()} sqft</span>
            )}
          </div>
          {(deal.createdAt || deal.updatedAt) && (
            <div className={styles.cardListed}>
              {deal.createdAt && (
                <div>
                  Created{" "}
                  {new Date(deal.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
              {deal.updatedAt && (
                <div>
                  Updated{" "}
                  {new Date(deal.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
            </div>
          )}
          {r && (
            <div className={styles.cardMetrics}>
              <div className={styles.cardMetricFullWidth}>
                <span className={styles.cardMetricLabel}>Rehab Level</span>
                <span className={styles.cardMetricValue}>
                  {deal.rehabLevel ?? "Full"}
                </span>
              </div>
              <div className={styles.cardMetric}>
                <span className={styles.cardMetricLabel}>Est. Rent</span>
                <span className={styles.cardMetricValue}>
                  {formatCurrency(deal.totalRent ?? (r.annualGrossRent / 12))}/mo
                </span>
              </div>
              <div className={styles.cardMetric}>
                <span className={styles.cardMetricLabel}>Annual NOI</span>
                <span className={styles.cardMetricValue}>
                  {formatCurrency(r.noi)}
                </span>
              </div>
              <div className={styles.cardMetric}>
                <span className={styles.cardMetricLabel}>B&H Cash-on-Cash ROI</span>
                <span className={styles.cardMetricValue}>
                  {formatPct(r.bhCashOnCash)}
                </span>
              </div>
              <div className={styles.cardMetric}>
                <span className={styles.cardMetricLabel}>Investment Required</span>
                <span className={styles.cardMetricValue}>
                  {formatCurrency(r.bhTotalInvestment)}
                </span>
              </div>
              {r.mortgage1Amt != null && r.mortgage1Amt > 0 && (
                <div className={styles.cardMetric}>
                  <span className={styles.cardMetricLabel}>Loan Amount</span>
                  <span className={styles.cardMetricValue}>
                    {formatCurrency(r.mortgage1Amt)}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className={styles.cardAddress}>
            {deal.street || deal.dealName}
            <br />
            {deal.city}, {deal.state} {deal.zipCode}
          </div>
          {deal.notes && (
            <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.5rem", lineHeight: 1.4 }}>
              <span style={{ fontWeight: 500, color: "var(--muted2)" }}>Notes:</span>{" "}
              {deal.notes.length > 120 ? `${deal.notes.slice(0, 120)}…` : deal.notes}
            </div>
          )}
        </Link>

        {onStatusChange && (
          <div
            style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.fieldGroup} style={{ marginBottom: "0.75rem" }}>
              <label className={styles.label}>Status</label>
              <select
                className={styles.select}
                value={deal.status}
                onChange={(e) => onStatusChange(deal.id, e.target.value)}
                disabled={statusUpdating}
              >
                <option value="Available">Available</option>
                <option value="Reserved">Reserved</option>
                <option value="Under Contract">Under Contract</option>
                <option value="Sold">Sold</option>
              </select>
            </div>

            {showUserSelector && onAssignedUserChange && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Assigned to</label>
                <select
                  className={styles.select}
                  value={deal.assignedUserId || ""}
                  onChange={(e) =>
                    onAssignedUserChange(deal.id, e.target.value || null)
                  }
                  disabled={statusUpdating}
                >
                  <option value="">— Select user —</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <Link
          to={`/investor?dealId=${deal.id}`}
          style={{ textDecoration: "none", marginTop: "1rem", display: "block" }}
        >
          <button type="button" className={styles.analyzeButton}>
            View Deal
          </button>
        </Link>
      </div>
    </div>
  );
}

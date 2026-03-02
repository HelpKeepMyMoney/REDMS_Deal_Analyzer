import { useState } from "react";
import styles from "./RequestAnalysisModal.module.css";

function formatPrice(price) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price || 0);
}

export function RequestAnalysisModal({ property, onClose, onSubmit, isSubmitting }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);

  const address = [property?.addressLine1, property?.city, property?.state, property?.zipCode]
    .filter(Boolean)
    .join(", ");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({ propertySnapshot: property, message: message.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to send request");
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="request-analysis-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 id="request-analysis-title" className={styles.title}>
            Request Deal Analysis
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className={styles.subtitle}>
          Ask an admin to analyze this property and share the deal with you.
        </p>
        <div className={styles.propertySummary}>
          <div className={styles.propertyAddress}>{address || "—"}</div>
          <div className={styles.propertyDetails}>
            {formatPrice(property?.price)}
            {property?.bedrooms > 0 && ` · ${property.bedrooms} beds`}
            {property?.bathrooms > 0 && ` · ${property.bathrooms} baths`}
            {property?.squareFootage > 0 && ` · ${property.squareFootage.toLocaleString()} sqft`}
          </div>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="request-message" className={styles.label}>
            Message (optional)
          </label>
          <textarea
            id="request-message"
            className={styles.textarea}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add any notes for the admin..."
            rows={4}
          />
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

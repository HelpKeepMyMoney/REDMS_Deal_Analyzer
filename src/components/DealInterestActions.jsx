import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { loadUserFavorites } from "../logic/userFavoritesStorage.js";
import styles from "./DealInterestActions.module.css";

const ZOOM_SCHEDULING_LINK = "https://meetings-na2.hubspot.com/mevans";

function ZoomConfirmationModal({ onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="zoom-confirmation-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 id="zoom-confirmation-title" className={styles.title}>
            Request Zoom Meeting
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className={styles.subtitle}>
          Admin has been informed of your desire to schedule a Zoom meeting to discuss this deal. You can click on this link to schedule a 30-minute Zoom meeting based on your schedule.
        </p>
        <div style={{ padding: "0 1.25rem 1.25rem" }}>
          <p className={styles.subtitle} style={{ marginTop: "1rem" }}>
            <a
              href={ZOOM_SCHEDULING_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.zoomLink}
            >
              Schedule a 30-minute Zoom meeting
            </a>
          </p>
          <div className={styles.actions} style={{ marginTop: "1.25rem" }}>
            <button type="button" className={styles.submitBtn} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DealInterestModal({ type, dealName, onClose, onSubmit, isSubmitting }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);

  const labels = {
    start_buying: {
      title: "Start Buying Process",
      subtitle: "Indicate your interest in moving forward with purchasing this property.",
    },
  };

  const { title, subtitle } = labels[type] || { title: type, subtitle: "" };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({ message: message.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to send request");
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="deal-interest-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 id="deal-interest-title" className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className={styles.subtitle}>{subtitle}</p>
        <div className={styles.dealName}>{dealName || "This deal"}</div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="interest-message" className={styles.label}>
            Message (optional)
          </label>
          <textarea
            id="interest-message"
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

export function DealInterestActions({ dealId, dealName, interestApi, onFavoriteSuccess }) {
  const { user } = useAuth();
  const [modalType, setModalType] = useState(null);
  const [showZoomConfirmation, setShowZoomConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [favoriteSubmitting, setFavoriteSubmitting] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (!user?.uid || !dealId) return;
    loadUserFavorites(user.uid).then((favs) => {
      setIsFavorited(favs.some((f) => f.dealId === dealId));
    });
  }, [user?.uid, dealId]);

  const handleFavorite = async () => {
    if (!interestApi || !dealId) return;
    setFavoriteSubmitting(true);
    try {
      await interestApi.createInterest({ type: "favorite", dealId, dealName });
      setIsFavorited(true);
      onFavoriteSuccess?.();
    } catch (e) {
      console.error("Failed to save favorite", e);
    } finally {
      setFavoriteSubmitting(false);
    }
  };

  const handleRequestZoom = async () => {
    if (!interestApi || !dealId) return;
    setSubmitting(true);
    try {
      await interestApi.createInterest({ type: "request_zoom", dealId, dealName });
      setShowZoomConfirmation(true);
    } catch (e) {
      console.error("Failed to send Zoom request", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalSubmit = async ({ message }) => {
    if (!interestApi || !dealId || !modalType) return;
    setSubmitting(true);
    try {
      await interestApi.createInterest({ type: modalType, dealId, dealName, message });
      setModalType(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.actionsWrap}>
      <h3 className={styles.sectionTitle}>Express Interest</h3>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={handleFavorite}
          disabled={favoriteSubmitting || isFavorited}
        >
          {favoriteSubmitting ? "Saving…" : isFavorited ? "Saved to Favorite" : "Save to Favorite"}
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={handleRequestZoom}
          disabled={submitting}
        >
          {submitting ? "Sending…" : "Request Zoom Meeting"}
        </button>
        <span className={styles.startBuyingWrap}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => setModalType("start_buying")}
          >
            Start Buying Process
          </button>
          {dealName && dealName !== "—" && (
            <span className={styles.streetAddress}>{dealName}</span>
          )}
        </span>
      </div>

      {showZoomConfirmation && (
        <ZoomConfirmationModal onClose={() => setShowZoomConfirmation(false)} />
      )}

      {modalType && (
        <DealInterestModal
          type={modalType}
          dealName={dealName}
          onClose={() => setModalType(null)}
          onSubmit={handleModalSubmit}
          isSubmitting={submitting}
        />
      )}
    </div>
  );
}

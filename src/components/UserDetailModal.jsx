import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import styles from "./UserDetailModal.module.css";

const PAGE_SIZE = 10;

function getUserEmail(users, uid) {
  return users.find((u) => u.uid === uid)?.email ?? uid;
}

function formatLastLogin(lastLoginAt) {
  if (!lastLoginAt) return "Never";
  try {
    return new Date(lastLoginAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const CLIENT_PARAM_FIELDS = [
  { id: "maxTpc", label: "Max Total Project Cost ($)", min: 0, step: 1000 },
  { id: "minLoanAmount", label: "Min 1st Mortgage Loan Amount ($)", min: 0, step: 1000 },
  { id: "minFlipCoCPct", label: "Min Flip Cash-on-Cash (%)", min: 0, step: 0.1 },
  { id: "minBhCoCPct", label: "Min B&H Cash-on-Cash (%)", min: 0, step: 0.1 },
  { id: "minAcqMgmtFee", label: "Min Acquisition Mgmt Fee ($)", min: 0 },
  { id: "minRealtorFee", label: "Min Realtor/Sale Fee ($)", min: 0 },
  { id: "mortgagePointsRate", label: "Mortgage Points Rate (e.g. 0.04)", min: 0, step: 0.01 },
  { id: "initialReferralPct", label: "Initial Referral (%)", min: 0, step: 0.1 },
  { id: "investorReferralPct", label: "Investor Referral (%)", min: 0, step: 0.1 },
];

export function UserDetailModal({
  user: selectedUser,
  profile,
  profileLoading,
  metadata,
  favorites,
  deals,
  searches,
  users,
  clientParams,
  setClientParams,
  clientParamsLoading,
  clientParamsSaving,
  onClose,
  onSaveProfile,
  onRoleChange,
  onSaveClientParams,
  onUnshareDeal,
  onUnassignDeal,
  onUnshareSearch,
  adminApi,
  currentUserId,
}) {
  const [profileEdit, setProfileEdit] = useState({ firstName: "", lastName: "", phoneNumber: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [dealsVisible, setDealsVisible] = useState(PAGE_SIZE);
  const [searchesVisible, setSearchesVisible] = useState(PAGE_SIZE);
  const [favoritesVisible, setFavoritesVisible] = useState(PAGE_SIZE);
  const [actionInProgress, setActionInProgress] = useState(null);
  const modalRef = useRef(null);
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  useEffect(() => {
    setProfileEdit({
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      phoneNumber: profile?.phoneNumber ?? "",
    });
  }, [profile]);

  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return [];
    return Array.from(modalRef.current.querySelectorAll(focusableSelector)).filter(
      (el) => !el.disabled && el.offsetParent !== null
    );
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current?.contains(document.activeElement)) {
        const focusable = getFocusableElements();
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, getFocusableElements]);

  useEffect(() => {
    const focusable = getFocusableElements();
    const first = focusable[0];
    if (first) first.focus();
  }, [getFocusableElements]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!adminApi || !selectedUser) return;
    setProfileSaving(true);
    try {
      await onSaveProfile(selectedUser.uid, profileEdit);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUnshareDeal = async (deal) => {
    if (!window.confirm(`Remove ${selectedUser.email} from shared access to "${deal.dealName}"?`)) return;
    setActionInProgress(deal.id);
    try {
      await onUnshareDeal(deal);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUnassignDeal = async (deal) => {
    if (!window.confirm(`Unassign "${deal.dealName}" from ${selectedUser.email}?`)) return;
    setActionInProgress(deal.id);
    try {
      await onUnassignDeal(deal);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUnshareSearch = async (search) => {
    if (!window.confirm(`Remove ${selectedUser.email} from shared access to "${search.name}"?`)) return;
    setActionInProgress(search.id);
    try {
      await onUnshareSearch(search);
    } finally {
      setActionInProgress(null);
    }
  };

  const getDealBadge = (d) => {
    if (d.userId === selectedUser.uid) return { label: "Owner", className: styles.badgeOwner };
    if (d.assignedUserId === selectedUser.uid) {
      const ownerEmail = getUserEmail(users, d.userId);
      return { label: `Assigned by ${ownerEmail}`, className: styles.badgeShared };
    }
    if (d.sharedWithAll) return { label: "Shared with all", className: styles.badgeShared };
    const ownerEmail = getUserEmail(users, d.userId);
    return { label: `Shared by ${ownerEmail}`, className: styles.badgeShared };
  };

  const canUnshareDeal = (d) =>
    d.userId !== selectedUser.uid && (d.sharedWith || []).includes(selectedUser.uid);

  const canUnassignDeal = (d) =>
    d.assignedUserId === selectedUser.uid && d.userId !== selectedUser.uid;

  const canUnshareSearch = (s) =>
    s.userId !== selectedUser.uid && (s.sharedWith || []).includes(selectedUser.uid);

  const displayedDeals = deals.slice(0, dealsVisible);
  const displayedSearches = searches.slice(0, searchesVisible);
  const displayedFavorites = favorites.slice(0, favoritesVisible);

  if (!selectedUser) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-detail-modal-title"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} ref={modalRef}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 id="user-detail-modal-title" className={styles.title}>
              {selectedUser.email}
            </h2>
            {adminApi && (
              <select
                className={styles.roleSelect}
                value={selectedUser.role}
                onChange={(e) => onRoleChange(selectedUser.uid, e.target.value)}
                disabled={currentUserId === selectedUser.uid}
                title="Change role"
              >
              <option value="free">Free</option>
              <option value="investor">Investor</option>
              <option value="pro">Pro</option>
              <option value="client">Client</option>
              <option value="wholesaler">Wholesaler</option>
              <option value="admin">Admin</option>
            </select>
            )}
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className={styles.activitySummary}>
          Last login: {formatLastLogin(metadata?.lastLoginAt)} · Deals: {deals.length} · Searches: {searches.length} · Favorites: {favorites.length}
        </p>

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Profile</h4>
          {profileLoading ? (
            <p className={styles.muted}>Loading…</p>
          ) : adminApi ? (
            <form onSubmit={handleSaveProfile} className={styles.profileForm}>
              <label htmlFor="profile-firstName">First name</label>
              <input
                id="profile-firstName"
                value={profileEdit.firstName}
                onChange={(e) => setProfileEdit((p) => ({ ...p, firstName: e.target.value }))}
                placeholder="—"
              />
              <label htmlFor="profile-lastName">Last name</label>
              <input
                id="profile-lastName"
                value={profileEdit.lastName}
                onChange={(e) => setProfileEdit((p) => ({ ...p, lastName: e.target.value }))}
                placeholder="—"
              />
              <label htmlFor="profile-phone">Phone</label>
              <input
                id="profile-phone"
                value={profileEdit.phoneNumber}
                onChange={(e) => setProfileEdit((p) => ({ ...p, phoneNumber: e.target.value }))}
                placeholder="—"
              />
              <div className={styles.profileActions}>
                <button type="submit" className={styles.saveBtn} disabled={profileSaving}>
                  {profileSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          ) : (
            profile ? (
              <dl className={styles.profileForm} style={{ display: "grid" }}>
                <dt>First name</dt>
                <dd style={{ margin: 0 }}>{profile.firstName || "—"}</dd>
                <dt>Last name</dt>
                <dd style={{ margin: 0 }}>{profile.lastName || "—"}</dd>
                <dt>Phone</dt>
                <dd style={{ margin: 0 }}>{profile.phoneNumber || "—"}</dd>
              </dl>
            ) : (
              <p className={styles.muted}>No profile information.</p>
            )
          )}
        </div>

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Favorites ({favorites.length})</h4>
          {favorites.length === 0 ? (
            <p className={styles.muted}>No favorites.</p>
          ) : (
            <>
              <ul className={styles.list}>
                {displayedFavorites.map((f) => (
                  <li key={f.id} className={styles.listItem}>
                    <Link
                      to={`/investor?dealId=${f.dealId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {f.dealName || "Untitled"}
                    </Link>
                  </li>
                ))}
              </ul>
              {favorites.length > PAGE_SIZE && favoritesVisible < favorites.length && (
                <button
                  type="button"
                  className={styles.showMore}
                  onClick={() => setFavoritesVisible((v) => v + PAGE_SIZE)}
                >
                  Show more
                </button>
              )}
            </>
          )}
        </div>

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Deals ({deals.length})</h4>
          {deals.length === 0 ? (
            <p className={styles.muted}>No deals this user can view.</p>
          ) : (
            <>
              <ul className={styles.list}>
                {displayedDeals.map((d) => {
                  const badge = getDealBadge(d);
                  return (
                    <li key={d.id} className={styles.listItem}>
                      <Link
                        to={`/investor?dealId=${d.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {d.dealName}
                      </Link>
                      <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>
                      {canUnshareDeal(d) && (
                        <button
                          type="button"
                          className={styles.quickAction}
                          onClick={() => handleUnshareDeal(d)}
                          disabled={actionInProgress === d.id}
                        >
                          Unshare
                        </button>
                      )}
                      {canUnassignDeal(d) && (
                        <button
                          type="button"
                          className={styles.quickAction}
                          onClick={() => handleUnassignDeal(d)}
                          disabled={actionInProgress === d.id}
                        >
                          Unassign
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {deals.length > PAGE_SIZE && dealsVisible < deals.length && (
                <button
                  type="button"
                  className={styles.showMore}
                  onClick={() => setDealsVisible((v) => v + PAGE_SIZE)}
                >
                  Show more
                </button>
              )}
            </>
          )}
        </div>

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Searches ({searches.length})</h4>
          {searches.length === 0 ? (
            <p className={styles.muted}>No searches assigned to this user.</p>
          ) : (
            <>
              <ul className={styles.list}>
                {displayedSearches.map((s) => (
                  <li key={s.id} className={styles.listItem}>
                    <Link
                      to={`/investor?searchId=${s.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {s.name}
                    </Link>
                    <span className={styles.muted}>
                      ({s.resultCount ?? 0} properties)
                      {s.userId === selectedUser.uid
                        ? " · Created by user"
                        : ` · Shared by ${getUserEmail(users, s.userId)}`}
                    </span>
                    {canUnshareSearch(s) && (
                      <button
                        type="button"
                        className={styles.quickAction}
                        onClick={() => handleUnshareSearch(s)}
                        disabled={actionInProgress === s.id}
                      >
                        Unshare
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {searches.length > PAGE_SIZE && searchesVisible < searches.length && (
                <button
                  type="button"
                  className={styles.showMore}
                  onClick={() => setSearchesVisible((v) => v + PAGE_SIZE)}
                >
                  Show more
                </button>
              )}
            </>
          )}
        </div>

        {selectedUser.role === "client" && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Edit Deal Parameters (Client)</h4>
            <p className={styles.muted} style={{ marginBottom: 12 }}>
              Override deal calculation parameters for this client. Leave blank to use app defaults.
            </p>
            {clientParamsLoading ? (
              <p className={styles.muted}>Loading…</p>
            ) : clientParams && setClientParams ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSaveClientParams?.();
                }}
                className={styles.adminForm}
              >
                {CLIENT_PARAM_FIELDS.map(({ id, label, min, step }) => (
                  <div key={id} className={styles.formGroup}>
                    <label htmlFor={`client-${id}`}>{label}</label>
                    <input
                      id={`client-${id}`}
                      type="number"
                      value={clientParams[id] ?? ""}
                      onChange={(e) =>
                        setClientParams((p) => ({
                          ...p,
                          [id]: Number(e.target.value) || 0,
                        }))
                      }
                      min={min}
                      step={step}
                    />
                  </div>
                ))}
                <button type="submit" className={styles.saveBtn} disabled={clientParamsSaving}>
                  {clientParamsSaving ? "Saving…" : "Save Client Parameters"}
                </button>
              </form>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

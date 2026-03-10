import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTier } from "../contexts/TierContext.jsx";
import { createInterestApi } from "../logic/interestApi.js";
import { AdminDropdown } from "../components";
import { TIERS } from "../logic/tierConstants.js";

function getAnalyzerPath(isWholesaler) {
  return isWholesaler ? "/wholesaler" : "/investor";
}

function UpgradeButton({ plan, cycle, label, user }) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/subscription/create?plan=${plan}&cycle=${cycle}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to create subscription");
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to start upgrade. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={styles.submit}
      style={{ textDecoration: "none", textAlign: "center" }}
    >
      {loading ? "Loading…" : label}
    </button>
  );
}

import styles from "./Profile.module.css";

export default function Profile() {
  const { user, isAdmin, isWholesaler, updateEmail, updatePassword } = useAuth();
  const { tier, isClient, isFreeTier, usageCount, usageLimit, hasWholesalerModule } = useTier();
  const interestApi = useMemo(
    () => (user ? createInterestApi(() => user.getIdToken()) : null),
    [user]
  );
  const [wholesalerRequested, setWholesalerRequested] = useState(false);
  const [wholesalerRequesting, setWholesalerRequesting] = useState(false);
  const [wholesalerError, setWholesalerError] = useState("");

  const [emailForm, setEmailForm] = useState({
    newEmail: "",
    currentPassword: "",
  });

  useEffect(() => {
    if (user?.email) {
      setEmailForm((prev) => ({ ...prev, newEmail: user.email }));
    }
  }, [user?.email]);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
    currentPassword: "",
  });
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");
    setEmailBusy(true);
    try {
      await updateEmail(emailForm.newEmail, emailForm.currentPassword);
      setEmailSuccess("A verification email has been sent to your new address. Please check your inbox (and Spam folder) and click the link to complete the change.");
      setEmailForm((prev) => ({ ...prev, currentPassword: "" }));
    } catch (err) {
      setEmailError(err.message || "Failed to update email");
    } finally {
      setEmailBusy(false);
    }
  };

  const handleRequestWholesalerAccess = async () => {
    if (!interestApi) return;
    setWholesalerRequesting(true);
    setWholesalerError("");
    try {
      await interestApi.createInterest({ type: "request_wholesaler_access" });
      setWholesalerRequested(true);
    } catch (e) {
      setWholesalerError(e.message || "Failed to submit request.");
    } finally {
      setWholesalerRequesting(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    setPasswordBusy(true);
    try {
      await updatePassword(passwordForm.newPassword, passwordForm.currentPassword);
      setPasswordSuccess("Password updated successfully.");
      setPasswordForm({ newPassword: "", confirmPassword: "", currentPassword: "" });
    } catch (err) {
      setPasswordError(err.message || "Failed to update password");
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hdr}>
        <Link to={getAnalyzerPath(hasWholesalerModule || isWholesaler)} className={styles.back}>← Back to Deal Analyzer</Link>
        {isAdmin && <AdminDropdown email={user?.email} />}
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>Profile</h1>
          <p className={styles.sub}>Update your account settings</p>

          <section className={styles.section} aria-labelledby="subscription-heading">
            <h2 id="subscription-heading" className={styles.sectionTitle}>Subscription</h2>
            {isClient ? (
              <p className={styles.sub}>
                Client — view shared deals and export. Deal parameters are set by your admin. You cannot create or save your own deals.
              </p>
            ) : isFreeTier ? (
              <>
                <p className={styles.sub} style={{ marginBottom: 12 }}>
                  Free tier: {usageCount} of {usageLimit} deals used (lifetime). Upgrade for unlimited analyses, export, and more.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  <UpgradeButton plan="investor" cycle="monthly" label="Investor $39/mo" user={user} />
                  <UpgradeButton plan="pro" cycle="monthly" label="Pro $99/mo" user={user} />
                  <UpgradeButton plan="wholesaler" cycle="monthly" label="Wholesaler $149/mo" user={user} />
                  <UpgradeButton plan="investor" cycle="annual" label="Investor $390/yr" user={user} />
                  <UpgradeButton plan="pro" cycle="annual" label="Pro $990/yr" user={user} />
                  <UpgradeButton plan="wholesaler" cycle="annual" label="Wholesaler $1,490/yr" user={user} />
                </div>
                <p className={styles.sub} style={{ marginTop: 12, fontSize: 11 }}>
                  Annual billing saves 2 months vs monthly.
                </p>
              </>
            ) : (
              <p className={styles.sub}>
                {tier === TIERS.ADMIN && "Admin — full access, subscription bypassed."}
                {tier === TIERS.INVESTOR && `Investor — ${usageCount}/${usageLimit} deals this month. Additional analyses $10 each.`}
                {tier === TIERS.PRO && `Pro — ${usageCount}/${usageLimit} deals this month. Additional analyses $10 each.`}
                {tier === TIERS.WHOLESALER && `Wholesaler — ${usageCount}/${usageLimit} deals this month. Additional analyses $10 each.`}
                {tier !== TIERS.ADMIN && (
                  <>
                    {" "}
                    <a href="https://www.paypal.com/myaccount/autopay/" target="_blank" rel="noopener noreferrer" className={styles["hdr-nav-link"]}>
                      Manage subscription
                    </a>
                  </>
                )}
              </p>
            )}
          </section>

          <section className={styles.section} aria-labelledby="email-heading">
            <h2 id="email-heading" className={styles.sectionTitle}>Email address</h2>
            <form onSubmit={handleUpdateEmail} className={styles.form}>
              <label htmlFor="profile-new-email">New email</label>
              <input
                id="profile-new-email"
                type="email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm((p) => ({ ...p, newEmail: e.target.value }))}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
              <label htmlFor="profile-email-password">Current password</label>
              <input
                id="profile-email-password"
                type="password"
                value={emailForm.currentPassword}
                onChange={(e) => setEmailForm((p) => ({ ...p, currentPassword: e.target.value }))}
                placeholder="Enter current password to confirm"
                required
                autoComplete="current-password"
              />
              {emailError && <div className={styles.error} role="alert">{emailError}</div>}
              {emailSuccess && <div className={styles.success} role="status">{emailSuccess}</div>}
              <button type="submit" className={styles.submit} disabled={emailBusy}>
                {emailBusy ? "Updating…" : "Update email"}
              </button>
            </form>
          </section>

          {!hasWholesalerModule && !isWholesaler && (
            <section className={styles.section} aria-labelledby="wholesaler-heading">
              <h2 id="wholesaler-heading" className={styles.sectionTitle}>Wholesaler Access</h2>
              <p className={styles.sub} style={{ marginBottom: 12 }}>
                Request access to the Wholesaler module to analyze properties from a wholesaler perspective.
              </p>
              {wholesalerRequested ? (
                <p className={styles.success} role="status">
                  Request submitted. An admin will review and grant access.
                </p>
              ) : (
                <>
                  {wholesalerError && <div className={styles.error} role="alert">{wholesalerError}</div>}
                  <button
                  type="button"
                  className={styles.submit}
                  onClick={handleRequestWholesalerAccess}
                  disabled={wholesalerRequesting}
                >
                  {wholesalerRequesting ? "Submitting…" : "Request Wholesaler Access"}
                </button>
                </>
              )}
            </section>
          )}

          <section className={styles.section} aria-labelledby="password-heading">
            <h2 id="password-heading" className={styles.sectionTitle}>Password</h2>
            <form onSubmit={handleUpdatePassword} className={styles.form}>
              <label htmlFor="profile-current-password">Current password</label>
              <input
                id="profile-current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                required
                autoComplete="current-password"
              />
              <label htmlFor="profile-new-password">New password</label>
              <input
                id="profile-new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                placeholder="Min. 6 characters"
                required
                autoComplete="new-password"
              />
              <label htmlFor="profile-confirm-password">Confirm new password</label>
              <input
                id="profile-confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                required
                autoComplete="new-password"
              />
              {passwordError && <div className={styles.error} role="alert">{passwordError}</div>}
              {passwordSuccess && <div className={styles.success} role="status">{passwordSuccess}</div>}
              <button type="submit" className={styles.submit} disabled={passwordBusy}>
                {passwordBusy ? "Updating…" : "Update password"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTier } from "../contexts/TierContext.jsx";
import { createInterestApi } from "../logic/interestApi.js";
import { loadUserProfile, saveUserProfile } from "../logic/userProfileStorage.js";
import { AdminDropdown } from "../components";
import { TIERS, TIER_LIMITS } from "../logic/tierConstants.js";

function getAnalyzerPath(isWholesaler) {
  return isWholesaler ? "/wholesaler" : "/investor";
}

const UPGRADE_OPTIONS = [
  { plan: "investor", cycle: "monthly", label: "Investor $39/mo" },
  { plan: "pro", cycle: "monthly", label: "Pro $99/mo" },
  { plan: "wholesaler", cycle: "monthly", label: "Wholesaler $149/mo" },
  { plan: "investor", cycle: "annual", label: "Investor $390/yr" },
  { plan: "pro", cycle: "annual", label: "Pro $990/yr" },
  { plan: "wholesaler", cycle: "annual", label: "Wholesaler $1,490/yr" },
];

function getUpgradeOptionsForTier(tier, subscriptionCycle) {
  if (tier === TIERS.FREE) return UPGRADE_OPTIONS;
  const higherTier = {
    [TIERS.INVESTOR]: UPGRADE_OPTIONS.filter((o) => o.plan === "pro" || o.plan === "wholesaler"),
    [TIERS.PRO]: UPGRADE_OPTIONS.filter((o) => o.plan === "wholesaler"),
    [TIERS.WHOLESALER]: [],
  };
  const sameTierAnnual = {
    [TIERS.INVESTOR]: UPGRADE_OPTIONS.find((o) => o.plan === "investor" && o.cycle === "annual"),
    [TIERS.PRO]: UPGRADE_OPTIONS.find((o) => o.plan === "pro" && o.cycle === "annual"),
    [TIERS.WHOLESALER]: UPGRADE_OPTIONS.find((o) => o.plan === "wholesaler" && o.cycle === "annual"),
  };
  const options = higherTier[tier] || [];
  const annual = sameTierAnnual[tier];
  if (annual && subscriptionCycle !== "annual" && !options.some((o) => o.plan === annual.plan && o.cycle === annual.cycle)) {
    options.push(annual);
  }
  return options;
}

function getTierTooltip(plan) {
  const limits = TIER_LIMITS[plan];
  if (!limits?.maxAnalysesPerMonth) return null;
  const deals = limits.maxAnalysesPerMonth === Infinity ? "Unlimited" : `${limits.maxAnalysesPerMonth} deals`;
  const overage = limits.overagePerDeal != null ? `$${limits.overagePerDeal} per deal` : null;
  const parts = [`${deals} per month included`];
  if (overage) parts.push(`Additional analyses: ${overage}`);
  return parts.join(". ");
}

function UpgradeButton({ plan, cycle, label, user, className }) {
  const [loading, setLoading] = useState(false);
  const tooltip = getTierTooltip(plan);
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
      className={className || styles.submit}
      title={tooltip || undefined}
    >
      {loading ? "Loading…" : label}
    </button>
  );
}

import styles from "./Profile.module.css";

export default function Profile() {
  const { user, isAdmin, isWholesaler, signOut, updateEmail, updatePassword } = useAuth();
  const { tier, subscriptionCycle, cancelAtPeriodEnd, accessUntil, isClient, isFreeTier, usageCount, usageLimit, hasWholesalerModule, refreshTier } = useTier();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const completedSubscriptionRef = useRef(false);
  const [cycleFromApi, setCycleFromApi] = useState(null);

  const effectiveCycle = subscriptionCycle ?? cycleFromApi;

  // Fetch cycle from API when TierContext has none (backfill for existing subscriptions)
  useEffect(() => {
    if (subscriptionCycle != null || !user || !["investor", "pro", "wholesaler"].includes(tier)) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/subscription/status", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.cycle) {
          setCycleFromApi(data.cycle);
          refreshTier();
        }
      } catch {}
    })();
  }, [user, tier, subscriptionCycle, refreshTier]);

  // Complete subscription when returning from PayPal (webhook can't reach localhost)
  useEffect(() => {
    const subSuccess = searchParams.get("subscription");
    const subscriptionId = searchParams.get("subscription_id");
    if (subSuccess !== "success" || !subscriptionId || !user || completedSubscriptionRef.current) return;

    completedSubscriptionRef.current = true;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/subscription/complete", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ subscription_id: subscriptionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          refreshTier();
          setSearchParams({});
        } else {
          completedSubscriptionRef.current = false;
          console.error("Subscription complete failed:", data.error);
        }
      } catch (e) {
        completedSubscriptionRef.current = false;
        console.error("Subscription complete error:", e);
      }
    })();
  }, [user, searchParams, setSearchParams, refreshTier]);
  const interestApi = useMemo(
    () => (user ? createInterestApi(() => user.getIdToken()) : null),
    [user]
  );
  const [wholesalerRequested, setWholesalerRequested] = useState(false);
  const [wholesalerRequesting, setWholesalerRequesting] = useState(false);
  const [wholesalerError, setWholesalerError] = useState("");

  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });
  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");
  const [contactBusy, setContactBusy] = useState(false);

  const [emailForm, setEmailForm] = useState({
    newEmail: "",
    currentPassword: "",
  });

  useEffect(() => {
    if (user?.uid) {
      loadUserProfile(user.uid).then((profile) => {
        if (profile) {
          setContactForm({
            firstName: profile.firstName ?? "",
            lastName: profile.lastName ?? "",
            phoneNumber: profile.phoneNumber ?? "",
          });
        }
      });
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user?.email) {
      setEmailForm((prev) => ({ ...prev, newEmail: user.email }));
    }
  }, [user?.email]);

  // Scroll to Subscription section when navigating with #subscription-heading
  useEffect(() => {
    if (location.hash !== "#subscription-heading") return;
    const el = document.getElementById("subscription-heading");
    if (!el) return;
    const scrollToSection = () => {
      const rect = el.getBoundingClientRect();
      const offset = 140; // Leave space so "Subscription" heading stays visible
      const targetY = window.scrollY + rect.top - offset;
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    };
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToSection);
    });
    return () => cancelAnimationFrame(t);
  }, [location.hash]);
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
  const [cancelSubBusy, setCancelSubBusy] = useState(false);
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false);

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    setContactError("");
    setContactSuccess("");
    setContactBusy(true);
    try {
      await saveUserProfile(user.uid, contactForm);
      setContactSuccess("Contact information updated.");
    } catch (err) {
      setContactError(err.message || "Failed to update contact information");
    } finally {
      setContactBusy(false);
    }
  };

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

  const handleCancelSubscription = async () => {
    if (!user || !window.confirm("Cancel your subscription? You'll keep access until the end of your current billing period, then be downgraded to the free tier. Your subscription will not renew.")) return;
    setCancelSubBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        refreshTier();
      } else {
        alert(data.error || "Failed to cancel subscription");
      }
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to cancel subscription");
    } finally {
      setCancelSubBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !window.confirm("Permanently delete your account? You will immediately lose access to the app. This cannot be undone.")) return;
    setDeleteAccountBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await signOut();
        window.location.href = "/";
      } else {
        alert(data.error || "Failed to delete account");
      }
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to delete account");
    } finally {
      setDeleteAccountBusy(false);
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
          <p className={styles.sub}>Manage your account and subscription</p>

          {(!contactForm.firstName?.trim() || !contactForm.lastName?.trim() || !contactForm.phoneNumber?.trim()) && (
            <div className={styles.banner} role="status">
              Please complete your profile by adding your contact information below.
            </div>
          )}

          <section className={styles.section} aria-labelledby="contact-heading">
            <h2 id="contact-heading" className={styles.sectionTitle}>Contact Information</h2>
            <form onSubmit={handleUpdateContact} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="profile-first-name">First name</label>
                  <input
                    id="profile-first-name"
                    type="text"
                    value={contactForm.firstName}
                    onChange={(e) => setContactForm((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="profile-last-name">Last name</label>
                  <input
                    id="profile-last-name"
                    type="text"
                    value={contactForm.lastName}
                    onChange={(e) => setContactForm((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <label htmlFor="profile-phone">Phone number</label>
              <input
                id="profile-phone"
                type="tel"
                value={contactForm.phoneNumber}
                onChange={(e) => setContactForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                placeholder="(555) 123-4567"
                autoComplete="tel"
              />
              {contactError && <div className={styles.error} role="alert">{contactError}</div>}
              {contactSuccess && <div className={styles.success} role="status">{contactSuccess}</div>}
              <button type="submit" className={styles.submit} disabled={contactBusy}>
                {contactBusy ? "Saving…" : "Save contact info"}
              </button>
            </form>
          </section>

          <section id="subscription-heading" className={styles.section} aria-labelledby="subscription-heading-label">
            <h2 id="subscription-heading-label" className={styles.sectionTitle}>Subscription</h2>
            {isClient ? (
              <p className={styles.sectionText}>
                Client — view shared deals and export. Deal parameters are set by your admin. You cannot create or save your own deals.
              </p>
            ) : isFreeTier ? (
              <>
                <div className={styles.usageBlock}>
                  <div className={styles.usageRow}>
                    <span className={styles.usageLabel}>Deals used</span>
                    <span className={styles.usageCount}>{usageCount} / {usageLimit}</span>
                  </div>
                  <div className={styles.usageBar}>
                    <div className={styles.usageBarFill} style={{ width: `${Math.min(100, (usageCount / usageLimit) * 100)}%` }} />
                  </div>
                  <p className={styles.usageNote}>Lifetime limit. Upgrade for unlimited analyses, export, and more.</p>
                </div>
                <div className={styles.tierGrid}>
                  {UPGRADE_OPTIONS.map((opt) => (
                    <UpgradeButton key={`${opt.plan}-${opt.cycle}`} plan={opt.plan} cycle={opt.cycle} label={opt.label} user={user} className={styles.tierBtn} />
                  ))}
                </div>
                <p className={styles.savingsNote}>
                  Annual billing saves 2 months vs monthly.
                </p>
              </>
            ) : (
              <>
                <p className={styles.sectionText}>
                  {tier === TIERS.ADMIN && "Admin — full access, subscription bypassed."}
                  {tier === TIERS.INVESTOR && (
                    <>Investor{effectiveCycle ? ` (${effectiveCycle === "annual" ? "Annual" : "Monthly"})` : ""} — you&apos;ve used {usageCount} of {usageLimit} deals this month. Additional analyses $10 each.</>
                  )}
                  {tier === TIERS.PRO && (
                    <>Pro{effectiveCycle ? ` (${effectiveCycle === "annual" ? "Annual" : "Monthly"})` : ""} — you&apos;ve used {usageCount} of {usageLimit} deals this month. Additional analyses $10 each.</>
                  )}
                  {tier === TIERS.WHOLESALER && (
                    <>Wholesaler{effectiveCycle ? ` (${effectiveCycle === "annual" ? "Annual" : "Monthly"})` : ""} — you&apos;ve used {usageCount} of {usageLimit} deals this month. Additional analyses $10 each.</>
                  )}
                  {tier !== TIERS.ADMIN && (
                    <>
                      {" "}
                      <a href="https://www.paypal.com/myaccount/autopay/" target="_blank" rel="noopener noreferrer" className={styles.hdrNavLink}>
                        Manage subscription
                      </a>
                      {!cancelAtPeriodEnd && (
                        <>
                          {" · "}
                          <button
                            type="button"
                            onClick={handleCancelSubscription}
                            disabled={cancelSubBusy}
                            className={styles.linkButton}
                          >
                            {cancelSubBusy ? "Cancelling…" : "Cancel subscription"}
                          </button>
                        </>
                      )}
                      {cancelAtPeriodEnd && accessUntil && (
                        <span className={styles.cancelNote}>
                          {" "}
                          Cancels at end of period ({new Date(accessUntil).toLocaleDateString()}).
                        </span>
                      )}
                    </>
                  )}
                </p>
                {getUpgradeOptionsForTier(tier, effectiveCycle).length > 0 && (
                  <>
                    <p className={styles.upgradeLabel}>Upgrade or switch to annual billing</p>
                    <div className={styles.tierGrid}>
                      {getUpgradeOptionsForTier(tier, effectiveCycle).map((opt) => (
                        <UpgradeButton key={`${opt.plan}-${opt.cycle}`} plan={opt.plan} cycle={opt.cycle} label={opt.label} user={user} className={styles.tierBtn} />
                      ))}
                    </div>
                    <p className={styles.savingsNote}>
                      Annual billing saves 2 months vs monthly.
                    </p>
                  </>
                )}
              </>
            )}
          </section>

          <section className={styles.section} aria-labelledby="email-heading">
            <h2 id="email-heading" className={styles.sectionTitle}>Email</h2>
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
              <p className={styles.sectionText}>
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

          <section className={styles.section} aria-labelledby="account-heading">
            <h2 id="account-heading" className={styles.sectionTitle}>Delete Account</h2>
            <p className={styles.sectionText}>
              Permanently delete your account. You will immediately lose access to the app. This cannot be undone.
            </p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteAccountBusy}
              className={styles.deleteAccountBtn}
            >
              {deleteAccountBusy ? "Deleting…" : "Delete account"}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}

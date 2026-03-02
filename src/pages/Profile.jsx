import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import styles from "./Profile.module.css";

export default function Profile() {
  const { user, updateEmail, updatePassword } = useAuth();

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
        <Link to="/" className={styles.back}>← Back to Deal Analyzer</Link>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>Profile</h1>
          <p className={styles.sub}>Update your account settings</p>

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

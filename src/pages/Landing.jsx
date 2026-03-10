import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTier } from "../contexts/TierContext.jsx";
import styles from "./Login.module.css";

export default function Landing() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, loading, isAdmin, signIn, signUp, signOut } = useAuth();
  const { hasWholesalerModule, isFreeTier, isClient, loading: tierLoading } = useTier();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setBusy(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setBusy(false);
          return;
        }
        const newUser = await signUp(email, password);
        const token = await newUser.getIdToken();
        fetch("/api/auth/signup-notification", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }).catch(() => {});
      } else {
        await signIn(email, password);
      }
      // Module selection shown when user state updates
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading || (user && tierLoading)) {
    return (
      <div className={styles["login-page"]}>
        <div className={styles["login-card"]}>
          <p className={styles["login-sub"]}>Loading…</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className={styles["login-page"]}>
        <div className={styles["login-card"]}>
          <h1 className={styles["login-title"]}>REDMS</h1>
          <p className={styles["login-sub"]}>Choose module</p>
          <div className={styles["module-links"]}>
            {isAdmin && (
              <Link to="/admin" className={styles["module-link"]}>
                Admin
              </Link>
            )}
            <Link to="/investor" className={styles["module-link"]}>
              {isFreeTier ? "Free" : isClient ? "Client" : "Investor"}
            </Link>
            {(hasWholesalerModule || isAdmin) && (
              <Link to="/wholesaler" className={styles["module-link"]}>
                Wholesaler
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className={styles["sign-out-link"]}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["login-page"]}>
      <div className={styles["login-card"]}>
        <h1 className={styles["login-title"]}>REDMS</h1>
        <p className={styles["login-sub"]}>Real Estate Deal Management System</p>

        <div className={styles["login-tabs"]}>
          <button
            type="button"
            className={`${styles["login-tab"]} ${mode === "signin" ? styles.active : ""}`}
            onClick={() => { setMode("signin"); setError(""); }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`${styles["login-tab"]} ${mode === "signup" ? styles.active : ""}`}
            onClick={() => { setMode("signup"); setError(""); }}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles["login-form"]}>
          <label htmlFor="landing-email">Email</label>
          <input
            id="landing-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          <label htmlFor="landing-password">Password</label>
          <input
            id="landing-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Min. 6 characters" : "Password"}
            required
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          {mode === "signup" && (
            <>
              <label htmlFor="landing-confirm">Confirm password</label>
              <input
                id="landing-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                autoComplete="new-password"
              />
              <p className={styles["login-sub"]} style={{ fontSize: "10px", margin: "-4px 0 0" }}>
                Sign up as Investor. Request Wholesaler access from your Profile after signing in.
              </p>
            </>
          )}
          {error && <div className="login-error" role="alert">{error}</div>}
          <button type="submit" className="login-submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

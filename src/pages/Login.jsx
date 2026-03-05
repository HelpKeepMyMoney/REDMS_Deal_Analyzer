import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import styles from "./Login.module.css";

export default function Login() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [loading, user, navigate]);

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
        const user = await signUp(email, password);
        const token = await user.getIdToken();
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
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={styles["login-page"]}>
        <div className={styles["login-card"]}>
          <p className={styles["login-sub"]}>Loading…</p>
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
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Min. 6 characters" : "Password"}
            required
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          {mode === "signup" && (
            <>
              <label htmlFor="login-confirm">Confirm password</label>
              <input
                id="login-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                autoComplete="new-password"
              />
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

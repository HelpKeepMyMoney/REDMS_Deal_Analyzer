import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTier } from "../contexts/TierContext.jsx";
import styles from "./Login.module.css";

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
    text: "Search listings to find the best real estate deals",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
    text: "Analyze potential investment properties in seconds",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="16" height="20" x="4" y="2" rx="2" />
        <path d="M9 6h6" />
        <path d="M9 10h6" />
        <path d="M9 14h4" />
      </svg>
    ),
    text: "Calculate cash flow, ROI, and dozens of other metrics",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" x2="12" y1="1" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    text: "30-year buy & hold projections and pro formas",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
      </svg>
    ),
    text: "Create professional investment reports",
  },
];

export default function Landing() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"

  useEffect(() => {
    if (searchParams.get("mode") === "signup") {
      setMode("signup");
    } else if (searchParams.get("mode") === "signin") {
      setMode("signin");
    }
  }, [searchParams]);
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
    <div className={styles["landing-page"]}>
      <div className={styles["landing-container"]}>
        <div className={styles["landing-left"]}>
          <div className={styles["landing-brand"]}>
            <div className={styles["landing-brand-row"]}>
              <img src="/logo.png" alt="" className={styles["landing-logo-img"]} aria-hidden />
              <span className={styles["landing-logo"]}>REDMS</span>
            </div>
            <p className={styles["landing-tagline"]}>
              Real Estate Deal Management System
            </p>
          </div>
          <ul className={styles["landing-features"]}>
            {FEATURES.map((f, i) => (
              <li key={i} className={styles["landing-feature"]}>
                <span className={styles["landing-feature-icon"]} aria-hidden>{f.icon}</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles["landing-right"]}>
          <h2 className={styles["landing-form-title"]}>
            {mode === "signup" ? "Sign Up for Free" : "Sign In"}
          </h2>

          <form onSubmit={handleSubmit} className={styles["landing-form"]}>
            <div className={styles["landing-field"]}>
              <input
                id="landing-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                required
                autoComplete="email"
              />
            </div>
            <div className={styles["landing-field"]}>
              <input
                id="landing-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "New password" : "Password"}
                required
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            {mode === "signup" && (
              <div className={styles["landing-field"]}>
                <input
                  id="landing-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                  autoComplete="new-password"
                />
              </div>
            )}
            {error && (
              <div className={styles["landing-error"]} role="alert">
                {error}
              </div>
            )}
            <button
              type="submit"
              className={styles["landing-submit"]}
              disabled={busy}
            >
              {busy
                ? "Please wait…"
                : mode === "signup"
                  ? "Sign Up"
                  : "Sign In"}
            </button>
          </form>

          {mode === "signup" && (
            <p className={styles["landing-note"]}>
              Sign up as Investor. Request Wholesaler access from your Profile
              after signing in.
            </p>
          )}

          <p className={styles["landing-switch"]}>
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className={styles["landing-link"]}
                  onClick={() => {
                    setMode("signin");
                    setError("");
                  }}
                >
                  Sign in here.
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className={styles["landing-link"]}
                  onClick={() => {
                    setMode("signup");
                    setError("");
                  }}
                >
                  Sign up here.
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

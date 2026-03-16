import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTier } from "../contexts/TierContext.jsx";
import styles from "./Privacy.module.css";
import homeStyles from "./Home.module.css";

const SECTION_NAV_LINKS = [
  { label: "Home", href: "/#top" },
  { label: "The Problem", href: "/#problem" },
  { label: "REDMS Platform", href: "/#platform" },
  { label: "How REDMS is Used", href: "/#three-ways" },
  { label: "Professional Tools", href: "/#professional-tools" },
  { label: "Decision-Making", href: "/#decision-making" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Who Uses REDMS", href: "/#who-uses" },
];

export default function Privacy() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const { hasWholesalerModule, loading: tierLoading } = useTier();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  const showWholesalerLink = hasWholesalerModule || isAdmin;

  useEffect(() => {
    function handleClickOutside(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    }
    if (accountOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [accountOpen]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div id="top" className={styles.page}>
      <header className={homeStyles.hdr}>
        <div className={homeStyles.hdrLeft}>
          <Link to="/">
            <img src="/logo.png" alt="" className={homeStyles.hdrLogo} aria-hidden />
          </Link>
          <span className={homeStyles.hdrTitle}>REDMS</span>
        </div>
        <div className={homeStyles.hdrRight}>
          <nav className={`${homeStyles.hdrNav} ${homeStyles.hdrSectionNav}`} aria-label="Page sections">
            {SECTION_NAV_LINKS.map(({ label, href }) => (
              <a key={href} href={href} className={homeStyles.hdrNavLink}>
                {label}
              </a>
            ))}
          </nav>
          {loading || (user && tierLoading) ? (
            <span className={homeStyles.hdrNavLink}>Loading…</span>
          ) : user ? (
            <div className={homeStyles.hdrAccountWrap} ref={accountRef}>
              <button
                type="button"
                className={homeStyles.hdrAccountBtn}
                onClick={() => setAccountOpen((o) => !o)}
                aria-expanded={accountOpen}
                aria-haspopup="true"
              >
                Account
              </button>
              {accountOpen && (
                <div className={homeStyles.hdrDropdown}>
                  <Link to="/profile" className={homeStyles.hdrDropdownLink} onClick={() => setAccountOpen(false)}>
                    Profile
                  </Link>
                  <Link to="/investor" className={homeStyles.hdrDropdownLink} onClick={() => setAccountOpen(false)}>
                    Investor
                  </Link>
                  {showWholesalerLink && (
                    <Link to="/wholesaler" className={homeStyles.hdrDropdownLink} onClick={() => setAccountOpen(false)}>
                      Wholesaler
                    </Link>
                  )}
                  {isAdmin && (
                    <Link to="/admin" className={homeStyles.hdrDropdownLink} onClick={() => setAccountOpen(false)}>
                      Admin
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => { setAccountOpen(false); signOut(); }}
                    className={homeStyles.hdrDropdownSignout}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <nav className={homeStyles.hdrNav} aria-label="Account">
              <Link to="/login" className={homeStyles.hdrBtn}>
                Sign In
              </Link>
              <Link to="/demo" className={homeStyles.hdrBtn}>
                Try Demo
              </Link>
              <Link to="/login?mode=signup" className={homeStyles.hdrBtn}>
                Create Free Account
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.subtitle}>
            REDMS – Real Estate Deal Management System
          </p>
          <p className={styles.effectiveDate}>Effective Date: March 15, 2026</p>

          <div className={styles.content}>
            <p>
              This Privacy Policy explains how The BNIC Network LLC collects, uses,
              and protects information when you use the REDMS platform.
            </p>

            <h2>1. Information We Collect</h2>
            <h3>Account Information</h3>
            <p>When users register we may collect:</p>
            <ul>
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Account credentials</li>
            </ul>

            <h3>Platform Usage Data</h3>
            <p>We may collect data related to use of the Platform, including:</p>
            <ul>
              <li>Deals created</li>
              <li>Properties analyzed</li>
              <li>Search activity</li>
              <li>Usage limits and subscription status</li>
            </ul>

            <h3>Technical Information</h3>
            <p>When you access REDMS we may collect:</p>
            <ul>
              <li>IP address</li>
              <li>Browser type</li>
              <li>Device type</li>
              <li>Log data</li>
            </ul>

            <h3>Payment Information</h3>
            <p>
              Payments are processed through third-party processors such as PayPal.
            </p>
            <p>We do not store full credit card numbers.</p>
            <p>
              Payment providers handle payment data according to their privacy
              policies.
            </p>

            <h2>2. How We Use Information</h2>
            <p>We use collected information to:</p>
            <ul>
              <li>Operate the REDMS platform</li>
              <li>Manage user accounts</li>
              <li>Process subscriptions</li>
              <li>Provide customer support</li>
              <li>Improve system performance</li>
              <li>Prevent fraud or abuse</li>
              <li>Send service-related communications</li>
            </ul>

            <h2>3. Data Storage</h2>
            <p>User data may be stored using cloud infrastructure including:</p>
            <ul>
              <li>Firebase / Firestore</li>
              <li>Secure hosting environments</li>
              <li>Vercel serverless services</li>
            </ul>
            <p>Reasonable safeguards are used to protect stored data.</p>

            <h2>4. Sharing of Information</h2>
            <p>We do not sell user data.</p>
            <p>Information may be shared with:</p>
            <ul>
              <li>Payment processors</li>
              <li>Email service providers</li>
              <li>Infrastructure providers</li>
              <li>Legal authorities when required by law</li>
            </ul>

            <h2>5. Cookies and Tracking</h2>
            <p>The Platform may use cookies or similar technologies to:</p>
            <ul>
              <li>Maintain login sessions</li>
              <li>Improve user experience</li>
              <li>Analyze platform performance</li>
            </ul>
            <p>
              Users may disable cookies in browser settings, although some features
              may not function properly.
            </p>

            <h2>6. Data Retention</h2>
            <p>We retain data for as long as necessary to:</p>
            <ul>
              <li>Provide the Platform</li>
              <li>Maintain legal compliance</li>
              <li>Resolve disputes</li>
            </ul>
            <p>Users may request deletion of their accounts.</p>

            <h2>7. User Rights</h2>
            <p>Users may request to:</p>
            <ul>
              <li>Access their personal data</li>
              <li>Correct inaccurate information</li>
              <li>Delete their account</li>
            </ul>
            <p>Requests may be sent to:</p>
            <p>
              <a href="mailto:info@TheBNIC.com" className={styles.link}>
                info@TheBNIC.com
              </a>
            </p>

            <h2>8. Security</h2>
            <p>We implement reasonable security measures including:</p>
            <ul>
              <li>Authentication systems</li>
              <li>Secure hosting</li>
              <li>Controlled access to administrative functions</li>
            </ul>
            <p>However, no internet transmission is completely secure.</p>

            <h2>9. Children&apos;s Privacy</h2>
            <p>REDMS is not intended for users under 18 years of age.</p>
            <p>We do not knowingly collect personal information from minors.</p>

            <h2>10. Changes to This Policy</h2>
            <p>This Privacy Policy may be updated periodically.</p>
            <p>Changes will be posted with a new effective date.</p>

            <h2>11. Contact</h2>
            <p>The BNIC Network LLC</p>
            <p>1752 E. Ave J, Suite 214</p>
            <p>Lancaster, CA 93535</p>
            <p>
              Email:{" "}
              <a href="mailto:info@TheBNIC.com" className={styles.link}>
                info@TheBNIC.com
              </a>
            </p>
          </div>
        </div>
      </main>

      <footer className={homeStyles.footer}>
        <nav className={homeStyles.footerNav} aria-label="Page sections">
          {SECTION_NAV_LINKS.map(({ label, href }) => (
            <a key={href} href={href} className={homeStyles.footerNavLink}>
              {label}
            </a>
          ))}
          <Link to="/demo" className={homeStyles.footerNavLink}>
            Try Demo
          </Link>
          <Link to="/terms#top" className={homeStyles.footerNavLink}>
            Terms of Service
          </Link>
          <a href="#top" className={homeStyles.footerNavLink}>
            Privacy Policy
          </a>
        </nav>
        <p className={homeStyles.footerCopyright}>
          © {new Date().getFullYear()} The BNIC Network LLC. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

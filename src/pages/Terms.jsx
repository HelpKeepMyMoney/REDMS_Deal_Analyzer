import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTier } from "../contexts/TierContext.jsx";
import { SITE_URL } from "../seo/constants.js";
import styles from "./Terms.module.css";
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

export default function Terms() {
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
      <Helmet>
        <title>Terms of Service · REDMS</title>
        <meta
          name="description"
          content="Terms of Service for REDMS (Real Estate Deal Management System) by The BNIC Network LLC."
        />
        <link rel="canonical" href={`${SITE_URL}/terms`} />
      </Helmet>
      <header className={homeStyles.hdr}>
        <div className={homeStyles.hdrLeft}>
          <Link to="/">
            <img src="/logo.png" alt="REDMS logo" className={homeStyles.hdrLogo} />
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
          <h1 className={styles.title}>Terms of Service</h1>
          <p className={styles.subtitle}>
            REDMS – Real Estate Deal Management System
          </p>
          <p className={styles.effectiveDate}>Effective Date: March 15, 2026</p>

          <div className={styles.content}>
            <p>
              These Terms of Service (&quot;Terms&quot;) govern access to and use of the REDMS
              platform located at{" "}
              <a href="https://redms.thebnic.com" className={styles.link}>
                https://redms.thebnic.com
              </a>{" "}
              (the &quot;Platform&quot;), operated by The BNIC Network LLC (&quot;Company,&quot;
              &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
            </p>
            <p>
              By accessing or using the Platform, you agree to be bound by these Terms.
            </p>
            <p>
              If you do not agree to these Terms, you must not use the Platform.
            </p>

            <h2>1. Description of the Platform</h2>
            <p>
              REDMS (Real Estate Deal Management System) is a web-based software
              platform designed to assist users in analyzing potential real estate
              investment opportunities.
            </p>
            <p>Platform features may include:</p>
            <ul>
              <li>real estate deal analysis</li>
              <li>financial modeling tools</li>
              <li>property search and analysis</li>
              <li>investment performance projections</li>
              <li>deal collaboration and sharing</li>
              <li>investor summary reports</li>
            </ul>
            <p>The Platform provides software tools only.</p>
            <p>The BNIC Network LLC does not provide:</p>
            <ul>
              <li>brokerage services</li>
              <li>securities offerings</li>
              <li>investment advisory services</li>
              <li>legal advice</li>
              <li>tax advice</li>
            </ul>

            <h2>2. Eligibility</h2>
            <p>To use the Platform you must:</p>
            <ul>
              <li>be at least 18 years old</li>
              <li>have the legal capacity to enter into binding agreements</li>
              <li>provide accurate registration information</li>
            </ul>
            <p>By using the Platform you represent that you meet these requirements.</p>

            <h2>3. Account Registration</h2>
            <p>Users may create accounts to access the Platform.</p>
            <p>Users agree to:</p>
            <ul>
              <li>provide accurate account information</li>
              <li>maintain the confidentiality of login credentials</li>
              <li>accept responsibility for all activities conducted through their account</li>
            </ul>
            <p>The Company may suspend or terminate accounts that violate these Terms.</p>

            <h2>4. Subscription Services</h2>
            <p>The Platform may offer multiple subscription tiers, which may include:</p>
            <ul>
              <li>free accounts</li>
              <li>investor accounts</li>
              <li>professional accounts</li>
              <li>wholesaler accounts</li>
            </ul>
            <p>Subscription plans may limit:</p>
            <ul>
              <li>number of deals analyzed</li>
              <li>feature access</li>
              <li>collaboration tools</li>
            </ul>
            <p>Pricing and billing cycles will be disclosed at the time of purchase.</p>

            <h2>5. Payments and Billing</h2>
            <p>
              Subscriptions may be billed through third-party payment processors such
              as PayPal.
            </p>
            <p>
              By purchasing a subscription, users authorize the Company to charge the
              designated payment method.
            </p>
            <p>
              Unless otherwise required by law, subscription payments are
              non-refundable.
            </p>
            <p>
              Users may cancel subscriptions through their account dashboard.
              Cancellation takes effect at the end of the current billing period.
            </p>

            <h2>6. Financial Analysis and Projection Disclaimer</h2>
            <p>
              The Platform generates financial projections based on mathematical models
              and user inputs.
            </p>
            <p>Such projections may include:</p>
            <ul>
              <li>cap rate estimates</li>
              <li>cash-on-cash return projections</li>
              <li>net operating income calculations</li>
              <li>renovation cost estimates</li>
              <li>buy-and-hold performance models</li>
              <li>long-term investment projections</li>
            </ul>
            <p>
              All such outputs are hypothetical estimates and are provided for
              informational purposes only.
            </p>
            <p>Nothing provided through the Platform constitutes:</p>
            <ul>
              <li>investment advice</li>
              <li>financial advice</li>
              <li>legal advice</li>
              <li>tax advice</li>
            </ul>
            <p>
              Users must consult qualified professionals before making investment
              decisions.
            </p>

            <h2>7. Reliance Disclaimer</h2>
            <p>
              Users acknowledge that the Platform is a decision-support tool only.
            </p>
            <p>
              Users agree that they will not rely solely on projections or analytics
              generated by the Platform when making investment decisions.
            </p>
            <p>All investment decisions remain the sole responsibility of the user.</p>
            <p>
              The Company shall not be responsible for financial outcomes resulting
              from reliance on Platform outputs.
            </p>

            <h2>8. Responsibility for User Assumptions</h2>
            <p>
              Financial models generated by the Platform depend heavily on
              user-provided inputs, including but not limited to:
            </p>
            <ul>
              <li>purchase price</li>
              <li>estimated rental income</li>
              <li>renovation costs</li>
              <li>financing terms</li>
              <li>operating expenses</li>
              <li>property appreciation assumptions</li>
            </ul>
            <p>The Company does not verify or validate these inputs.</p>
            <p>
              Users acknowledge that inaccurate assumptions will result in inaccurate
              projections.
            </p>
            <p>
              Users assume full responsibility for verifying the accuracy of all
              assumptions used in the Platform.
            </p>

            <h2>9. Algorithm and Model Limitations</h2>
            <p>
              The Platform uses proprietary algorithms and financial models to
              estimate potential investment performance.
            </p>
            <p>
              These models are simplified analytical frameworks and may not
              incorporate all real-world variables that influence real estate
              investments, including:
            </p>
            <ul>
              <li>market fluctuations</li>
              <li>financing changes</li>
              <li>regulatory or tax changes</li>
              <li>property management costs</li>
              <li>economic conditions</li>
              <li>construction cost volatility</li>
            </ul>
            <p>
              Users acknowledge that software models cannot predict future
              performance and that actual results may differ materially from
              projections generated by the Platform.
            </p>

            <h2>10. Independent Verification Requirement</h2>
            <p>
              Users are responsible for independently verifying all property
              information analyzed through the Platform, including but not limited to:
            </p>
            <ul>
              <li>property condition</li>
              <li>rental market data</li>
              <li>property taxes</li>
              <li>insurance costs</li>
              <li>zoning regulations</li>
              <li>legal restrictions</li>
            </ul>
            <p>
              The Platform may display information obtained from third-party data
              providers or public records.
            </p>
            <p>
              The Company does not guarantee the accuracy, completeness, or
              timeliness of such information.
            </p>

            <h2>11. Sophisticated User Acknowledgment</h2>
            <p>
              By using the Platform, users acknowledge that real estate investments
              involve substantial financial risk.
            </p>
            <p>Users represent that they:</p>
            <ul>
              <li>
                possess sufficient financial knowledge to evaluate investment
                opportunities, or
              </li>
              <li>
                will seek advice from qualified professionals before making
                investment decisions.
              </li>
            </ul>
            <p>
              The Platform is intended for analytical and informational use and is
              not designed to replace professional financial advice.
            </p>

            <h2>12. No Broker-Dealer or Fiduciary Relationship</h2>
            <p>
              The BNIC Network LLC is not registered as a broker-dealer or
              investment advisor.
            </p>
            <p>Use of the Platform does not create:</p>
            <ul>
              <li>a brokerage relationship</li>
              <li>a fiduciary relationship</li>
              <li>an advisory relationship</li>
              <li>an agency relationship</li>
            </ul>
            <p>between users and the Company.</p>

            <h2>13. User Content</h2>
            <p>Users may input data into the Platform including:</p>
            <ul>
              <li>deal information</li>
              <li>financial assumptions</li>
              <li>property data</li>
              <li>notes and documents</li>
            </ul>
            <p>Users retain ownership of their content.</p>
            <p>
              By submitting content, users grant the Company a limited license to
              store, process, and display such content for the purpose of operating
              the Platform.
            </p>

            <h2>14. Intellectual Property</h2>
            <p>
              All software, models, and technology associated with the Platform are
              the exclusive property of The BNIC Network LLC, including:
            </p>
            <ul>
              <li>financial algorithms</li>
              <li>analytical formulas</li>
              <li>software code</li>
              <li>interface design</li>
              <li>trademarks and branding</li>
            </ul>
            <p>Users receive a limited, non-transferable license to use the Platform.</p>
            <p>Users may not:</p>
            <ul>
              <li>copy or reproduce the software</li>
              <li>reverse engineer the platform</li>
              <li>build competing products using Platform models</li>
              <li>resell access to the Platform</li>
            </ul>

            <h2>15. Acceptable Use</h2>
            <p>Users agree not to:</p>
            <ul>
              <li>attempt to hack or disrupt the Platform</li>
              <li>scrape data from the Platform</li>
              <li>impersonate other users</li>
              <li>violate securities laws</li>
              <li>use the Platform to promote fraudulent investments</li>
            </ul>
            <p>Violations may result in suspension or termination of access.</p>

            <h2>16. Disclaimer of Warranties</h2>
            <p>
              The Platform is provided &quot;as is&quot; and &quot;as available.&quot;
            </p>
            <p>The Company disclaims all warranties including:</p>
            <ul>
              <li>merchantability</li>
              <li>fitness for a particular purpose</li>
              <li>accuracy of projections</li>
              <li>reliability of data</li>
            </ul>

            <h2>17. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, The BNIC Network LLC shall not
              be liable for:
            </p>
            <ul>
              <li>investment losses</li>
              <li>lost profits</li>
              <li>business interruption</li>
              <li>data inaccuracies</li>
              <li>indirect or consequential damages</li>
            </ul>
            <p>
              The Company&apos;s total liability shall not exceed the amount paid by the
              user for the Platform during the preceding twelve months.
            </p>

            <h2>18. Indemnification</h2>
            <p>
              Users agree to indemnify and hold harmless The BNIC Network LLC from
              claims arising from:
            </p>
            <ul>
              <li>their use of the Platform</li>
              <li>reliance on financial projections</li>
              <li>violations of these Terms</li>
              <li>misuse of Platform data</li>
            </ul>

            <h2>19. Arbitration and Class Action Waiver</h2>
            <p>
              Any dispute arising from these Terms shall be resolved through binding
              arbitration.
            </p>
            <p>
              Arbitration shall be conducted under the rules of the American
              Arbitration Association.
            </p>
            <p>Users waive the right to participate in class action lawsuits.</p>

            <h2>20. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Wyoming, without
              regard to conflict-of-law principles.
            </p>

            <h2>21. Changes to Terms</h2>
            <p>The Company may update these Terms at any time.</p>
            <p>
              Updated Terms will be posted on the Platform with a revised effective
              date.
            </p>
            <p>
              Continued use of the Platform constitutes acceptance of the revised
              Terms.
            </p>

            <h2>22. Contact Information</h2>
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
          <a href="#top" className={homeStyles.footerNavLink}>
            Terms of Service
          </a>
          <Link to="/privacy#top" className={homeStyles.footerNavLink}>
            Privacy Policy
          </Link>
        </nav>
        <p className={homeStyles.footerCopyright}>
          © {new Date().getFullYear()} The BNIC Network LLC. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

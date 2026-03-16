import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTier } from "../contexts/TierContext.jsx";
import styles from "./Home.module.css";

function ToolsCarousel({ tools }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % tools.length);
    }, 30000);
    return () => clearInterval(id);
  }, [tools.length]);

  const tool = tools[index];

  return (
    <div className={styles.toolsCarousel}>
      <div key={index} className={styles.toolsCarouselImage}>
        <img src={tool.image} alt={tool.title} />
      </div>
      <div className={styles.toolsCarouselContent}>
        <h3 className={styles.toolsCarouselTitle}>{tool.title}</h3>
        <p className={styles.toolsCarouselDesc}>{tool.description}</p>
      </div>
      <div className={styles.toolsCarouselDots} aria-label="Carousel navigation">
        {tools.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`${styles.toolsCarouselDot} ${i === index ? styles.toolsCarouselDotActive : ""}`}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function FadeInRow({ children, className }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? styles.fadeInVisible : styles.fadeInHidden}`}
    >
      {children}
    </div>
  );
}

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: null,
    description: null,
    features: [
      "Access to REDMS",
      "Limited deal analysis",
      "Maximum 3 deal views",
    ],
    cta: "Get Started",
    href: "/login?mode=signup",
    external: false,
    highlighted: true,
  },
  {
    name: "Investor",
    price: "$39",
    period: "/month",
    description: "or $390 per year (2 months free)",
    features: [
      "10 deal views/creations per month",
      "Full deal analyzer",
      "ROI projections",
      "Proforma reports",
    ],
    cta: "Get Started",
    href: "/login?mode=signup",
    external: false,
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    description: "or $990 per year (2 months free)",
    features: [
      "30 deal views/creations per month",
      "Full deal analyzer",
      "ROI projections",
      "Proforma reports",
      "Deal sharing tools",
    ],
    cta: "Get Started",
    href: "/login?mode=signup",
    external: false,
    highlighted: false,
  },
  {
    name: "Wholesaler",
    price: "$149",
    period: "/month",
    description: "or $1,490 per year (2 months free)",
    features: [
      "60 deal views/creations per month",
      "Pro level features",
      "Wholesale deal analysis tools",
    ],
    cta: "Get Started",
    href: "/login?mode=signup",
    external: false,
    highlighted: false,
  },
  {
    name: "Client",
    price: "Included",
    period: null,
    description: null,
    features: [
      "Unlimited analyzed deal views",
      "Full deal analyzer",
      "ROI projections",
      "Proforma reports",
      "Access to all The BNIC Network managed deals",
      "Direct investor opportunities",
    ],
    cta: "Contact Us",
    href: "https://bnic-realestate.vercel.app/#client-fee-structure",
    external: true,
    highlighted: false,
  },
];

const TOOLS = [
  {
    title: "Flip Analysis",
    description: "Evaluate short-term flip opportunities with projected resale value, renovation costs, and investor profit.",
    image: "/assets/REDMS%20Screenshot%2010.png",
  },
  {
    title: "Buy & Hold Analysis",
    description: "Model rental income, operating expenses, and cash flow for long-term rental investments.",
    image: "/assets/REDMS%20Screenshot%2012.png",
  },
  {
    title: "30-Year Investment Projection",
    description: "Extended financial projections including rental growth, mortgage amortization, and equity accumulation.",
    image: "/assets/REDMS%20Screenshot%2013.png",
  },
  {
    title: "Investor Proforma Reports",
    description: "Professional-grade reports summarizing investment analysis for sharing and documentation.",
    image: "/assets/Proforma.png",
  },
];

const SECTION_NAV_LINKS = [
  { label: "Home", id: "top" },
  { label: "The Problem", id: "problem" },
  { label: "REDMS Platform", id: "platform" },
  { label: "How REDMS is Used", id: "three-ways" },
  { label: "Professional Tools", id: "professional-tools" },
  { label: "Decision-Making", id: "decision-making" },
  { label: "Pricing", id: "pricing" },
  { label: "Who Uses REDMS", id: "who-uses" },
];

const HEADER_HEIGHT = 80;
const SECTION_TOP_PADDING = 64;

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    const rect = el.getBoundingClientRect();
    const scrollTop = window.scrollY ?? document.documentElement.scrollTop;
    const targetY = rect.top + scrollTop - (HEADER_HEIGHT - SECTION_TOP_PADDING);
    window.scrollTo({ top: targetY, behavior: "smooth" });
  }
}

function SectionNav({ className }) {
  return (
    <nav className={className} aria-label="Page sections">
      {SECTION_NAV_LINKS.map(({ label, id }) => (
        <a
          key={id}
          href={`#${id}`}
          className={styles.hdrNavLink}
          onClick={(e) => {
            e.preventDefault();
            scrollToSection(id);
            window.history.pushState(null, "", `#${id}`);
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

export default function Home() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const { hasWholesalerModule, loading: tierLoading } = useTier();
  const location = useLocation();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  const showWholesalerLink = hasWholesalerModule || isAdmin;

  useEffect(() => {
    const hash = location.hash.slice(1);
    if (hash) {
      const timer = setTimeout(() => scrollToSection(hash), 100);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

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

  return (
    <div id="top" className={styles.page}>
      <header className={styles.hdr}>
        <div className={styles.hdrLeft}>
          <Link to="/">
            <img src="/logo.png" alt="" className={styles.hdrLogo} aria-hidden />
          </Link>
          <span className={styles.hdrTitle}>REDMS</span>
        </div>
        <div className={styles.hdrRight}>
          <SectionNav className={`${styles.hdrNav} ${styles.hdrSectionNav}`} />
          {loading || (user && tierLoading) ? (
            <span className={styles.hdrNavLink}>Loading…</span>
          ) : user ? (
            <div className={styles.hdrAccountWrap} ref={accountRef}>
              <button
                type="button"
                className={styles.hdrAccountBtn}
                onClick={() => setAccountOpen((o) => !o)}
                aria-expanded={accountOpen}
                aria-haspopup="true"
              >
                Account
              </button>
              {accountOpen && (
                <div className={styles.hdrDropdown}>
                  <Link to="/profile" className={styles.hdrDropdownLink} onClick={() => setAccountOpen(false)}>
                    Profile
                  </Link>
                  <Link to="/investor" className={styles.hdrDropdownLink} onClick={() => setAccountOpen(false)}>
                    Investor
                  </Link>
                  {showWholesalerLink && (
                    <Link to="/wholesaler" className={styles.hdrDropdownLink} onClick={() => setAccountOpen(false)}>
                      Wholesaler
                    </Link>
                  )}
                  {isAdmin && (
                    <Link to="/admin" className={styles.hdrDropdownLink} onClick={() => setAccountOpen(false)}>
                      Admin
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => { setAccountOpen(false); signOut(); }}
                    className={styles.hdrDropdownSignout}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <nav className={styles.hdrNav} aria-label="Account">
              <Link to="/login" className={styles.hdrBtn}>
                Sign In
              </Link>
              <Link to="/demo" className={styles.hdrBtn}>
                Try Demo
              </Link>
              <Link to="/login?mode=signup" className={styles.hdrBtn}>
                Create Free Account
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main className={styles.main}>
          {/* Section 1: Hero */}
          <section className={styles.hero}>
            <div className={styles.heroInner}>
              <div className={styles.heroContent}>
                <h1 className={styles.heroHeadline}>
                  Real Estate Investing Starts With Risk Management
                </h1>
                <p className={styles.heroSubheadline}>
                  The Real Estate Deal Management System (REDMS) is a professional
                  real estate underwriting and deal management platform designed
                  to help investors manage risk, evaluate opportunities with
                  disciplined financial modeling, and make informed investment
                  decisions.
                </p>
                <p className={styles.heroSupporting}>
                  REDMS allows investors, wholesalers, and real estate
                  professionals to analyze deals, compare investment strategies,
                  and generate professional proforma reports in minutes.
                </p>
                <div className={styles.heroCtas}>
                  <Link to="/login?mode=signup" className={styles.ctaPrimary}>
                    Create Free Account
                  </Link>
                  <Link to="/demo" className={styles.ctaSecondary}>
                    Try Demo
                  </Link>
                  <Link to="/login" className={styles.ctaSecondary}>
                    Sign In
                  </Link>
                </div>
                <p className={styles.heroNote}>No credit card required. Try the demo first.</p>
              </div>
              <div className={styles.heroImages}>
                <img
                  src="/assets/REDMS%20Screenshot%201.png"
                  alt="REDMS deal analysis interface"
                />
                <img
                  src="/assets/REDMS%20Screenshot%209.png"
                  alt="REDMS investment analysis"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Problem */}
          <section id="problem" className={`${styles.section} ${styles.problemSection}`}>
            <div className={styles.container}>
              <h2 className={styles.problemTitle}>
                The Problem Most Real Estate Investors Face
              </h2>
              <div className={styles.problemInner}>
                <div className={styles.problemContent}>
                <p className={styles.sectionText}>
                  Many real estate deals fail not because investors lack opportunity, but because they lack a disciplined underwriting process to evaluate risk before committing capital.
                </p>
                <p className={styles.sectionText}>
                  Real estate investing involves multiple variables—purchase price, renovation costs, financing terms, operating expenses, rental income, and market conditions. When these factors are not analyzed correctly, even a deal that looks promising on the surface can quickly turn into a poor investment.
                </p>
                <p className={styles.sectionText}>
                  Many investors lose money because they:
                </p>
                <ul className={styles.problemBulletList}>
                  <li>underestimate renovation costs</li>
                  <li>overestimate rental income</li>
                  <li>ignore financing costs and loan structure</li>
                  <li>rely on spreadsheets that are difficult to maintain</li>
                  <li>fail to evaluate multiple investment scenarios</li>
                  <li>lack a disciplined underwriting process</li>
                </ul>
                <p className={styles.sectionText}>
                  Without a structured system for evaluating deals, investors often rely on rough estimates or incomplete analysis. This increases the risk of making decisions based on assumptions rather than data.
                </p>
                <p className={styles.sectionText}>
                  Professional real estate investors approach deals differently. They use structured underwriting models to evaluate opportunities, stress-test assumptions, and determine whether a deal meets their investment criteria before moving forward.
                </p>
                <p className={styles.sectionText}>
                  <strong>REDMS</strong> provides that structured underwriting system.
                </p>
                <p className={styles.sectionText}>
                  The platform helps investors manage risk by allowing them to analyze deals quickly, evaluate multiple investment strategies, and understand the true financial performance of a property before committing capital.
                </p>
                </div>
                <div className={styles.problemImages}>
                  <img
                    src="/assets/Real%20estate%20investor%20at%20work.png"
                    alt="Real estate investor at work"
                  />
                  <img
                    src="/assets/REDMS%20Screenshot%2010.png"
                    alt="REDMS deal analysis"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Platform */}
          <section id="platform" className={`${styles.section} ${styles.platformSection}`}>
            <h2 className={styles.sectionTitle}>
              REDMS: A Real Estate Risk Management Platform
            </h2>
            <div className={styles.container}>
              <div className={styles.platformContent}>
                <p className={styles.sectionText}>
                  Real estate investing is fundamentally about managing risk. Every investment decision involves assumptions about purchase price, renovation costs, financing terms, rental income, operating expenses, and long-term market performance. When those assumptions are inaccurate, even a promising property can quickly become a poor investment.
                </p>
                <p className={styles.sectionText}>
                  The Real Estate Deal Management System (REDMS) was built to give investors a structured way to evaluate opportunities, model investment scenarios, and make disciplined decisions before committing capital. Instead of relying on spreadsheets and rough estimates, REDMS provides a professional underwriting framework that allows investors to quickly understand the financial performance of a property under multiple investment strategies.
                </p>
                <p className={styles.sectionText}>
                  With REDMS, investors can:
                </p>
                <div className={styles.platformFeatureGrid}>
                  <div className={styles.featureCard}>
                    <h3 className={styles.featureCardTitle}>Deal Evaluation</h3>
                    <p className={styles.featureCardText}>
                      Analyze potential investment opportunities quickly using structured financial models.
                    </p>
                  </div>
                  <div className={styles.featureCard}>
                    <h3 className={styles.featureCardTitle}>Capital Stack Analysis</h3>
                    <p className={styles.featureCardText}>
                      Understand acquisition costs, financing structure, and total investment requirements.
                    </p>
                  </div>
                  <div className={styles.featureCard}>
                    <h3 className={styles.featureCardTitle}>Investment Strategy Comparison</h3>
                    <p className={styles.featureCardText}>
                      Compare flip, rental, and resale strategies before committing capital.
                    </p>
                  </div>
                  <div className={styles.featureCard}>
                    <h3 className={styles.featureCardTitle}>Professional Proforma Reports</h3>
                    <p className={styles.featureCardText}>
                      Generate clear reports for partners, lenders, and investors.
                    </p>
                  </div>
                  <div className={styles.featureCard}>
                    <h3 className={styles.featureCardTitle}>Deal Management</h3>
                    <p className={styles.featureCardText}>
                      Track investment opportunities and manage deals from analysis to acquisition.
                    </p>
                  </div>
                </div>
                <p className={styles.sectionText}>
                  REDMS combines real estate underwriting tools with deal management capabilities, allowing investors to move from opportunity identification to investment decision with greater clarity and confidence.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Three Ways */}
          <section id="three-ways" className={`${styles.section} ${styles.sectionAlt}`}>
            <h2 className={styles.sectionTitle}>
              Three Ways Investors Use REDMS
            </h2>
            <div className={styles.container}>
              <FadeInRow className={styles.threeWaysRow}>
                <div className={styles.threeWaysRowImage}>
                  <img src="/assets/REDMS%20Screenshot%201.png" alt="REDMS Detroit investment opportunities" />
                </div>
                <div className={styles.threeWaysRowText}>
                  <h3 className={styles.threeWaysRowTitle}>
                    Review Fully Managed Investment Opportunities (Detroit)
                  </h3>
                  <p className={styles.threeWaysRowDesc}>
                    Investors can review opportunities sourced and managed by The
                    BNIC Network&apos;s real estate investment management company.
                    These opportunities focus on Detroit real estate investments
                    and include <strong>full underwriting within REDMS</strong>.
                  </p>
                </div>
              </FadeInRow>
              <FadeInRow className={`${styles.threeWaysRow} ${styles.threeWaysRowAlt}`}>
                <div className={styles.threeWaysRowImage}>
                  <img src="/assets/REDMS%20Screenshot%2017.png" alt="REDMS analyze deals anywhere" />
                </div>
                <div className={styles.threeWaysRowText}>
                  <h3 className={styles.threeWaysRowTitle}>
                    Analyze Deals Anywhere in the United States
                  </h3>
                  <p className={styles.threeWaysRowDesc}>
                    Investors can analyze properties anywhere in the United States.
                    REDMS evaluates acquisition costs, renovation budgets,
                    financing assumptions, rental performance, operating
                    expenses, and long-term equity growth. Investors can <strong>change
                    the investment criteria within REDMS</strong> to match their investment
                    strategy and market conditions.
                  </p>
                </div>
              </FadeInRow>
              <FadeInRow className={styles.threeWaysRow}>
                <div className={styles.threeWaysRowImage}>
                  <img src="/assets/REDMS%20Screenshot%2024.png" alt="REDMS wholesaler underwriting" />
                </div>
                <div className={styles.threeWaysRowText}>
                  <h3 className={styles.threeWaysRowTitle}>
                    Wholesalers Presenting Deals to Investors
                  </h3>
                  <p className={styles.threeWaysRowDesc}>
                    Wholesalers can use REDMS to create professional underwriting
                    reports. REDMS helps wholesalers determine projected flip
                    profits, rental investment returns, capital stack analysis,
                    investment requirements, and long-term projections.                     The system
                    calculates the <strong>maximum contract price and wholesale assignment
                    fee</strong> that can be included while still meeting investor return
                    requirements. Wholesalers can <strong>adjust investment criteria</strong> to
                    match their buyers&apos; needs and market conditions.
                  </p>
                </div>
              </FadeInRow>
            </div>
          </section>

          {/* Section 5: Tools */}
          <section id="professional-tools" className={`${styles.section} ${styles.toolsSection}`}>
            <h2 className={styles.sectionTitle}>
              Professional Real Estate Underwriting Tools
            </h2>
            <div className={styles.container}>
              <ToolsCarousel tools={TOOLS} />
            </div>
          </section>

          {/* Section 6: Efficiency */}
          <section id="decision-making" className={`${styles.section} ${styles.sectionAlt}`}>
            <h2 className={styles.sectionTitle}>
              Designed for Efficient Decision-Making
            </h2>
            <div className={styles.container}>
              <div className={styles.efficiencyContent}>
                <p className={styles.sectionText}>
                  Real estate investors often spend hours building spreadsheets, adjusting formulas, and recalculating assumptions just to determine whether a deal is worth pursuing. This manual process slows decision-making and increases the risk of errors.
                </p>
                <p className={styles.sectionText}>
                  REDMS replaces complex spreadsheets with a structured, automated underwriting system that allows investors to evaluate opportunities quickly and confidently. Instead of spending hours building financial models, investors can input the key variables of a property and immediately see how the deal performs under multiple investment strategies.
                </p>
                <p className={styles.sectionText}>
                  By automating the financial analysis process, REDMS helps investors focus on what matters most—identifying strong opportunities and managing investment risk.
                </p>
                <p className={styles.sectionText}>
                  With REDMS, investors can:
                </p>
                <div className={styles.efficiencyFeatureGrid}>
                  <div className={styles.efficiencyCard}>
                    <div className={styles.efficiencyCardImage}>
                      <img src="/assets/Deal%20Analysis%20with%20REDMS.png" alt="Deal analysis with REDMS" />
                    </div>
                    <h3 className={styles.featureCardTitle}>Fast Deal Analysis</h3>
                    <p className={styles.featureCardText}>
                      Evaluate investment opportunities in minutes using automated underwriting models.
                    </p>
                  </div>
                  <div className={styles.efficiencyCard}>
                    <div className={styles.efficiencyCardImage}>
                      <img src="/assets/REDMS%20Screenshot%201.png" alt="REDMS strategy comparison" />
                    </div>
                    <h3 className={styles.featureCardTitle}>Strategy Comparison</h3>
                    <p className={styles.featureCardText}>
                      Instantly compare flip, rental, and resale strategies to determine the best investment approach.
                    </p>
                  </div>
                  <div className={styles.efficiencyCard}>
                    <div className={styles.efficiencyCardImage}>
                      <img src="/assets/Proforma.png" alt="Professional proforma reports" />
                    </div>
                    <h3 className={styles.featureCardTitle}>Professional Investment Reports</h3>
                    <p className={styles.featureCardText}>
                      Generate clear proforma reports to share with partners, lenders, or investors.
                    </p>
                  </div>
                  <div className={styles.efficiencyCard}>
                    <div className={styles.efficiencyCardImage}>
                      <img src="/assets/Investor%20Deal%20Selection.png" alt="Investor deal selection" />
                    </div>
                    <h3 className={styles.featureCardTitle}>Deal Management</h3>
                    <p className={styles.featureCardText}>
                      Track and organize opportunities from initial analysis to final investment decision.
                    </p>
                  </div>
                </div>
                <p className={styles.sectionText}>
                  Instead of juggling spreadsheets, documents, and separate financial tools, REDMS provides a single platform that streamlines the entire deal evaluation process. This allows investors, wholesalers, and real estate professionals to make informed decisions faster while maintaining a disciplined underwriting approach.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7: Pricing */}
          <section id="pricing" className={`${styles.section} ${styles.pricingSection}`}>
            <h2 className={styles.sectionTitle}>
              Affordable Access for Investors and Professionals
            </h2>
            <div className={styles.container}>
              <div className={styles.containerNarrow}>
              <p className={styles.sectionText}>
                REDMS provides professional real estate underwriting tools at an
                affordable price. Users can begin with the Free tier and upgrade
                as their needs grow.
              </p>
              <p className={styles.sectionText}>
                All fees paid for REDMS access are credited toward the client
                retainer fee if a user becomes a client of The BNIC Network.
                Deal views/creations beyond the monthly alloted amount can be purchased at the cost of $10 each.
              </p>
              </div>
            <div className={styles.pricingGrid}>
              {PRICING_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className={`${styles.pricingCard} ${
                    tier.highlighted ? styles.pricingCardFeatured : ""
                  }`}
                >
                  <h3 className={styles.pricingCardTitle}>{tier.name}</h3>
                  <div>
                    <span className={styles.pricingPrice}>{tier.price}</span>
                    {tier.period && (
                      <span className={styles.pricingPeriod}>{tier.period}</span>
                    )}
                  </div>
                  {tier.description && (
                    <p className={styles.pricingDescription}>
                      {tier.description}
                    </p>
                  )}
                  <ul className={styles.pricingFeatures}>
                    {tier.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  {tier.external ? (
                    <a
                      href={tier.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.pricingCta}
                    >
                      {tier.cta}
                    </a>
                  ) : (
                    <Link to={tier.href} className={styles.pricingCta}>
                      {tier.cta}
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <div className={styles.pricingCtaRow}>
              <Link to="/login?mode=signup" className={styles.ctaPrimary}>
                Create Free Account
              </Link>
              <Link to="/demo" className={styles.ctaSecondary}>
                Try Free Demo
              </Link>
            </div>
            </div>
          </section>

          {/* Section 8: Who Uses */}
          <section id="who-uses" className={`${styles.section} ${styles.sectionAlt}`}>
            <h2 className={styles.sectionTitle}>Who Uses REDMS</h2>
            <div className={styles.container}>
              <div className={styles.whoUsesContent}>
                <p className={styles.sectionText}>
                  REDMS was designed for investors and real estate professionals who want a disciplined approach to evaluating opportunities and managing investment risk. The platform provides professional underwriting tools that can be used across multiple investment strategies and markets.
                </p>
                <p className={styles.sectionText}>
                  Whether an investor is evaluating a potential flip, analyzing a rental property, or presenting a deal to other investors, REDMS provides the financial modeling tools needed to make informed decisions.
                </p>
                <h3 className={styles.whoUsesSubheading}>REDMS is used by:</h3>
                <ul className={styles.whoUsesList}>
                  <li className={styles.whoUsesItem}>
                    <div className={styles.whoUsesItemImage}>
                      <img src="/assets/Real%20Estate%20Investors%20Evaluating%20Deals.png" alt="Real estate investors evaluating deals" />
                    </div>
                    <div className={styles.whoUsesItemContent}>
                      <strong>Real Estate Investors Evaluating Deals</strong>
                      <span> Investors can analyze potential acquisitions quickly using structured underwriting models that calculate renovation budgets, financing costs, operating expenses, and projected returns before committing capital.</span>
                    </div>
                  </li>
                  <li className={styles.whoUsesItem}>
                    <div className={styles.whoUsesItemImage}>
                      <img src="/assets/Rental%20Property%20Investors.png" alt="Rental property investors" />
                    </div>
                    <div className={styles.whoUsesItemContent}>
                      <strong>Rental Property Investors</strong>
                      <span> Buy-and-hold investors can evaluate long-term rental performance, estimate cash flow, and review multi-year projections to understand the long-term financial performance of a property.</span>
                    </div>
                  </li>
                  <li className={styles.whoUsesItem}>
                    <div className={styles.whoUsesItemImage}>
                      <img src="/assets/Wholesalers.png" alt="Wholesalers" />
                    </div>
                    <div className={styles.whoUsesItemContent}>
                      <strong>Wholesalers</strong>
                      <span> Wholesalers can analyze potential deals from both their perspective and the investor&apos;s perspective. REDMS helps determine the maximum contract price and assignment fee that can be included while still meeting investor return requirements.</span>
                    </div>
                  </li>
                  <li className={styles.whoUsesItem}>
                    <div className={styles.whoUsesItemImage}>
                      <img src="/assets/Real%20Estate%20Professionals.png" alt="Real estate professionals" />
                    </div>
                    <div className={styles.whoUsesItemContent}>
                      <strong>Real Estate Professionals</strong>
                      <span> Agents, advisors, and investment managers can use REDMS to evaluate opportunities, generate professional investment reports, and present deals clearly to clients and partners.</span>
                    </div>
                  </li>
                  <li className={styles.whoUsesItem}>
                    <div className={styles.whoUsesItemImage}>
                      <img src="/assets/Investors.png" alt="Investors interested in Detroit investment opportunities" />
                    </div>
                    <div className={styles.whoUsesItemContent}>
                      <strong>Investors Interested in Detroit Investment Opportunities</strong>
                      <span> Investors interested in turnkey opportunities can review properties sourced and managed by The BNIC Network&apos;s real estate investment management company, which focuses on Detroit investment properties.</span>
                    </div>
                  </li>
                </ul>
                <p className={styles.sectionText}>
                  By combining real estate underwriting tools with deal management capabilities, REDMS provides a platform that supports investors from initial opportunity analysis through final investment decision.
                </p>
              </div>
            </div>
          </section>

          {/* Section 9: Final CTA */}
          <section className={styles.section}>
            <div className={styles.finalCta}>
              <h2 className={styles.sectionTitle}>
                Start Managing Investment Risk Today
              </h2>
              <p className={styles.finalCtaText}>
                Create a free REDMS account and begin analyzing real estate
                opportunities using professional risk management tools.
              </p>
              <div className={styles.finalCtaButtons}>
                <Link to="/login?mode=signup" className={styles.ctaPrimary}>
                  Create Free Account
                </Link>
                <Link to="/demo" className={styles.ctaSecondary}>
                  Free Demo
                </Link>
              </div>
            </div>
          </section>
      </main>

      <footer className={styles.footer}>
        <nav className={styles.footerNav} aria-label="Page sections">
          {SECTION_NAV_LINKS.map(({ label, id }) => (
            <a
              key={id}
              href={`#${id}`}
              className={styles.footerNavLink}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(id);
                window.history.pushState(null, "", `#${id}`);
              }}
            >
              {label}
            </a>
          ))}
          <Link to="/demo" className={styles.footerNavLink}>
            Try Demo
          </Link>
          <Link to="/terms#top" className={styles.footerNavLink}>
            Terms of Service
          </Link>
          <Link to="/privacy#top" className={styles.footerNavLink}>
            Privacy Policy
          </Link>
        </nav>
        <p className={styles.footerCopyright}>
          © {new Date().getFullYear()} The BNIC Network LLC. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

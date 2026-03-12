import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  calc,
  DEFAULT_INPUT,
  sanitizeInput,
  mergeStored,
} from "../logic";
import { useConfig } from "../contexts/ConfigContext.jsx";
import {
  PropertyBrief,
  DealMetrics,
  DealSidebar,
  FlipTab,
  BuyAndHoldTab,
  RetailInvestorTab,
  ProjectionsTab,
  CpinTab,
  PropertySearch,
  DealInterestActions,
} from "../components";
import { generateDealPDF, generateRetailInvestorPDF } from "../utils/pdfExport.js";
import styles from "../REDMS.module.css";

const DEMO_DEAL_ADDRESS = {
  street: "17917 Mackay St",
  city: "Detroit",
  state: "MI",
  zipCode: "48212",
};

function formatAddress(inp) {
  if (inp.street != null || inp.city != null || inp.state != null || inp.zipCode != null) {
    const line2 = [inp.city, inp.state, inp.zipCode].filter(Boolean).join(", ");
    return [inp.street, line2].filter(Boolean).join(", ") || "—";
  }
  return inp.address ?? "—";
}

export default function Demo() {
  const { config } = useConfig();
  const [inp, setInp] = useState(() => ({ ...DEFAULT_INPUT }));
  const [tab, setTab] = useState("flip");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPropertySearch, setShowPropertySearch] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [retailPdfExporting, setRetailPdfExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [demoDealId, setDemoDealId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/demo?type=deal")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error && !data.deal) {
          setError(data.error);
          setLoading(false);
          return;
        }
        const base = { ...DEFAULT_INPUT, ...data.deal };
        setInp(mergeStored(base, data.deal));
        setDemoDealId(data.dealId);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message || "Failed to load demo deal");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const inpForCalc = useMemo(() => sanitizeInput(inp), [inp]);
  const r = useMemo(() => calc(inpForCalc, config), [inpForCalc, config]);
  const maxTpc = config?.maxTpc ?? 60000;
  const costPct = Math.min((r.bhTotalInvestment / maxTpc) * 100, 100);
  const costClr = r.bhTotalInvestment <= maxTpc ? "var(--green)" : "var(--red)";
  const dc = r.isDeal ? "deal" : inp.offerPrice > 0 ? "nodeal" : "pending";
  const badgeText = r.isDeal ? "✓ DEAL" : inp.offerPrice > 0 ? "✗ NO DEAL" : "PENDING";

  const handleExportPDF = async () => {
    setPdfExporting(true);
    try {
      await generateDealPDF(inp, r, formatAddress, true, false);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setPdfExporting(false);
    }
  };

  const handleExportRetailPDF = async () => {
    setRetailPdfExporting(true);
    try {
      await generateRetailInvestorPDF(inp, r, formatAddress, true, false);
    } catch (e) {
      console.error("Retail PDF export failed", e);
    } finally {
      setRetailPdfExporting(false);
    }
  };

  const handleViewDeal = () => {
    setShowPropertySearch(false);
  };

  const savedDeals = useMemo(() => {
    if (!demoDealId) return [];
    return [{
      id: demoDealId,
      dealName: formatAddress(inp),
      isShared: true,
    }];
  }, [demoDealId, inp]);

  if (loading) {
    return (
      <div className={styles.app}>
        <header className={styles.hdr}>
          <div className={styles["hdr-left"]}>
            <Link to="/">
              <img src="/logo.png" alt="" className={styles["hdr-logo"]} aria-hidden />
            </Link>
            <div className={styles["hdr-title"]}>REDMS</div>
            <div className={styles["hdr-sub"]}>Real Estate Deal Management System</div>
          </div>
          <div className={styles["hdr-right"]}>
            <Link to="/login?mode=signup" className={styles["hdr-demo-cta"]}>
              Create a Free Account
            </Link>
          </div>
        </header>
        <main className={styles.main} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className={styles.loadingSpinnerLarge} />
          <p style={{ marginLeft: "1rem" }}>Loading demo deal…</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.app}>
        <header className={styles.hdr}>
          <div className={styles["hdr-left"]}>
            <Link to="/">
              <img src="/logo.png" alt="" className={styles["hdr-logo"]} aria-hidden />
            </Link>
            <div className={styles["hdr-title"]}>REDMS</div>
            <div className={styles["hdr-sub"]}>Real Estate Deal Management System</div>
          </div>
          <div className={styles["hdr-right"]}>
            <Link to="/login?mode=signup" className={styles["hdr-demo-cta"]}>
              Create a Free Account
            </Link>
          </div>
        </header>
        <main className={styles.main} style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "var(--red)" }}>{error}</p>
          <Link to="/" style={{ marginTop: "1rem", display: "inline-block", color: "var(--amber)" }}>
            Return to Home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <header className={styles.hdr}>
        <div className={styles["hdr-left"]}>
          <Link to="/">
            <img src="/logo.png" alt="" className={styles["hdr-logo"]} aria-hidden />
          </Link>
          <div className={styles["hdr-title"]}>REDMS</div>
          <div className={styles["hdr-sub"]}>Real Estate Deal Management System</div>
        </div>
        <div className={styles["hdr-right"]}>
          {!showPropertySearch && (
            <>
              <button
                type="button"
                className={styles["hdr-pdf-btn"]}
                onClick={handleExportPDF}
                disabled={pdfExporting || retailPdfExporting}
                title="Download deal summary as PDF"
              >
                {pdfExporting ? "Generating…" : "Investor Printout"}
              </button>
              <button
                type="button"
                className={styles["hdr-pdf-btn"]}
                onClick={handleExportRetailPDF}
                disabled={pdfExporting || retailPdfExporting}
                title="Download retail investor PDF"
              >
                {retailPdfExporting ? "Generating…" : "Retail Investor Printout"}
              </button>
            </>
          )}
          <div
            className={`${styles.badge} ${styles["badge-" + dc]}`}
            aria-live="polite"
            role="status"
          >
            {badgeText}
          </div>
          <Link to="/login?mode=signup" className={styles["hdr-demo-cta"]}>
            Create a Free Account
          </Link>
        </div>
      </header>

      <button
        type="button"
        className={styles["sidebar-toggle"]}
        onClick={() => setSidebarCollapsed((c) => !c)}
        aria-expanded={!sidebarCollapsed}
        aria-controls="redms-sidebar"
      >
        {sidebarCollapsed ? "Show inputs" : "Hide inputs"}
      </button>

      <div className={styles.main}>
        <DealSidebar
          isAdmin={false}
          canSaveDeal={false}
          isClient={true}
          isFreeTier={true}
          usageCount={0}
          usageLimit={3}
          sidebarCollapsed={sidebarCollapsed}
          currentDealId={demoDealId}
          currentDealIsShared={true}
          handleDealSelect={() => {}}
          handleDeleteDeal={() => {}}
          handleLoadDeal={() => {}}
          handleRemoveFavorite={() => {}}
          savedDeals={savedDeals}
          userFavorites={[]}
          favoritesLoading={false}
          refreshFavorites={() => {}}
          newSharedDeals={[]}
          onDismissNewDeals={() => {}}
          inp={inp}
          upd={() => {}}
          setRehabLevel={() => {}}
          r={r}
          costClr={costClr}
          costPct={costPct}
          maxTpc={maxTpc}
          handleSaveDeal={() => {}}
          saveInProgress={false}
          refreshDeals={() => {}}
          savedDealsLoading={false}
          onOpenSearch={() => setShowPropertySearch(true)}
          dealParamsLevel={null}
          config={config}
          refreshConfig={() => {}}
          onSaveUserConfig={null}
        />

        <main className={styles.output}>
          {showPropertySearch ? (
            <PropertySearch
              userId={null}
              isAdmin={false}
              isClient={false}
              isDemo={true}
              demoDealAddress={DEMO_DEAL_ADDRESS}
              savedDeals={savedDeals}
              onImportProperty={undefined}
              onViewDeal={handleViewDeal}
              onCancel={() => setShowPropertySearch(false)}
            />
          ) : (
            <>
              <DealInterestActions isDemo />
              <div className={styles["proforma-disclaimer"]} role="status">
                <strong>Disclaimer:</strong> The proforma shown is based on assumptions (such as Section 8 Rent, Rehab Level, New Property Taxes, and Landlord&apos;s Insurance) that have not been verified by The BNIC Network LLC. We verify all assumptions for our Clients&apos; deals as we move through the deal process.
              </div>
              <DealMetrics inp={inp} r={r} maxTpc={maxTpc} />
              <div>
                <div className={styles.tabs} role="tablist" aria-label="Deal views">
                  {[
                    ["flip", "Purchase & Flip"],
                    ["bh", "Buy & Hold"],
                    ["proj", "30-Yr Projection"],
                    ["retail", "Retail Investor"],
                    ["cpin", "CPIN / LP Offering"],
                  ].map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      role="tab"
                      aria-selected={tab === k}
                      aria-controls={`panel-${k}`}
                      id={`tab-${k}`}
                      className={`${styles.tab} ${tab === k ? styles.on : ""}`}
                      onClick={() => setTab(k)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                {tab === "flip" && <FlipTab r={r} inp={inp} isFreeTier={false} />}
                {tab === "bh" && <BuyAndHoldTab r={r} inp={inp} upd={() => {}} maxTpc={maxTpc} isFreeTier={false} readOnly={true} />}
                {tab === "retail" && <RetailInvestorTab r={r} inp={inp} upd={() => {}} isFreeTier={false} readOnly={true} />}
                {tab === "proj" && <ProjectionsTab r={r} isFreeTier={false} />}
                {tab === "cpin" && <CpinTab inp={inp} formatAddress={formatAddress} isFreeTier={false} />}
              </div>
              <PropertyBrief inp={inp} r={r} formatAddress={formatAddress} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

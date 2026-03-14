import { useState, useMemo, useEffect, useCallback } from "react";
import {
  calcWholesaler,
  mergeWholesalerConfig,
  DEFAULT_INPUT,
  REHAB_COST,
  REHAB_TIME,
  formatCurrency,
  sanitizeInput,
  clampNumber,
  RANGES,
  mergeStored,
} from "../logic";
import { useNavigate, Link } from "react-router-dom";
import { loadWholesalerDeals, loadWholesalerDeal, saveWholesalerDeal, deleteWholesalerDeal } from "../logic/wholesalerDealStorage.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTier } from "../contexts/TierContext.jsx";
import { useConfig } from "../contexts/ConfigContext.jsx";
import { saveUserConfig } from "../logic/userConfigStorage.js";
import {
  PropertyBrief,
  DealMetrics,
  DealSidebar,
  WholesalerTab,
  WholesalerFlipTab,
  BuyAndHoldTab,
  RetailInvestorTab,
  ProjectionsTab,
  AdminDropdown,
  WholesalerModuleDropdown,
} from "../components";
import { generateWholesalerProformaPDF, generateWholesalerReportPDF } from "../utils/wholesalerPdfExport.js";
import styles from "../REDMS.module.css";

const $ = formatCurrency;

function formatAddress(inp) {
  if (inp.street != null || inp.city != null || inp.state != null || inp.zipCode != null) {
    const line2 = [inp.city, inp.state, inp.zipCode].filter(Boolean).join(", ");
    return [inp.street, line2].filter(Boolean).join(", ") || "—";
  }
  return inp.address ?? "—";
}

export default function Wholesaler() {
  const { user, isAdmin, isWholesaler, signOut } = useAuth();
  const { tier, dealParamsLevel, usageCount, usageLimit, isFreeTier, canSaveDeal, atOverageWarningThreshold } = useTier();
  const { config, refreshConfig } = useConfig();
  const navigate = useNavigate();
  const [inp, setInp] = useState(() => ({ ...DEFAULT_INPUT }));
  const [riskOverrides, setRiskOverrides] = useState({});
  const [tab, setTab] = useState("wholesaler");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [savedDeals, setSavedDeals] = useState([]);
  const [savedDealsLoading, setSavedDealsLoading] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [currentDealId, setCurrentDealId] = useState(null);
  const [proformaExporting, setProformaExporting] = useState(false);
  const [reportExporting, setReportExporting] = useState(false);

  const mergedConfig = useMemo(
    () => mergeWholesalerConfig(config, riskOverrides),
    [config, riskOverrides]
  );

  const refreshDeals = useCallback(async () => {
    if (!user?.uid) return;
    setSavedDealsLoading(true);
    try {
      const list = await loadWholesalerDeals(user.uid);
      list.sort((a, b) => (a.dealName || "").localeCompare(b.dealName || "", undefined, { sensitivity: "base" }));
      setSavedDeals(list);
    } catch (e) {
      console.error("Failed to load deals", e);
    } finally {
      setSavedDealsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    refreshDeals();
  }, [refreshDeals]);

  const handleLoadDeal = async (id) => {
    try {
      const loaded = await loadWholesalerDeal(id);
      if (!loaded) return;
      const { riskOverrides: ro, ...dealData } = loaded;
      const base = { ...DEFAULT_INPUT, ...dealData };
      setInp(mergeStored(base, dealData));
      setRiskOverrides(ro || {});
      setCurrentDealId(id);
    } catch (e) {
      console.error("Failed to load deal", e);
    }
  };

  const handleSaveDeal = async () => {
    if (!user?.uid) return;
    setSaveInProgress(true);
    setSaveError(null);
    try {
      const dealName = formatAddress(inp) || "Untitled";
      const payload = { ...inp, dealName, riskOverrides };
      const id = await saveWholesalerDeal(payload, currentDealId, user.uid);
      setCurrentDealId(id);
      // Optimistic update: add new deal to list immediately (in case query is slow or index building)
      if (!currentDealId) {
        setSavedDeals((prev) => {
          const newDeal = { id, dealName, updatedAt: null };
          const existing = prev.filter((d) => d.id !== id);
          const merged = [newDeal, ...existing];
          merged.sort((a, b) => (a.dealName || "").localeCompare(b.dealName || "", undefined, { sensitivity: "base" }));
          return merged;
        });
      }
      await refreshDeals();
    } catch (e) {
      console.error("Failed to save deal", e);
      setSaveError(e.message || "Failed to save deal");
    } finally {
      setSaveInProgress(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const handleLoadBlank = () => {
    setInp(sanitizeInput({ ...DEFAULT_INPUT }));
    setRiskOverrides({});
    setCurrentDealId(null);
  };

  const handleDeleteDeal = async (id, e) => {
    e?.stopPropagation?.();
    if (!id) return;
    try {
      await deleteWholesalerDeal(id);
      if (currentDealId === id) {
        handleLoadBlank();
      }
      await refreshDeals();
    } catch (e) {
      console.error("Failed to delete deal", e);
    }
  };

  const handleDealSelect = (e) => {
    const value = e.target.value;
    if (value === "") {
      handleLoadBlank();
    } else {
      handleLoadDeal(value);
    }
  };

  const handleExportProforma = async () => {
    setProformaExporting(true);
    try {
      await generateWholesalerProformaPDF(inp, r, formatAddress);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setProformaExporting(false);
    }
  };

  const handleExportReport = async () => {
    setReportExporting(true);
    try {
      await generateWholesalerReportPDF(inp, r, formatAddress);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setReportExporting(false);
    }
  };

  const upd = (k, v) => {
    if (RANGES[k] != null && typeof v === "number") {
      const { value } = clampNumber(v, k);
      v = value;
    }
    setInp((prev) => ({ ...prev, [k]: v }));
  };

  const setRehabLevel = (lvl) => {
    setInp((prev) => ({
      ...prev,
      rehabLevel: lvl,
      rehabCost: REHAB_COST[lvl],
      rehabMonths: REHAB_TIME[lvl],
    }));
  };

  const inpForCalc = useMemo(() => sanitizeInput(inp), [inp]);
  const r = useMemo(() => calcWholesaler(inpForCalc, mergedConfig), [inpForCalc, mergedConfig]);

  const maxTpc = mergedConfig?.maxTpc ?? 60000;
  const costPct = Math.min((r.bhTotalInvestment / maxTpc) * 100, 100);
  const costClr = r.bhTotalInvestment <= maxTpc ? "var(--green)" : "var(--red)";
  const dc = r.isWholesalerDeal ? "deal" : inp.offerPrice > 0 ? "nodeal" : "pending";
  const badgeText = r.isWholesalerDeal ? "✓ DEAL" : inp.offerPrice > 0 ? "✗ NO DEAL" : "PENDING";

  return (
    <div className={styles.app}>
      <header className={styles.hdr}>
        <div className={styles["hdr-left"]}>
          <img src="/logo.png" alt="" className={styles["hdr-logo"]} aria-hidden />
          <div className={styles["hdr-title"]}>REDMS Wholesaler</div>
        </div>
        <div className={styles["hdr-right"]}>
          <button
            type="button"
            className={styles["hdr-pdf-btn"]}
            onClick={handleExportProforma}
            disabled={proformaExporting || reportExporting || !currentDealId}
            title={!currentDealId ? "Save a deal first" : "Download proforma for buyer"}
          >
            {proformaExporting ? "Generating…" : "Export Proforma"}
          </button>
          <button
            type="button"
            className={styles["hdr-pdf-btn"]}
            onClick={handleExportReport}
            disabled={proformaExporting || reportExporting || !currentDealId}
            title={!currentDealId ? "Save a deal first" : "Download internal report"}
          >
            {reportExporting ? "Generating…" : "Wholesaler Report"}
          </button>
          <div
            className={`${styles.badge} ${styles["badge-" + dc]}`}
            aria-live="polite"
            aria-atomic="true"
            role="status"
          >
            {badgeText}
          </div>
          <nav className={styles["hdr-nav"]} aria-label="Account">
            {!isAdmin && (
              <Link to="/profile" className={styles["hdr-nav-link"]}>Profile</Link>
            )}
            {isAdmin ? (
              <AdminDropdown email={user?.email} />
            ) : isWholesaler ? (
              <>
                <WholesalerModuleDropdown />
                <span className={styles["hdr-email"]} title={user?.email}>{user?.email ?? ""}</span>
              </>
            ) : (
              <span className={styles["hdr-email"]} title={user?.email}>{user?.email ?? ""}</span>
            )}
            <button
              type="button"
              className={styles["hdr-signout"]}
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </nav>
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
          isAdmin={isAdmin}
          canSaveDeal={canSaveDeal}
          isClient={false}
          isFreeTier={isFreeTier}
          usageCount={usageCount}
          usageLimit={usageLimit}
          atOverageWarningThreshold={atOverageWarningThreshold}
          wholesaler={true}
          sidebarCollapsed={sidebarCollapsed}
          currentDealId={currentDealId}
          currentDealIsShared={false}
          handleDealSelect={handleDealSelect}
          handleDeleteDeal={handleDeleteDeal}
          handleLoadDeal={handleLoadDeal}
          savedDeals={savedDeals}
          inp={inp}
          upd={upd}
          setRehabLevel={setRehabLevel}
          r={r}
          costClr={costClr}
          costPct={costPct}
          maxTpc={maxTpc}
          handleSaveDeal={handleSaveDeal}
          saveInProgress={saveInProgress}
          saveError={saveError}
          refreshDeals={refreshDeals}
          savedDealsLoading={savedDealsLoading}
          riskOverrides={riskOverrides}
          onRiskOverridesChange={setRiskOverrides}
          dealParamsLevel={dealParamsLevel}
          config={config}
          refreshConfig={refreshConfig}
          onSaveUserConfig={user && (dealParamsLevel === "full" || dealParamsLevel === "limited") ? (overrides) => saveUserConfig(user.uid, overrides, dealParamsLevel) : null}
        />

        <main className={styles.output}>
          <>
            {!isAdmin && currentDealId && (
              <div className={styles["proforma-disclaimer"]} role="status">
                <strong>Disclaimer:</strong> The proforma shown is based on assumptions (such as Section 8 Rent, Rehab Level, New Property Taxes, and Landlord&apos;s Insurance) that have not been verified by The BNIC Network LLC. Please verify all assumptions before making investment decisions.
              </div>
            )}
            <DealMetrics inp={inp} r={r} maxTpc={maxTpc} />

            <div>
              <div className={styles.tabs} role="tablist" aria-label="Deal views">
                {[
                  ["wholesaler", "Wholesaler"],
                  ["flip", "Purchase & Flip"],
                  ["bh", "Buy & Hold"],
                  ["proj", "30-Yr Projection"],
                  ["retail", "Retail Investor"],
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

              {tab === "wholesaler" && <WholesalerTab r={r} inp={inp} />}
              {tab === "flip" && <WholesalerFlipTab r={r} inp={inp} />}
              {tab === "bh" && <BuyAndHoldTab r={r} inp={inp} upd={upd} maxTpc={maxTpc} />}
              {tab === "retail" && <RetailInvestorTab r={r} inp={inp} upd={upd} />}
              {tab === "proj" && <ProjectionsTab r={r} />}
            </div>

            <PropertyBrief inp={inp} r={r} formatAddress={formatAddress} />
          </>
        </main>
      </div>
    </div>
  );
}

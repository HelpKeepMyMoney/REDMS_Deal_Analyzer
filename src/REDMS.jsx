import { useState, useMemo, useEffect, useCallback } from "react";
import {
  calc,
  DEFAULT_INPUT,
  REHAB_COST,
  REHAB_TIME,
  formatCurrency,
  sanitizeInput,
  loadStoredInput,
  saveStoredInput,
  clampNumber,
  RANGES,
  estimateMonthlyRent,
  mergeStored,
} from "./logic";
import { useNavigate, Link } from "react-router-dom";
import { loadDeals, loadDeal, saveDeal, deleteDeal } from "./logic/firestoreStorage.js";
import { loadUserFavorites, removeFavorite } from "./logic/userFavoritesStorage.js";
import { getLastLoginAt, setLastLoginAt } from "./logic/userMetadataStorage.js";
import { createInterestApi } from "./logic/interestApi.js";
import { useAuth } from "./contexts/AuthContext.jsx";
import { useConfig } from "./contexts/ConfigContext.jsx";
import {
  PropertyBrief,
  DealMetrics,
  DealSidebar,
  FlipTab,
  BuyAndHoldTab,
  ProjectionsTab,
  CpinTab,
  PropertySearch,
  DealInterestActions,
} from "./components";
import { generateDealPDF } from "./utils/pdfExport.js";
import styles from "./REDMS.module.css";

const $ = formatCurrency;

/** Build full address from street, city, state, zipCode (or legacy address). */
export function formatAddress(inp) {
  if (inp.street != null || inp.city != null || inp.state != null || inp.zipCode != null) {
    const line2 = [inp.city, inp.state, inp.zipCode].filter(Boolean).join(", ");
    return [inp.street, line2].filter(Boolean).join(", ") || "—";
  }
  return inp.address ?? "—";
}

function getInitialInput() {
  const stored = loadStoredInput();
  const base = { ...DEFAULT_INPUT, ...stored };
  return mergeStored(base, stored);
}

export default function REDMS() {
  const { user, isAdmin, signOut } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const [inp, setInp] = useState(() => getInitialInput());
  const [tab, setTab] = useState("flip");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [savedDeals, setSavedDeals] = useState([]);
  const [savedDealsLoading, setSavedDealsLoading] = useState(false);
  const [userFavorites, setUserFavorites] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [newSharedDeals, setNewSharedDeals] = useState([]);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [currentDealId, setCurrentDealId] = useState(null);
  const [showPropertySearch, setShowPropertySearch] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  useEffect(() => {
    if (isAdmin || currentDealId) saveStoredInput(inp);
  }, [inp, isAdmin, currentDealId]);

  const refreshDeals = async () => {
    if (!user?.uid) return;
    setSavedDealsLoading(true);
    try {
      let list = await loadDeals(user.uid);
      if (!isAdmin) list = list.filter((d) => d.isShared);
      list.sort((a, b) => (a.dealName || "").localeCompare(b.dealName || "", undefined, { sensitivity: "base" }));
      setSavedDeals(list);
      if (currentDealId) {
        const meta = list.find((d) => d.id === currentDealId);
        if (!meta && !isAdmin) {
          setCurrentDealId(null);
          setCurrentDealIsShared(false);
        } else {
          setCurrentDealIsShared(meta?.isShared ?? false);
        }
      }
    } catch (e) {
      console.error("Failed to load deals", e);
    } finally {
      setSavedDealsLoading(false);
    }
  };

  useEffect(() => {
    refreshDeals();
  }, [user?.uid, isAdmin]);

  const refreshFavorites = useCallback(async () => {
    if (!user?.uid || isAdmin) return;
    setFavoritesLoading(true);
    try {
      const favs = await loadUserFavorites(user.uid);
      favs.sort((a, b) => (a.dealName || a.dealId || "").localeCompare(b.dealName || b.dealId || "", undefined, { sensitivity: "base" }));
      setUserFavorites(favs);
    } catch (e) {
      console.error("Failed to load favorites", e);
    } finally {
      setFavoritesLoading(false);
    }
  }, [user?.uid, isAdmin]);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  useEffect(() => {
    if (isAdmin || !user?.uid || savedDealsLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const lastLogin = await getLastLoginAt(() => user.getIdToken());
        if (cancelled) return;
        if (lastLogin === null) {
          const sorted = [...savedDeals].sort((a, b) => (a.dealName || "").localeCompare(b.dealName || "", undefined, { sensitivity: "base" }));
          setNewSharedDeals(sorted);
          return;
        }
        const newDeals = savedDeals
          .filter((d) => (d.updatedAt || "") > lastLogin)
          .sort((a, b) => (a.dealName || "").localeCompare(b.dealName || "", undefined, { sensitivity: "base" }));
        setNewSharedDeals(newDeals);
      } catch (e) {
        if (!cancelled) console.error("Failed to check new shared deals", e);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid, isAdmin, savedDeals, savedDealsLoading]);

  const handleDismissNewDeals = async () => {
    try {
      await setLastLoginAt(user.uid, () => user.getIdToken());
      setNewSharedDeals([]);
    } catch (e) {
      console.error("Failed to dismiss new deals notification", e);
    }
  };

  const [currentDealIsShared, setCurrentDealIsShared] = useState(false);

  const handleLoadDeal = async (id) => {
    try {
      const loaded = await loadDeal(id);
      if (!loaded) return;
      const { _ownerId, ...dealData } = loaded;
      const base = { ...DEFAULT_INPUT, ...dealData };
      setInp(mergeStored(base, dealData));
      setCurrentDealId(id);
      setCurrentDealIsShared(_ownerId != null && _ownerId !== user?.uid);
    } catch (e) {
      console.error("Failed to load deal", e);
    }
  };

  const handleSaveDeal = async () => {
    if (!isAdmin || !user?.uid) return;
    setSaveInProgress(true);
    try {
      const payload = { ...inp, dealName: formatAddress(inp) || "Untitled" };
      const id = await saveDeal(payload, currentDealId, user.uid);
      setCurrentDealId(id);
      await refreshDeals();
    } catch (e) {
      console.error("Failed to save deal", e);
    } finally {
      setSaveInProgress(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleLoadBlank = () => {
    if (!isAdmin) return;
    setInp(sanitizeInput({ ...DEFAULT_INPUT }));
    setCurrentDealId(null);
    setCurrentDealIsShared(false);
  };

  const handleRemoveFavorite = async (fav, e) => {
    e?.stopPropagation?.();
    if (!fav?.id) return;
    try {
      await removeFavorite(fav.id);
      if (currentDealId === fav.dealId) {
        setCurrentDealId(null);
      }
      await refreshFavorites();
    } catch (e) {
      console.error("Failed to remove favorite", e);
    }
  };

  const handleDeleteDeal = async (id, e) => {
    e?.stopPropagation?.();
    if (!isAdmin || !id) return;
    try {
      await deleteDeal(id);
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
      if (isAdmin) handleLoadBlank();
      else setCurrentDealId(null);
    } else {
      handleLoadDeal(value);
    }
  };

  const handleExportPDF = async () => {
    setPdfExporting(true);
    try {
      await generateDealPDF(inp, r, formatAddress);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setPdfExporting(false);
    }
  };

  const handleImportProperty = async (propertyData) => {
    if (!isAdmin) return;
    const newInp = {
      ...DEFAULT_INPUT,
      address: undefined,
      street: propertyData.addressLine1 || "",
      city: propertyData.city || "",
      state: propertyData.state || "",
      zipCode: propertyData.zipCode || "",
      offerPrice: propertyData.price || 0,
      bedrooms: propertyData.bedrooms ?? DEFAULT_INPUT.bedrooms,
      bathrooms: propertyData.bathrooms ?? DEFAULT_INPUT.bathrooms,
      sqft: propertyData.squareFootage ?? DEFAULT_INPUT.sqft,
      yearBuilt: propertyData.yearBuilt ?? DEFAULT_INPUT.yearBuilt,
      lotSize: propertyData.lotSize ?? DEFAULT_INPUT.lotSize,
      apn: propertyData.apn ?? "",
      propertyOwner: propertyData.propertyOwner ?? "",
      notes: propertyData.notes ?? propertyData.legalDescription ?? "",
      currentYearTax: propertyData.currentYearTax ?? DEFAULT_INPUT.currentYearTax,
      newPropertyTax: propertyData.newPropertyTax ?? propertyData.currentYearTax ?? DEFAULT_INPUT.newPropertyTax,
      image: propertyData.image ?? "",
      imageFallback: propertyData.imageFallback ?? "",
    };

    try {
      const { rent } = await estimateMonthlyRent({
        street: newInp.street,
        city: newInp.city,
        state: newInp.state,
        zipCode: newInp.zipCode,
        bedrooms: newInp.bedrooms,
        bathrooms: newInp.bathrooms,
        sqft: newInp.sqft,
        basement: newInp.basement,
        offerPrice: newInp.offerPrice,
        rehabCost: newInp.rehabCost ?? REHAB_COST[newInp.rehabLevel],
        propertyType: propertyData.propertyType || "Single Family",
      });
      newInp.totalRent = rent;
    } catch (e) {
      console.warn("Rent estimate skipped:", e);
    }

    setInp(mergeStored(newInp, loadStoredInput()));
    setShowPropertySearch(false);
    setCurrentDealId(null);
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
  const maxTpc = config?.maxTpc ?? 60000;
  const inpForCalc = useMemo(() => sanitizeInput(inp), [inp]);
  const r = useMemo(() => calc(inpForCalc, config), [inpForCalc, config]);
  const interestApi = useMemo(
    () => (user ? createInterestApi(() => user.getIdToken()) : null),
    [user]
  );

  const costPct = Math.min((r.bhTotalInvestment / maxTpc) * 100, 100);
  const costClr = r.bhTotalInvestment <= maxTpc ? "var(--green)" : "var(--red)";
  const dc = r.isDeal ? "deal" : inp.offerPrice > 0 ? "nodeal" : "pending";
  const badgeText = r.isDeal ? "✓ DEAL" : inp.offerPrice > 0 ? "✗ NO DEAL" : "PENDING";

  return (
    <div className={styles.app}>
      <header className={styles.hdr}>
        <div className={styles["hdr-left"]}>
          <img src="/logo.png" alt="" className={styles["hdr-logo"]} aria-hidden />
          <div className={styles["hdr-title"]}>REDMS</div>
          <div className={styles["hdr-sub"]}>
            Real Estate Deal Management System · The BNIC Network LLC
          </div>
        </div>
        <div className={styles["hdr-right"]}>
          {!showPropertySearch && (
            <button
              type="button"
              className={styles["hdr-pdf-btn"]}
              onClick={handleExportPDF}
              disabled={pdfExporting || (!isAdmin && !currentDealId)}
              title={!isAdmin && !currentDealId ? "Select a deal first" : "Download deal summary as PDF"}
            >
              {pdfExporting ? "Generating…" : "Print PDF"}
            </button>
          )}
          <div
            className={`${styles.badge} ${styles["badge-" + dc]}`}
            aria-live="polite"
            aria-atomic="true"
            role="status"
          >
            {badgeText}
          </div>
          <nav className={styles["hdr-nav"]} aria-label="Account">
            {isAdmin && (
              <Link to="/admin" className={styles["hdr-nav-link"]}>Admin</Link>
            )}
            <Link to="/profile" className={styles["hdr-nav-link"]}>Profile</Link>
            <span className={styles["hdr-email"]} title={user?.email}>{user?.email ?? ""}</span>
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
          sidebarCollapsed={sidebarCollapsed}
          currentDealId={currentDealId}
          currentDealIsShared={currentDealIsShared}
          handleDealSelect={handleDealSelect}
          handleDeleteDeal={handleDeleteDeal}
          handleLoadDeal={handleLoadDeal}
          handleRemoveFavorite={handleRemoveFavorite}
          savedDeals={savedDeals}
          userFavorites={userFavorites}
          favoritesLoading={favoritesLoading}
          refreshFavorites={refreshFavorites}
          newSharedDeals={newSharedDeals}
          onDismissNewDeals={handleDismissNewDeals}
          inp={inp}
          upd={upd}
          setRehabLevel={setRehabLevel}
          r={r}
          costClr={costClr}
          costPct={costPct}
          maxTpc={maxTpc}
          handleSaveDeal={handleSaveDeal}
          saveInProgress={saveInProgress}
          refreshDeals={refreshDeals}
          savedDealsLoading={savedDealsLoading}
          onOpenSearch={() => setShowPropertySearch(true)}
        />

        <main className={styles.output}>
          {showPropertySearch ? (
            <PropertySearch
              userId={user?.uid}
              isAdmin={isAdmin}
              onImportProperty={isAdmin ? handleImportProperty : undefined}
              onCancel={() => setShowPropertySearch(false)}
            />
          ) : !isAdmin && !currentDealId ? (
            <div className={styles["no-deal-placeholder"]}>
              <p className={styles["no-deal-msg"]}>
                {userFavorites.length === 0 && savedDeals.length === 0
                  ? "No deals yet. Contact an admin to get a shared deal, then save it to favorites."
                  : "Select a deal from the dropdown or My Favorites above to view."}
              </p>
            </div>
          ) : (
            <>
              {!isAdmin && currentDealId && interestApi && (
                <DealInterestActions
                  dealId={currentDealId}
                  dealName={formatAddress(inp)}
                  interestApi={interestApi}
                  onFavoriteSuccess={refreshFavorites}
                />
              )}

              <DealMetrics inp={inp} r={r} maxTpc={maxTpc} />

              <div>
                <div className={styles.tabs} role="tablist" aria-label="Deal views">
                  {[
                    ["flip", "Purchase & Flip"],
                    ["bh", "Buy & Hold"],
                    ["proj", "30-Yr Projection"],
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

                {tab === "flip" && <FlipTab r={r} inp={inp} />}
                {tab === "bh" && <BuyAndHoldTab r={r} inp={inp} upd={upd} maxTpc={maxTpc} />}
                {tab === "proj" && <ProjectionsTab r={r} />}
                {tab === "cpin" && <CpinTab inp={inp} formatAddress={formatAddress} />}
              </div>

              <PropertyBrief inp={inp} r={r} formatAddress={formatAddress} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

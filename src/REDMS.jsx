import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  calc,
  DEFAULT_INPUT,
  REHAB_COST,
  REHAB_TIME,
  formatCurrency,
  sanitizeInput,
  loadStoredInput,
  saveStoredInput,
  loadImportProperty,
  clampNumber,
  RANGES,
  estimateMonthlyRent,
  mergeStored,
} from "./logic";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { loadDeals, loadDeal, saveDeal, deleteDeal } from "./logic/firestoreStorage.js";
import { incrementUsage } from "./logic/dealUsageStorage.js";
import { saveUserConfig } from "./logic/userConfigStorage.js";
import { loadUserFavorites, removeFavorite } from "./logic/userFavoritesStorage.js";
import { getLastLoginAt, setLastLoginAt } from "./logic/userMetadataStorage.js";
import { createInterestApi } from "./logic/interestApi.js";
import { useAuth } from "./contexts/AuthContext.jsx";
import { useTier } from "./contexts/TierContext.jsx";
import { useConfig } from "./contexts/ConfigContext.jsx";
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
  AdminDropdown,
  WholesalerModuleDropdown,
} from "./components";
import { generateDealPDF, generateRetailInvestorPDF } from "./utils/pdfExport.js";
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
  const { user, isAdmin, isWholesaler, signOut } = useAuth();
  const { tier, canSaveDeal, canExport, isClient, isFreeTier, usageCount, usageLimit, usageOverage, canAnalyzeWhenOverage, atOverageWarningThreshold, refreshUsage, dealParamsLevel } = useTier();
  const { config, refreshConfig } = useConfig();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inp, setInp] = useState(() => getInitialInput());
  const [tab, setTab] = useState("flip");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [savedDeals, setSavedDeals] = useState([]);
  const [dealListSort, setDealListSort] = useState("name-asc");
  const [savedDealsLoading, setSavedDealsLoading] = useState(false);
  const [userFavorites, setUserFavorites] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [newSharedDeals, setNewSharedDeals] = useState([]);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [currentDealId, setCurrentDealId] = useState(null);
  const [showPropertySearch, setShowPropertySearch] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [retailPdfExporting, setRetailPdfExporting] = useState(false);
  const hasInitialBlankLoad = useRef(false);

  useEffect(() => {
    if (isAdmin || currentDealId) saveStoredInput(inp);
  }, [inp, isAdmin, currentDealId]);

  // Non-clients: auto-load blank template when landing on deal page with no deal selected
  useEffect(() => {
    const dealIdFromUrl = searchParams.get("dealId");
    if (user?.uid && !isClient && !dealIdFromUrl && !hasInitialBlankLoad.current) {
      hasInitialBlankLoad.current = true;
      setInp(sanitizeInput({ ...DEFAULT_INPUT }));
    }
  }, [user?.uid, isClient, searchParams]);

  useEffect(() => {
    const overagePaid = searchParams.get("overagePaid");
    if (overagePaid === "1" && refreshUsage) {
      refreshUsage();
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.delete("overagePaid");
        return next;
      }, { replace: true });
    }
  }, [searchParams, refreshUsage, setSearchParams]);

  useEffect(() => {
    const propertyData = loadImportProperty();
    if (!propertyData) return;
    const applyImport = async () => {
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
      setCurrentDealId(null);
      setIsViewingSystemGeneratedDeal(true);
    };
    applyImport();
  }, []);

  const refreshDeals = async () => {
    if (!user?.uid) return;
    setSavedDealsLoading(true);
    try {
      let list = await loadDeals(user.uid, { skipSharedWithAll: isFreeTier });
      if (!isAdmin && isClient) list = list.filter((d) => d.isShared);
      setSavedDeals(list);
      if (currentDealId) {
        const meta = list.find((d) => d.id === currentDealId);
        if (!meta && !isAdmin) {
          setCurrentDealId(null);
          setCurrentDealIsShared(false);
          setIsViewingSystemGeneratedDeal(false);
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
  }, [user?.uid, isAdmin, isClient, isFreeTier]);

  const handleLoadDeal = useCallback(async (id) => {
    try {
      const loaded = await loadDeal(id, { allowArchived: isAdmin });
      if (!loaded) return;
      setShowPropertySearch(false);
      const { _ownerId, importedFromPropertySearch, ...dealData } = loaded;
      const base = { ...DEFAULT_INPUT, ...dealData };
      setInp(mergeStored(base, dealData));
      setCurrentDealId(id);
      const isShared = _ownerId != null && _ownerId !== user?.uid;
      setCurrentDealIsShared(isShared);
      let ownerIsAdmin = false;
      if (_ownerId && db) {
        try {
          const adminSnap = await getDoc(doc(db, "admins", _ownerId));
          ownerIsAdmin = adminSnap.exists();
        } catch {
          // ignore
        }
      }
      setCurrentDealOwnerIsAdmin(ownerIsAdmin);
      setIsViewingSystemGeneratedDeal((ownerIsAdmin && isShared) || !!importedFromPropertySearch);
    } catch (e) {
      console.error("Failed to load deal", e);
    }
  }, [user?.uid, isAdmin]);

  useEffect(() => {
    const dealIdFromUrl = searchParams.get("dealId");
    if (dealIdFromUrl && user?.uid) {
      handleLoadDeal(dealIdFromUrl);
    }
  }, [searchParams, user?.uid, handleLoadDeal]);

  useEffect(() => {
    const searchIdFromUrl = searchParams.get("searchId");
    if (searchIdFromUrl && user?.uid) {
      setShowPropertySearch(true);
    }
  }, [searchParams, user?.uid]);

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
        const lastLogin = await getLastLoginAt(() => user.getIdToken(), user.uid);
        if (cancelled) return;
        if (lastLogin === null) {
          const sorted = [...savedDeals].filter((d) => d.isShared).sort((a, b) => (a.dealName || "").localeCompare(b.dealName || "", undefined, { sensitivity: "base" }));
          setNewSharedDeals(sorted);
          return;
        }
        const newDeals = savedDeals
          .filter((d) => d.isShared && (d.updatedAt || "") > lastLogin)
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
  const [currentDealOwnerIsAdmin, setCurrentDealOwnerIsAdmin] = useState(false);
  const [isViewingSystemGeneratedDeal, setIsViewingSystemGeneratedDeal] = useState(false);

  const handleSaveDeal = async () => {
    if (!user?.uid) return;
    if (isClient || !canSaveDeal) return;
    if (!isAdmin && isFreeTier && usageCount >= usageLimit) {
      alert(`You've reached your limit of ${usageLimit} deals. Upgrade to Investor for unlimited analyses.`);
      return;
    }
    if (!isAdmin && usageOverage && !canAnalyzeWhenOverage) {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/subscription/charge-overage", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => ({}));
        if (data.approvalUrl) {
          window.location.href = data.approvalUrl;
          return;
        }
      } catch (e) {
        console.error(e);
      }
      alert("You've exceeded your monthly deal limit. Additional analyses are $10 each. Please try again or upgrade.");
      return;
    }
    setSaveInProgress(true);
    try {
      const payload = {
        ...inp,
        dealName: formatAddress(inp) || "Untitled",
        ...(isViewingSystemGeneratedDeal ? { importedFromPropertySearch: true } : {}),
      };
      const isCreate = !currentDealId;
      const id = await saveDeal(payload, currentDealId, user.uid);
      setCurrentDealId(id);
      setCurrentDealOwnerIsAdmin(isAdmin);
      setCurrentDealIsShared(false);
      if (!isViewingSystemGeneratedDeal) setIsViewingSystemGeneratedDeal(false);
      if (isCreate && !isAdmin) {
        if (!isViewingSystemGeneratedDeal) {
          try {
            await incrementUsage(user.uid, tier);
          } catch (usageErr) {
            console.error("Deal saved but usage counter update failed:", usageErr);
          }
        }
        try {
          await refreshUsage?.();
        } catch (usageRefreshErr) {
          console.warn("refreshUsage after save failed:", usageRefreshErr);
        }
      }
      await refreshDeals();
    } catch (e) {
      console.error("Failed to save deal", e);
      if (String(e?.code || "").includes("permission-denied")) {
        // Defer alert so finally runs first and clears "Saving…" (alert() blocks the main thread).
        setTimeout(() => {
          alert(
            "Save was blocked by your account permissions. Remove ?dealId= from the address bar if present, reload, and try again. Otherwise confirm the hosting app uses the same Firebase project as the console, and that you are not in the Firestore clients collection."
          );
        }, 0);
      }
    } finally {
      setSaveInProgress(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const handleLoadBlank = () => {
    if (!isAdmin && !canSaveDeal) return;
    setInp(sanitizeInput({ ...DEFAULT_INPUT }));
    setCurrentDealId(null);
    setCurrentDealIsShared(false);
    setCurrentDealOwnerIsAdmin(false);
    setIsViewingSystemGeneratedDeal(false);
    // Drop dealId from the URL so the dealId effect does not immediately reload a shared/other deal
    // (that would restore currentDealId and make Save attempt an update you are not allowed to do).
    setSearchParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.delete("dealId");
        return next;
      },
      { replace: true }
    );
  };

  const handleRemoveFavorite = async (fav, e) => {
    e?.stopPropagation?.();
    if (!fav?.id) return;
    try {
      await removeFavorite(fav.id);
      if (currentDealId === fav.dealId) {
        setCurrentDealId(null);
        setIsViewingSystemGeneratedDeal(false);
      }
      await refreshFavorites();
    } catch (e) {
      console.error("Failed to remove favorite", e);
    }
  };

  const handleDeleteDeal = async (id, e) => {
    e?.stopPropagation?.();
    if (!id) return;
    const deal = savedDeals.find((d) => d.id === id);
    if (!window.confirm(`Delete "${deal?.dealName || "this deal"}"?`)) return;
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
      if (isAdmin || canSaveDeal) handleLoadBlank();
      else {
        setCurrentDealId(null);
        setIsViewingSystemGeneratedDeal(false);
        setSearchParams(
          (p) => {
            const next = new URLSearchParams(p);
            next.delete("dealId");
            return next;
          },
          { replace: true }
        );
      }
    } else {
      handleLoadDeal(value);
    }
  };

  const showUserCreatedDisclaimer = !isViewingSystemGeneratedDeal && !isAdmin && !isClient && currentDealId && !currentDealIsShared;

  const handleExportPDF = async () => {
    setPdfExporting(true);
    try {
      await generateDealPDF(inp, r, formatAddress, isViewingSystemGeneratedDeal, showUserCreatedDisclaimer);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setPdfExporting(false);
    }
  };

  const handleExportRetailPDF = async () => {
    setRetailPdfExporting(true);
    try {
      await generateRetailInvestorPDF(inp, r, formatAddress, isViewingSystemGeneratedDeal, showUserCreatedDisclaimer);
    } catch (e) {
      console.error("Retail PDF export failed", e);
    } finally {
      setRetailPdfExporting(false);
    }
  };

  const handleImportProperty = async (propertyData) => {
    if (!isAdmin && !canSaveDeal) return;
    if (!isAdmin && isFreeTier && usageCount >= usageLimit) {
      alert(`You've reached your limit of ${usageLimit} deals. Upgrade to Investor for unlimited analyses.`);
      return;
    }
    if (!isAdmin && usageOverage && !canAnalyzeWhenOverage) {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/subscription/charge-overage", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => ({}));
        if (data.approvalUrl) {
          window.location.href = data.approvalUrl;
          return;
        }
      } catch (e) {
        console.error(e);
      }
      alert("You've exceeded your monthly deal limit. Additional analyses are $10 each. Please try again.");
      return;
    }
    const rehabLevel = propertyData.rehabLevel ?? DEFAULT_INPUT.rehabLevel;
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
      rehabLevel,
      rehabCost: REHAB_COST[rehabLevel] ?? DEFAULT_INPUT.rehabCost,
      rehabMonths: REHAB_TIME[rehabLevel] ?? DEFAULT_INPUT.rehabMonths,
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
    setIsViewingSystemGeneratedDeal(true);
    if (!isAdmin && user?.uid) {
      await incrementUsage(user.uid, tier);
      await refreshUsage?.();
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
            Real Estate Deal Management System
          </div>
        </div>
        <div className={styles["hdr-right"]}>
          {!showPropertySearch && (
            <>
              <button
                type="button"
                className={styles["hdr-pdf-btn"]}
                onClick={handleExportPDF}
                disabled={pdfExporting || retailPdfExporting || !canExport || (!currentDealId && !isAdmin)}
                title={!canExport ? "Upgrade to export" : !currentDealId && !isAdmin ? "Select a deal first" : "Download deal summary as PDF"}
              >
                {pdfExporting ? "Generating…" : "Investor Printout"}
              </button>
              <button
                type="button"
                className={styles["hdr-pdf-btn"]}
                onClick={handleExportRetailPDF}
                disabled={pdfExporting || retailPdfExporting || !canExport || (!currentDealId && !isAdmin)}
                title={!canExport ? "Upgrade to export" : !currentDealId && !isAdmin ? "Select a deal first" : "Download retail investor PDF"}
              >
                {retailPdfExporting ? "Generating…" : "Retail Investor Printout"}
              </button>
            </>
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
          isClient={isClient}
          isFreeTier={isFreeTier}
          usageCount={usageCount}
          usageLimit={usageLimit}
          atOverageWarningThreshold={atOverageWarningThreshold}
          sidebarCollapsed={sidebarCollapsed}
          dealListSort={dealListSort}
          onDealListSortChange={setDealListSort}
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
          dealParamsLevel={dealParamsLevel}
          config={config}
          refreshConfig={refreshConfig}
          onSaveUserConfig={user && (dealParamsLevel === "full" || dealParamsLevel === "limited") ? (overrides) => saveUserConfig(user.uid, overrides, dealParamsLevel) : null}
        />

        <main className={styles.output}>
          {showPropertySearch ? (
            <PropertySearch
              userId={user?.uid}
              isAdmin={isAdmin}
              isClient={isClient}
              savedDeals={savedDeals}
              initialSearchId={searchParams.get("searchId")}
              onImportProperty={(isAdmin || canSaveDeal) ? handleImportProperty : undefined}
              onViewDeal={(dealId) => { setShowPropertySearch(false); handleLoadDeal(dealId); }}
              onCancel={() => setShowPropertySearch(false)}
            />
          ) : !currentDealId && isClient ? (
            <div className={styles["no-deal-placeholder"]}>
              <p className={styles["no-deal-msg"]}>
                {userFavorites.length === 0 && savedDeals.length === 0
                  ? (isClient ? "Contact an admin to get a shared deal." : "No deals yet. Contact an admin to get a shared deal, then save it to favorites.")
                  : "Select a deal from the dropdown or My Favorites above to view."}
              </p>
            </div>
          ) : (
            <>
              {!isAdmin && currentDealId && interestApi && (
                <DealInterestActions
                  dealId={currentDealId}
                  dealName={formatAddress(inp)}
                  dealStatus={inp.status}
                  interestApi={interestApi}
                  onFavoriteSuccess={refreshFavorites}
                />
              )}

              {isViewingSystemGeneratedDeal && (
                <div className={styles["proforma-disclaimer"]} role="status">
                  <strong>Disclaimer:</strong> The proforma shown is based on assumptions (such as Section 8 Rent, Rehab Level, New Property Taxes, and Landlord&apos;s Insurance) that have not been verified by The BNIC Network LLC. We verify all assumptions for our Clients&apos; deals as we move through the deal process.
                </div>
              )}
              {!isViewingSystemGeneratedDeal && !isAdmin && !isClient && currentDealId && !currentDealIsShared && (
                <div className={styles["proforma-disclaimer"]} role="status">
                  <strong>Disclaimer:</strong> The proforma shown is based on assumptions (such as Section 8 Rent, Rehab Level, New Property Taxes, and Landlord&apos;s Insurance) that have not been verified by The BNIC Network LLC. Please verify all assumptions before making investment decisions.
                </div>
              )}

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

                {tab === "flip" && <FlipTab r={r} inp={inp} isFreeTier={isFreeTier} />}
                {tab === "bh" && <BuyAndHoldTab r={r} inp={inp} upd={upd} maxTpc={maxTpc} isFreeTier={isFreeTier} readOnly={isClient || currentDealIsShared} />}
                {tab === "retail" && <RetailInvestorTab r={r} inp={inp} upd={upd} isFreeTier={isFreeTier} readOnly={isClient || currentDealIsShared} />}
                {tab === "proj" && <ProjectionsTab r={r} isFreeTier={isFreeTier} />}
                {tab === "cpin" && <CpinTab inp={inp} formatAddress={formatAddress} isFreeTier={isFreeTier} />}
              </div>

              <PropertyBrief inp={inp} r={r} formatAddress={formatAddress} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { useAuth } from "./AuthContext.jsx";
import { TIERS, TIER_LIMITS } from "../logic/tierConstants.js";
import { getTotalAnalysesCount, getMonthlyCount, canPerformAnalysis } from "../logic/dealUsageStorage.js";

const TierContext = createContext(null);

export function useTier() {
  const ctx = useContext(TierContext);
  if (!ctx) throw new Error("useTier must be used within TierProvider");
  return ctx;
}

/** Resolve user tier: Admin > Client > userTiers > wholesalers > Free */
async function resolveTier(uid) {
  if (!db || !uid) return TIERS.FREE;
  try {
    const [adminsSnap, clientsSnap, userTiersSnap, wholesalersSnap] = await Promise.all([
      getDoc(doc(db, "admins", uid)),
      getDoc(doc(db, "clients", uid)),
      getDoc(doc(db, "userTiers", uid)),
      getDoc(doc(db, "wholesalers", uid)),
    ]);
    if (adminsSnap.exists()) return TIERS.ADMIN;
    if (clientsSnap.exists()) return TIERS.CLIENT;
    const tier = userTiersSnap.data()?.tier;
    if (tier && [TIERS.INVESTOR, TIERS.PRO, TIERS.WHOLESALER].includes(tier)) return tier;
    if (wholesalersSnap.exists()) return TIERS.WHOLESALER;
    return TIERS.FREE;
  } catch (e) {
    console.warn("resolveTier error:", e);
    return TIERS.FREE;
  }
}

export function TierProvider({ children }) {
  const { user, isAdmin, isWholesaler } = useAuth();
  const [tier, setTier] = useState(TIERS.FREE);
  const [tierLoading, setTierLoading] = useState(true);
  const [usage, setUsage] = useState({ count: 0, limit: 0, overage: false, allowed: true });

  useEffect(() => {
    if (!user?.uid) {
      setTier(TIERS.FREE);
      setTierLoading(false);
      setUsage({ count: 0, limit: 0, overage: false, allowed: true });
      return;
    }
    let cancelled = false;
    setTierLoading(true);
    resolveTier(user.uid).then((resolved) => {
      if (cancelled) return;
      setTier(resolved);
      setTierLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.uid]);

  const refreshUsage = async () => {
    if (!user?.uid) return;
    const result = await canPerformAnalysis(user.uid, tier, isAdmin);
    setUsage({ count: result.count, limit: result.limit, overage: result.overage, allowed: result.allowed });
  };

  useEffect(() => {
    if (!user?.uid || tierLoading) return;
    let cancelled = false;
    (async () => {
      const result = await canPerformAnalysis(user.uid, tier, isAdmin);
      if (cancelled) return;
      setUsage({
        count: result.count,
        limit: result.limit,
        overage: result.overage,
        allowed: result.allowed,
      });
    })();
    return () => { cancelled = true; };
  }, [user?.uid, tier, tierLoading, isAdmin]);

  const tierLimits = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  const isClient = tier === TIERS.CLIENT;
  const dealParamsLevel = tierLimits.dealParams ?? null;
  const hasWholesalerModule = tierLimits.hasWholesalerModule || isWholesaler;
  const canExport = tierLimits.canExport || isAdmin;
  const canSaveDeal = tierLimits.canSaveDeals && (isAdmin || !isClient);
  const canAnalyzeProperty = isAdmin ? true : (tier === TIERS.FREE ? usage.count < usage.limit : usage.allowed);
  const analysesRemaining = tier === TIERS.FREE ? Math.max(0, usage.limit - usage.count) : (usage.limit === Infinity ? Infinity : Math.max(0, usage.limit - usage.count));
  const atOverageWarningThreshold = tier !== TIERS.FREE && usage.limit !== Infinity && usage.count >= usage.limit * 0.8 && usage.count < usage.limit;

  const value = useMemo(
    () => ({
      tier,
      tierLimits,
      loading: tierLoading,
      canExport,
      canSaveDeal,
      canAnalyzeProperty,
      analysesRemaining,
      analysesThisMonth: tier !== TIERS.FREE ? usage.count : null,
      isClient,
      dealParamsLevel,
      hasWholesalerModule,
      isFreeTier: tier === TIERS.FREE,
      usageCount: usage.count,
      usageLimit: usage.limit,
      usageOverage: usage.overage,
      canAnalyzeWhenOverage: usage.allowed,
      atOverageWarningThreshold,
      refreshUsage,
    }),
    [
      tier,
      tierLimits,
      tierLoading,
      canExport,
      canSaveDeal,
      canAnalyzeProperty,
      analysesRemaining,
      isClient,
      dealParamsLevel,
      hasWholesalerModule,
      usage.count,
      usage.limit,
      usage.overage,
      usage.allowed,
      atOverageWarningThreshold,
      refreshUsage,
    ]
  );

  return <TierContext.Provider value={value}>{children}</TierContext.Provider>;
}

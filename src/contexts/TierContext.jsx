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

/** Returns tier context or null when outside TierProvider. Use when component may render before provider is ready. */
export function useTierOptional() {
  return useContext(TierContext);
}

/** Resolve user tier and subscription cycle: Admin > Client > userTiers > wholesalers > Free */
async function resolveTier(uid) {
  if (!db || !uid) return { tier: TIERS.FREE, subscriptionCycle: null };
  try {
    const [adminsSnap, clientsSnap, userTiersSnap, wholesalersSnap] = await Promise.all([
      getDoc(doc(db, "admins", uid)),
      getDoc(doc(db, "clients", uid)),
      getDoc(doc(db, "userTiers", uid)),
      getDoc(doc(db, "wholesalers", uid)),
    ]);
    if (adminsSnap.exists()) return { tier: TIERS.ADMIN, subscriptionCycle: null };
    if (clientsSnap.exists()) return { tier: TIERS.CLIENT, subscriptionCycle: null };
    const tierData = userTiersSnap.data();
    const tier = tierData?.tier;
    const cancelAtPeriodEnd = !!tierData?.cancelAtPeriodEnd;
    const accessUntil = tierData?.accessUntil?.toDate?.() ?? (tierData?.accessUntil ? new Date(tierData.accessUntil) : null);
    const periodEnded = cancelAtPeriodEnd && accessUntil && accessUntil <= new Date();
    if (tier && [TIERS.INVESTOR, TIERS.PRO, TIERS.WHOLESALER].includes(tier) && !periodEnded) {
      return {
        tier,
        subscriptionCycle: tierData?.cycle || null,
        cancelAtPeriodEnd: cancelAtPeriodEnd && !periodEnded,
        accessUntil: periodEnded ? null : accessUntil,
      };
    }
    if (wholesalersSnap.exists()) return { tier: TIERS.WHOLESALER, subscriptionCycle: null };
    return { tier: TIERS.FREE, subscriptionCycle: null };
  } catch (e) {
    console.warn("resolveTier error:", e);
    return { tier: TIERS.FREE, subscriptionCycle: null };
  }
}

export function TierProvider({ children }) {
  const { user, isAdmin, isWholesaler } = useAuth();
  const [tier, setTier] = useState(TIERS.FREE);
  const [subscriptionCycle, setSubscriptionCycle] = useState(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [accessUntil, setAccessUntil] = useState(null);
  const [tierLoading, setTierLoading] = useState(true);
  const [usage, setUsage] = useState({ count: 0, limit: 0, overage: false, allowed: true });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setTier(TIERS.FREE);
      setSubscriptionCycle(null);
      setCancelAtPeriodEnd(false);
      setAccessUntil(null);
      setTierLoading(false);
      setUsage({ count: 0, limit: 0, overage: false, allowed: true });
      return;
    }
    let cancelled = false;
    setTierLoading(true);
    resolveTier(user.uid).then((resolved) => {
      if (cancelled) return;
      setTier(resolved.tier);
      setSubscriptionCycle(resolved.subscriptionCycle);
      setCancelAtPeriodEnd(resolved.cancelAtPeriodEnd ?? false);
      setAccessUntil(resolved.accessUntil ?? null);
      setTierLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.uid, refreshTrigger]);

  const refreshTier = () => setRefreshTrigger((n) => n + 1);

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
      subscriptionCycle,
      cancelAtPeriodEnd,
      accessUntil,
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
      refreshTier,
    }),
    [
      tier,
      subscriptionCycle,
      cancelAtPeriodEnd,
      accessUntil,
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
      refreshTier,
    ]
  );

  return <TierContext.Provider value={value}>{children}</TierContext.Provider>;
}

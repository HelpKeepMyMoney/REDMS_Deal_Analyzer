/**
 * Deal usage tracking for tier limits.
 * Free: totalAnalysesCount (lifetime). Paid: monthlyCounts by YYYY-MM.
 */

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { TIERS, TIER_LIMITS } from "./tierConstants.js";

const COLLECTION = "dealUsage";

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Get lifetime total for Free tier */
export async function getTotalAnalysesCount(userId) {
  if (!db || !userId) return 0;
  try {
    const ref = doc(db, COLLECTION, userId);
    const snap = await getDoc(ref);
    const data = snap.data();
    return data?.totalAnalysesCount ?? 0;
  } catch (e) {
    console.warn("getTotalAnalysesCount error:", e);
    return 0;
  }
}

/** Get monthly count for paid tiers */
export async function getMonthlyCount(userId, month = null) {
  if (!db || !userId) return 0;
  const m = month ?? getCurrentMonth();
  try {
    const ref = doc(db, COLLECTION, userId);
    const snap = await getDoc(ref);
    const data = snap.data();
    const counts = data?.monthlyCounts ?? {};
    return counts[m] ?? 0;
  } catch (e) {
    console.warn("getMonthlyCount error:", e);
    return 0;
  }
}

/** Get overage paid count for month (paid tiers) */
export async function getOveragePaidCount(userId, month = null) {
  if (!db || !userId) return 0;
  const m = month ?? getCurrentMonth();
  try {
    const ref = doc(db, COLLECTION, userId);
    const snap = await getDoc(ref);
    const data = snap.data();
    const counts = data?.overagePaidCounts ?? {};
    return counts[m] ?? 0;
  } catch (e) {
    console.warn("getOveragePaidCount error:", e);
    return 0;
  }
}

/** Increment usage. For Free: totalAnalysesCount. For Paid: monthlyCounts[YYYY-MM]. */
export async function incrementUsage(userId, tier) {
  if (!db || !userId) throw new Error("User must be signed in");
  const ref = doc(db, COLLECTION, userId);
  const month = getCurrentMonth();

  if (tier === TIERS.FREE) {
    const snap = await getDoc(ref);
    const current = snap.data()?.totalAnalysesCount ?? 0;
    await setDoc(ref, { totalAnalysesCount: current + 1, updatedAt: serverTimestamp() }, { merge: true });
  } else {
    const snap = await getDoc(ref);
    const data = snap.data() ?? {};
    const counts = { ...(data.monthlyCounts ?? {}), [month]: (data.monthlyCounts?.[month] ?? 0) + 1 };
    await setDoc(ref, { monthlyCounts: counts, updatedAt: serverTimestamp() }, { merge: true });
  }
}

/** Check if user can perform analysis. Returns { allowed, overage, count, limit }. */
export async function canPerformAnalysis(userId, tier, isAdmin) {
  if (isAdmin) return { allowed: true, overage: false, count: 0, limit: Infinity };
  if (!userId) return { allowed: false, overage: false, count: 0, limit: 0 };

  const limits = TIER_LIMITS[tier];
  if (!limits) return { allowed: false, overage: false, count: 0, limit: 0 };

  if (tier === TIERS.CLIENT) {
    return { allowed: limits.canSaveDeals, overage: false, count: 0, limit: limits.maxSavedDeals };
  }

  if (tier === TIERS.FREE) {
    const count = await getTotalAnalysesCount(userId);
    const limit = limits.maxAnalysesTotal ?? 3;
    return { allowed: count < limit, overage: false, count, limit };
  }

  const month = getCurrentMonth();
  const count = await getMonthlyCount(userId, month);
  const overagePaid = await getOveragePaidCount(userId, month);
  const limit = limits.maxAnalysesPerMonth ?? Infinity;
  const overage = count >= limit;
  const allowed = count < limit || overagePaid > count - limit;
  return {
    allowed,
    overage,
    count,
    limit,
  };
}

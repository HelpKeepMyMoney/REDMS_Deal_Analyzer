/**
 * Property search usage tracking for RentCast API quota.
 * Tracks monthly search count at app level (shared across admins).
 * RentCast free tier: 50 API calls/month.
 */

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";

const DOC_PATH = "appConfig/propertySearchUsage";

/** Default limit per month (RentCast free tier). */
export const DEFAULT_PROPERTY_SEARCH_LIMIT = 50;

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Get monthly search count for current period. */
export async function getPropertySearchMonthlyCount(month = null) {
  if (!db) return 0;
  const m = month ?? getCurrentMonth();
  try {
    const ref = doc(db, "appConfig", "propertySearchUsage");
    const snap = await getDoc(ref);
    const data = snap.data();
    const counts = data?.monthlyCounts ?? {};
    return counts[m] ?? 0;
  } catch (e) {
    console.warn("getPropertySearchMonthlyCount error:", e);
    return 0;
  }
}

/** Increment property search count for current month. Call after successful RentCast API search. */
export async function incrementPropertySearchUsage() {
  if (!db) return;
  const ref = doc(db, "appConfig", "propertySearchUsage");
  const month = getCurrentMonth();
  try {
    const snap = await getDoc(ref);
    const data = snap.data() ?? {};
    const counts = { ...(data.monthlyCounts ?? {}), [month]: (data.monthlyCounts?.[month] ?? 0) + 1 };
    await setDoc(ref, { monthlyCounts: counts, updatedAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    console.warn("incrementPropertySearchUsage error:", e);
  }
}

/**
 * Get remaining searches for the period. Returns { count, limit, remaining }.
 * @param {Object} [options]
 * @param {number} [options.limit] - Override limit (default 50).
 * @param {number} [options.usedOverride] - Override used count (e.g. from RentCast dashboard for manual sync).
 */
export async function getPropertySearchRemaining(options = {}) {
  const { limit: limitOverride, usedOverride } = typeof options === "number" ? { limit: options } : options;
  const count = usedOverride != null && !isNaN(usedOverride) ? usedOverride : await getPropertySearchMonthlyCount();
  const effectiveLimit = limitOverride ?? DEFAULT_PROPERTY_SEARCH_LIMIT;
  const remaining = Math.max(0, effectiveLimit - count);
  return { count, limit: effectiveLimit, remaining };
}

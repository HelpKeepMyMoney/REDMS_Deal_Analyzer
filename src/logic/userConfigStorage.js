/**
 * Per-user deal parameter overrides.
 * Free: limited keys. Investor/Pro/Wholesaler: full. Client: admin-set only.
 */

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { FREE_TIER_PARAM_KEYS } from "./tierConstants.js";

const COLLECTION = "userConfig";

/** Load user config overrides. Returns partial config object or null. */
export async function loadUserConfig(userId) {
  if (!db || !userId) return null;
  try {
    const ref = doc(db, COLLECTION, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return data?.paramsOverrides ?? null;
  } catch (e) {
    console.warn("loadUserConfig error:", e);
    return null;
  }
}

/** Save user config overrides. Only saves keys allowed for tier. */
export async function saveUserConfig(userId, overrides, dealParamsLevel) {
  if (!db || !userId) throw new Error("User must be signed in");
  const ref = doc(db, COLLECTION, userId);

  let filtered = overrides;
  if (dealParamsLevel === "limited") {
    filtered = Object.fromEntries(
      Object.entries(overrides ?? {}).filter(([k]) => FREE_TIER_PARAM_KEYS.includes(k))
    );
  }

  const payload = {
    paramsOverrides: filtered,
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload, { merge: true });
}

/** Filter overrides to only allowed keys for tier */
export function filterOverridesByTier(overrides, dealParamsLevel) {
  if (!overrides || typeof overrides !== "object") return {};
  if (dealParamsLevel === "full" || dealParamsLevel === "admin_only") return overrides;
  if (dealParamsLevel === "limited") {
    return Object.fromEntries(
      Object.entries(overrides).filter(([k]) => FREE_TIER_PARAM_KEYS.includes(k))
    );
  }
  return {};
}

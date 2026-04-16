/**
 * Firestore storage for wholesaler deals.
 * Same schema as deals but no sharedWith/sharedWithAll; includes riskOverrides per deal.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase.js";

const WHOLESALER_DEALS_COLLECTION = "wholesalerDeals";

const RISK_OVERRIDE_KEYS = [
  "minWholesaleFee",
  "minFlipCoCPct",
  "minBhCoCPct",
  "maxTpc",
];

function extractRiskOverrides(deal) {
  const overrides = {};
  for (const k of RISK_OVERRIDE_KEYS) {
    if (deal[k] != null && deal[k] !== undefined) {
      overrides[k] = deal[k];
    }
  }
  return Object.keys(overrides).length > 0 ? overrides : undefined;
}

const WHOLESALER_DEAL_DOC_STRIP_KEYS = new Set([
  "userId",
  "createdAt",
  "updatedAt",
]);

function dealToDoc(deal, userId) {
  const { dealName, riskOverrides, ...rest } = deal;
  const overrides = riskOverrides ?? extractRiskOverrides(deal);
  const cleaned = Object.fromEntries(
    Object.entries(rest).filter(
      ([k, v]) =>
        v !== undefined &&
        !RISK_OVERRIDE_KEYS.includes(k) &&
        !WHOLESALER_DEAL_DOC_STRIP_KEYS.has(k)
    )
  );
  const ownerId = String(userId);
  const base = {
    ...cleaned,
    dealName: dealName ?? null,
    updatedAt: serverTimestamp(),
    userId: ownerId,
  };
  if (overrides) {
    base.riskOverrides = overrides;
  }
  return base;
}

function dealToListItem(d, currentUserId) {
  const data = d.data();
  const addr = [data.street, data.city, data.state].filter(Boolean).join(", ");
  return {
    id: d.id,
    dealName: data.dealName || addr || "Untitled",
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
  };
}

/** Load list of wholesaler deals for a user. */
export async function loadWholesalerDeals(userId) {
  if (!db) return [];
  if (!userId) return [];
  try {
    const q = query(
      collection(db, WHOLESALER_DEALS_COLLECTION),
      where("userId", "==", userId),
      orderBy("updatedAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => dealToListItem(d, userId));
  } catch (e) {
    console.warn("loadWholesalerDeals error:", e);
    const fallback = await getDocs(query(
      collection(db, WHOLESALER_DEALS_COLLECTION),
      where("userId", "==", userId),
      orderBy("updatedAt", "desc")
    ));
    return fallback.docs.map((d) => dealToListItem(d, userId));
  }
}

/** Load one wholesaler deal by id. Returns full input + riskOverrides or null. */
export async function loadWholesalerDeal(id) {
  if (!db) return null;
  const ref = doc(db, WHOLESALER_DEALS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  const { updatedAt, createdAt, dealName, userId, riskOverrides, ...inp } = data;
  return {
    ...inp,
    dealName: dealName ?? undefined,
    riskOverrides: riskOverrides ?? undefined,
  };
}

/** Save wholesaler deal. If existingId provided, updates; otherwise creates. Returns document id. */
export async function saveWholesalerDeal(deal, existingId = null, userId = null) {
  if (!db) throw new Error("Firebase is not configured. Add VITE_FIREBASE_* to .env");
  if (!userId) throw new Error("User must be signed in to save deals");
  const payload = dealToDoc(deal, userId);
  if (existingId) {
    const ref = doc(db, WHOLESALER_DEALS_COLLECTION, existingId);
    await setDoc(ref, payload, { merge: true });
    return existingId;
  }
  const ref = await addDoc(collection(db, WHOLESALER_DEALS_COLLECTION), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Delete a wholesaler deal by id. */
export async function deleteWholesalerDeal(id) {
  if (!db) throw new Error("Firebase is not configured. Add VITE_FIREBASE_* to .env");
  if (!id) throw new Error("Deal id is required");
  const ref = doc(db, WHOLESALER_DEALS_COLLECTION, id);
  await deleteDoc(ref);
}

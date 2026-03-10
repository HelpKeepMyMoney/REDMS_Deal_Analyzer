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

const DEALS_COLLECTION = "deals";

/**
 * @param {Record<string, unknown>} deal - Deal input object; may include dealName.
 * @param {string} userId - Owner's Firebase Auth UID.
 */
function dealToDoc(deal, userId, isCreate = false) {
  const { dealName, ...rest } = deal;
  const cleaned = Object.fromEntries(
    Object.entries(rest).filter(([_, v]) => v !== undefined)
  );
  const base = {
    userId,
    dealName: dealName ?? null,
    ...cleaned,
    updatedAt: serverTimestamp(),
  };
  if (isCreate) {
    base.sharedWith = [];
    base.sharedWithAll = false;
  }
  return base;
}

function dealToListItem(d, currentUserId) {
  const data = d.data();
  const addr = [data.street, data.city, data.state].filter(Boolean).join(", ");
  const isShared = data.userId !== currentUserId;
  return {
    id: d.id,
    dealName: data.dealName || addr || "Untitled",
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
    isShared,
  };
}

/** Load list of saved deals for a user (own + shared). Includes isShared flag for read-only indicator. */
export async function loadDeals(userId) {
  if (!db) return [];
  if (!userId) return [];
  const results = new Map();
  try {
    // Own deals: use orderBy (usually has index from userId)
    const ownSnap = await getDocs(query(
      collection(db, DEALS_COLLECTION),
      where("userId", "==", userId),
      orderBy("updatedAt", "desc")
    ));
    for (const d of ownSnap.docs) {
      results.set(d.id, dealToListItem(d, userId));
    }

    // Shared with this user: no orderBy to avoid composite index requirement
    try {
      const sharedSnap = await getDocs(query(
        collection(db, DEALS_COLLECTION),
        where("sharedWith", "array-contains", userId)
      ));
      for (const d of sharedSnap.docs) {
        if (!results.has(d.id)) results.set(d.id, dealToListItem(d, userId));
      }
    } catch (sharedErr) {
      console.warn("Shared deals query failed (index may be needed):", sharedErr);
    }

    // Shared with all users: no orderBy to avoid composite index requirement
    try {
      const allSnap = await getDocs(query(
        collection(db, DEALS_COLLECTION),
        where("sharedWithAll", "==", true)
      ));
      for (const d of allSnap.docs) {
        if (!results.has(d.id)) results.set(d.id, dealToListItem(d, userId));
      }
    } catch (allErr) {
      console.warn("Shared-with-all query failed:", allErr);
    }

    return Array.from(results.values()).sort((a, b) => {
      const ta = a.updatedAt || "";
      const tb = b.updatedAt || "";
      return tb.localeCompare(ta);
    });
  } catch (e) {
    console.warn("loadDeals error:", e);
    const fallback = await getDocs(query(
      collection(db, DEALS_COLLECTION),
      where("userId", "==", userId),
      orderBy("updatedAt", "desc")
    ));
    return fallback.docs.map((d) => dealToListItem(d, userId));
  }
}

/** Load one deal by id. Returns full input object or null. Includes userId for shared-detection. */
export async function loadDeal(id) {
  if (!db) return null;
  const ref = doc(db, DEALS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  const { updatedAt, createdAt, dealName, userId, sharedWith, sharedWithAll, ...inp } = data;
  return { ...inp, dealName: dealName ?? undefined, _ownerId: userId };
}

/** Save deal. If existingId provided, updates; otherwise creates. userId required. Returns document id. */
export async function saveDeal(deal, existingId = null, userId = null) {
  if (!db) throw new Error("Firebase is not configured. Add VITE_FIREBASE_* to .env");
  if (!userId) throw new Error("User must be signed in to save deals");
  const payload = dealToDoc(deal, userId, !existingId);
  if (existingId) {
    const ref = doc(db, DEALS_COLLECTION, existingId);
    await setDoc(ref, payload, { merge: true });
    return existingId;
  }
  const ref = await addDoc(collection(db, DEALS_COLLECTION), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Delete a deal by id. Caller must ensure user owns the deal (Firestore rules enforce). */
export async function deleteDeal(id) {
  if (!db) throw new Error("Firebase is not configured. Add VITE_FIREBASE_* to .env");
  if (!id) throw new Error("Deal id is required");
  const ref = doc(db, DEALS_COLLECTION, id);
  await deleteDoc(ref);
}

export const DEAL_STATUSES = ["Available", "Reserved", "Under Contract", "Sold"];

/** Load all deals (admin only). Returns list with id, dealName, userId, sharedWith, sharedWithAll, updatedAt, status, assignedUserId, and full deal input fields for calc/display. */
export async function loadAllDealsForAdmin() {
  if (!db) return [];
  const snap = await getDocs(collection(db, DEALS_COLLECTION));
  return snap.docs.map((d) => {
    const data = d.data();
    const addr = [data.street, data.city, data.state].filter(Boolean).join(", ");
    const { updatedAt, createdAt, ...rest } = data;
    return {
      id: d.id,
      dealName: data.dealName || addr || "Untitled",
      userId: data.userId,
      sharedWith: Array.isArray(data.sharedWith) ? data.sharedWith : [],
      sharedWithAll: data.sharedWithAll === true,
      updatedAt: updatedAt?.toDate?.()?.toISOString?.() ?? null,
      status: data.status || "Available",
      assignedUserId: data.assignedUserId || null,
      ...rest,
    };
  });
}

/** Update deal status (admin only). status: Available | Reserved | Under Contract | Sold. */
export async function updateDealStatus(dealId, status) {
  if (!db) throw new Error("Firebase is not configured");
  if (!dealId) throw new Error("Deal id is required");
  if (!DEAL_STATUSES.includes(status)) throw new Error("Invalid status");
  const ref = doc(db, DEALS_COLLECTION, dealId);
  const update = { status, updatedAt: serverTimestamp() };
  if (status === "Available") {
    update.assignedUserId = null;
  }
  await setDoc(ref, update, { merge: true });
}

/** Update deal assigned user (admin only). For Reserved, Under Contract, Sold. assignedUserId: string | null. */
export async function updateDealAssignedUser(dealId, assignedUserId) {
  if (!db) throw new Error("Firebase is not configured");
  if (!dealId) throw new Error("Deal id is required");
  const ref = doc(db, DEALS_COLLECTION, dealId);
  await setDoc(ref, {
    assignedUserId: assignedUserId || null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/** Update deal sharing (admin only). sharedWith = array of user IDs; sharedWithAll = true for all users. */
export async function updateDealSharedWith(dealId, sharedWith, sharedWithAll) {
  if (!db) throw new Error("Firebase is not configured");
  if (!dealId) throw new Error("Deal id is required");
  const ref = doc(db, DEALS_COLLECTION, dealId);
  await setDoc(ref, {
    sharedWith: Array.isArray(sharedWith) ? sharedWith : [],
    sharedWithAll: sharedWithAll === true,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

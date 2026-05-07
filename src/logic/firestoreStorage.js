import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase.js";

const DEALS_COLLECTION = "deals";

/** Fields that must never come from client deal state (would break rules or admin-only data). */
const DEAL_DOC_STRIP_KEYS = new Set([
  "userId",
  "sharedWith",
  "sharedWithAll",
  "archived",
  "status",
  "assignedUserId",
  "createdAt",
  "updatedAt",
  "_ownerId",
  "importedFromPropertySearch",
]);

/**
 * @param {Record<string, unknown>} deal - Deal input object; may include dealName.
 * @param {string} userId - Owner's Firebase Auth UID.
 */
function dealToDoc(deal, userId, isCreate = false) {
  const { dealName, archived, ...rest } = deal;
  const cleaned = Object.fromEntries(
    Object.entries(rest).filter(([k, v]) => v !== undefined && !DEAL_DOC_STRIP_KEYS.has(k))
  );
  // userId must be last: localStorage/merged state can contain a stale userId and would
  // otherwise overwrite the authenticated uid and fail Firestore create/update rules.
  const ownerId = String(userId);
  const base = {
    ...cleaned,
    dealName: dealName ?? null,
    updatedAt: serverTimestamp(),
    ...(isCreate ? { sharedWith: [], sharedWithAll: false } : {}),
    userId: ownerId,
  };
  void archived;
  return base;
}

function getLatestNoteIso(notesHistory) {
  if (!Array.isArray(notesHistory) || notesHistory.length === 0) return null;
  let latestMs = 0;
  for (const note of notesHistory) {
    if (!note || typeof note !== "object") continue;
    const iso = note.updatedAt || note.createdAt;
    const ms = iso ? new Date(iso).getTime() : 0;
    if (Number.isFinite(ms) && ms > latestMs) latestMs = ms;
  }
  return latestMs > 0 ? new Date(latestMs).toISOString() : null;
}

function dealToListItem(d, currentUserId) {
  const data = d.data();
  const addr = [data.street, data.city, data.state].filter(Boolean).join(", ");
  const isShared = data.userId !== currentUserId;
  const docUpdatedAt = data.updatedAt?.toDate?.()?.toISOString?.() ?? null;
  const latestNoteAt = getLatestNoteIso(data.notesHistory);
  const effectiveUpdatedAt =
    (latestNoteAt && (!docUpdatedAt || latestNoteAt > docUpdatedAt))
      ? latestNoteAt
      : docUpdatedAt;
  return {
    id: d.id,
    dealName: data.dealName || addr || "Untitled",
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
    updatedAt: effectiveUpdatedAt,
    noteUpdatedAt: latestNoteAt,
    isShared,
    street: data.street ?? null,
    city: data.city ?? null,
    state: data.state ?? null,
    zipCode: data.zipCode ?? null,
  };
}

/**
 * Load list of saved deals for a user (own + shared). Includes isShared flag for read-only indicator.
 * @param {string} userId - User's Firebase UID
 * @param {{ skipSharedWithAll?: boolean }} [opts] - If skipSharedWithAll is true, exclude deals shared with all users (e.g. for Free tier)
 */
export async function loadDeals(userId, opts = {}) {
  if (!db) return [];
  if (!userId) return [];
  const { skipSharedWithAll = false } = opts;
  const results = new Map();
  try {
    // Own deals: use orderBy (usually has index from userId)
    const ownSnap = await getDocs(query(
      collection(db, DEALS_COLLECTION),
      where("userId", "==", userId),
      orderBy("updatedAt", "desc")
    ));
    for (const d of ownSnap.docs) {
      if (d.data().archived === true) continue;
      results.set(d.id, dealToListItem(d, userId));
    }

    // Shared with this user: no orderBy to avoid composite index requirement
    try {
      const sharedSnap = await getDocs(query(
        collection(db, DEALS_COLLECTION),
        where("sharedWith", "array-contains", userId)
      ));
      for (const d of sharedSnap.docs) {
        if (d.data().archived === true) continue;
        if (!results.has(d.id)) results.set(d.id, dealToListItem(d, userId));
      }
    } catch (sharedErr) {
      console.warn("Shared deals query failed (index may be needed):", sharedErr);
    }

    // Shared with all users: skip for Free tier (share with all = paid tiers only)
    if (!skipSharedWithAll) {
      try {
        const allSnap = await getDocs(query(
          collection(db, DEALS_COLLECTION),
          where("sharedWithAll", "==", true)
        ));
        for (const d of allSnap.docs) {
          if (d.data().archived === true) continue;
          if (!results.has(d.id)) results.set(d.id, dealToListItem(d, userId));
        }
      } catch (allErr) {
        console.warn("Shared-with-all query failed:", allErr);
      }
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
    return fallback.docs
      .filter((d) => d.data().archived !== true)
      .map((d) => dealToListItem(d, userId));
  }
}

/**
 * Load one deal by id. Returns full input object or null. Includes userId for shared-detection.
 * @param {string} id
 * @param {{ allowArchived?: boolean }} [opts] - Admins may load archived deals (e.g. from URL).
 */
export async function loadDeal(id, opts = {}) {
  if (!db) return null;
  const { allowArchived = false } = opts;
  const ref = doc(db, DEALS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.archived === true && !allowArchived) return null;
  const { updatedAt, createdAt, dealName, userId, sharedWith, sharedWithAll, archived, ...inp } = data;
  return { ...inp, dealName: dealName ?? undefined, _ownerId: userId };
}

/** Save deal. If existingId provided, updates; otherwise creates. userId required. Returns document id. */
export async function saveDeal(deal, existingId = null, userId = null) {
  if (!db) throw new Error("Firebase is not configured. Add VITE_FIREBASE_* to .env");
  if (!userId) throw new Error("User must be signed in to save deals");
  const ownerId = String(userId);

  if (existingId) {
    const ref = doc(db, DEALS_COLLECTION, existingId);
    let snap = null;
    try {
      snap = await getDoc(ref);
    } catch {
      /* unreadable doc (e.g. no read permission) — fall through to create */
    }
    const data = snap?.exists() ? snap.data() : null;
    const canMergeUpdate = data != null && String(data.userId ?? "") === ownerId;
    if (!canMergeUpdate) {
      // Stale id, wrong owner, missing doc, or unreadable: create instead of denied update.
      const created = await addDoc(collection(db, DEALS_COLLECTION), {
        ...dealToDoc(deal, ownerId, true),
        createdAt: serverTimestamp(),
      });
      return created.id;
    }
    const payload = dealToDoc(deal, ownerId, false);
    await setDoc(ref, payload, { merge: true });
    return existingId;
  }

  const ref = await addDoc(collection(db, DEALS_COLLECTION), {
    ...dealToDoc(deal, ownerId, true),
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
    const { updatedAt, createdAt, archived, ...rest } = data;
    return {
      id: d.id,
      dealName: data.dealName || addr || "Untitled",
      userId: data.userId,
      sharedWith: Array.isArray(data.sharedWith) ? data.sharedWith : [],
      sharedWithAll: data.sharedWithAll === true,
      archived: archived === true,
      createdAt: createdAt?.toDate?.()?.toISOString?.() ?? null,
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

/** Archive or unarchive a deal (admin only). Archived deals are hidden from non-admin users. */
export async function updateDealArchived(dealId, archived) {
  if (!db) throw new Error("Firebase is not configured");
  if (!dealId) throw new Error("Deal id is required");
  const ref = doc(db, DEALS_COLLECTION, dealId);
  await setDoc(
    ref,
    { archived: archived === true, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

function makeMigratedNote(text, isoNow, index = 0) {
  return {
    id: `migrated-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    createdAt: isoNow,
    updatedAt: isoNow,
  };
}

/**
 * One-time migration:
 * For each owned deal where legacy notes exists and notesHistory is empty/missing,
 * create first notesHistory item stamped to now.
 * Legacy notes field is preserved.
 */
export async function migrateLegacyNotesToHistory(userId) {
  if (!db) return { scanned: 0, migrated: 0 };
  if (!userId) return { scanned: 0, migrated: 0 };

  const ownSnap = await getDocs(
    query(collection(db, DEALS_COLLECTION), where("userId", "==", String(userId)))
  );

  let migrated = 0;
  const scanned = ownSnap.docs.length;

  for (let i = 0; i < ownSnap.docs.length; i += 1) {
    const dealDoc = ownSnap.docs[i];
    const data = dealDoc.data() || {};
    const legacyNotes = typeof data.notes === "string" ? data.notes.trim() : "";
    const history = Array.isArray(data.notesHistory) ? data.notesHistory : [];
    if (!legacyNotes || history.length > 0) continue;

    const isoNow = new Date().toISOString();
    await updateDoc(dealDoc.ref, {
      notesHistory: [makeMigratedNote(legacyNotes, isoNow, i)],
      updatedAt: serverTimestamp(),
    });
    migrated += 1;
  }

  return { scanned, migrated };
}

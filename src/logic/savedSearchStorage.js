import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase.js";

const SAVED_SEARCHES_COLLECTION = "savedSearches";

function searchToListItem(d, currentUserId) {
  const data = d.data();
  const isShared = data.userId !== currentUserId;
  return {
    id: d.id,
    name: data.name || "Saved search",
    criteria: data.criteria || {},
    resultCount: Array.isArray(data.results) ? data.results.length : 0,
    updatedAt: data.updatedAt?.toDate?.()?.getTime?.() ?? data.createdAt?.toDate?.()?.getTime?.() ?? 0,
    isShared,
  };
}

/** Load saved searches for a user: own + shared (sharedWith or sharedWithAll). */
export async function loadSavedSearches(userId) {
  if (!db) return [];
  if (!userId) return [];
  const results = new Map();
  try {
    const ownSnap = await getDocs(query(
      collection(db, SAVED_SEARCHES_COLLECTION),
      where("userId", "==", userId),
      orderBy("updatedAt", "desc")
    ));
    for (const d of ownSnap.docs) {
      results.set(d.id, searchToListItem(d, userId));
    }

    try {
      const sharedSnap = await getDocs(query(
        collection(db, SAVED_SEARCHES_COLLECTION),
        where("sharedWith", "array-contains", userId)
      ));
      for (const d of sharedSnap.docs) {
        if (!results.has(d.id)) results.set(d.id, searchToListItem(d, userId));
      }
    } catch (sharedErr) {
      console.warn("Shared saved searches query failed (index may be needed):", sharedErr);
    }

    try {
      const allSnap = await getDocs(query(
        collection(db, SAVED_SEARCHES_COLLECTION),
        where("sharedWithAll", "==", true)
      ));
      for (const d of allSnap.docs) {
        if (!results.has(d.id)) results.set(d.id, searchToListItem(d, userId));
      }
    } catch (allErr) {
      console.warn("Shared-with-all saved searches query failed:", allErr);
    }

    const list = Array.from(results.values());
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return list;
  } catch (e) {
    console.warn("loadSavedSearches error:", e);
    const fallback = await getDocs(query(
      collection(db, SAVED_SEARCHES_COLLECTION),
      where("userId", "==", userId),
      orderBy("updatedAt", "desc")
    ));
    return fallback.docs.map((d) => searchToListItem(d, userId));
  }
}

export async function loadSavedSearch(id) {
  if (!db) return null;
  const ref = doc(db, SAVED_SEARCHES_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name || "Saved search",
    criteria: data.criteria || {},
    results: data.results || [],
  };
}

function cleanForFirestore(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(cleanForFirestore);
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, cleanForFirestore(v)])
  );
}

export async function saveSearchResults(userId, name, criteria, results) {
  if (!db) throw new Error("Firebase is not configured");
  if (!userId) throw new Error("User must be signed in to save search results");

  const payload = {
    userId,
    name: name || "Saved search",
    criteria: cleanForFirestore(criteria || {}),
    results: cleanForFirestore(results || []),
    sharedWith: [],
    sharedWithAll: false,
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, SAVED_SEARCHES_COLLECTION), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteSavedSearch(id) {
  if (!db) throw new Error("Firebase is not configured");
  if (!id) throw new Error("Search id is required");
  const ref = doc(db, SAVED_SEARCHES_COLLECTION, id);
  await deleteDoc(ref);
}

/** Load all saved searches (admin only). Returns list with id, name, userId, sharedWith, sharedWithAll, updatedAt. */
export async function loadAllSavedSearchesForAdmin() {
  if (!db) return [];
  const snap = await getDocs(collection(db, SAVED_SEARCHES_COLLECTION));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || "Saved search",
      userId: data.userId,
      resultCount: Array.isArray(data.results) ? data.results.length : 0,
      sharedWith: Array.isArray(data.sharedWith) ? data.sharedWith : [],
      sharedWithAll: data.sharedWithAll === true,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
    };
  });
}

/** Remove a property from a saved search's results array. */
export async function removePropertyFromSavedSearch(searchId, propertyId) {
  if (!db) throw new Error("Firebase is not configured");
  if (!searchId || !propertyId) throw new Error("Search id and property id are required");
  const saved = await loadSavedSearch(searchId);
  if (!saved?.results?.length) return;
  const filtered = saved.results.filter((p) => (p?.id || "") !== propertyId);
  if (filtered.length === saved.results.length) return;
  const ref = doc(db, SAVED_SEARCHES_COLLECTION, searchId);
  await setDoc(
    ref,
    {
      results: cleanForFirestore(filtered),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Update saved search sharing (admin only). sharedWith = array of user IDs; sharedWithAll = true for all users. */
export async function updateSavedSearchSharedWith(searchId, sharedWith, sharedWithAll) {
  if (!db) throw new Error("Firebase is not configured");
  if (!searchId) throw new Error("Search id is required");
  const ref = doc(db, SAVED_SEARCHES_COLLECTION, searchId);
  await setDoc(ref, {
    sharedWith: Array.isArray(sharedWith) ? sharedWith : [],
    sharedWithAll: sharedWithAll === true,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase.js";

const SAVED_SEARCHES_COLLECTION = "savedSearches";

export async function loadSavedSearches(userId) {
  if (!db) return [];
  if (!userId) return [];
  const q = query(
    collection(db, SAVED_SEARCHES_COLLECTION),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || "Saved search",
      criteria: data.criteria || {},
      resultCount: Array.isArray(data.results) ? data.results.length : 0,
      updatedAt: data.updatedAt?.toDate?.()?.getTime?.() ?? data.createdAt?.toDate?.()?.getTime?.() ?? 0,
    };
  });
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return list;
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

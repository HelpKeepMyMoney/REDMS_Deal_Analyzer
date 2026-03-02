import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase.js";

const USER_FAVORITES_COLLECTION = "userFavorites";

/** Load user's favorite deal IDs. */
export async function loadUserFavorites(userId) {
  if (!db || !userId) return [];
  try {
    const q = query(
      collection(db, USER_FAVORITES_COLLECTION),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      dealId: d.data().dealId,
      dealName: d.data().dealName || null,
      createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() ?? null,
    }));
  } catch (e) {
    console.warn("loadUserFavorites error:", e);
    return [];
  }
}

/** Check if a deal is favorited by the user. */
export async function isDealFavorited(userId, dealId) {
  if (!db || !userId || !dealId) return false;
  const favorites = await loadUserFavorites(userId);
  return favorites.some((f) => f.dealId === dealId);
}

/** Remove a favorite (user can only remove their own). */
export async function removeFavorite(favId) {
  if (!db) throw new Error("Firebase is not configured");
  if (!favId) throw new Error("Favorite id is required");
  const ref = doc(db, USER_FAVORITES_COLLECTION, favId);
  await deleteDoc(ref);
}

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase.js";

const INTEREST_REQUESTS_COLLECTION = "interestRequests";

function docToItem(d) {
  const data = d.data();
  return {
    id: d.id,
    type: data.type || "",
    userId: data.userId || "",
    userEmail: data.userEmail || "",
    message: data.message || null,
    status: data.status || "pending",
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
    propertySnapshot: data.propertySnapshot || null,
    dealId: data.dealId || null,
    dealName: data.dealName || null,
  };
}

/** Load all interest requests (admin only). Returns list sorted by createdAt desc. */
export async function loadInterestRequestsForAdmin() {
  if (!db) return [];
  try {
    const q = query(
      collection(db, INTEREST_REQUESTS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(docToItem);
  } catch (e) {
    console.warn("loadInterestRequestsForAdmin error:", e);
    const snap = await getDocs(collection(db, INTEREST_REQUESTS_COLLECTION));
    return snap.docs.map(docToItem).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }
}

/** Update interest request status (admin only). */
export async function updateInterestRequestStatus(id, status) {
  if (!db) throw new Error("Firebase is not configured");
  if (!id) throw new Error("Interest request id is required");
  const ref = doc(db, INTEREST_REQUESTS_COLLECTION, id);
  await updateDoc(ref, { status, updatedAt: serverTimestamp() });
}

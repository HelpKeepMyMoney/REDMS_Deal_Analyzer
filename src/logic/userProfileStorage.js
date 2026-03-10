/**
 * User profile storage (firstName, lastName, phoneNumber).
 * Stored in Firestore at users/{userId}.
 */

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";

const COLLECTION = "users";

/** Load user profile. Returns { firstName, lastName, phoneNumber } or null. */
export async function loadUserProfile(userId) {
  if (!db || !userId) return null;
  try {
    const ref = doc(db, COLLECTION, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      firstName: data?.firstName ?? "",
      lastName: data?.lastName ?? "",
      phoneNumber: data?.phoneNumber ?? "",
    };
  } catch (e) {
    console.warn("loadUserProfile error:", e);
    return null;
  }
}

/** Save user profile. */
export async function saveUserProfile(userId, { firstName, lastName, phoneNumber }) {
  if (!db || !userId) throw new Error("User must be signed in");
  const ref = doc(db, COLLECTION, userId);
  const payload = {
    firstName: String(firstName ?? "").trim(),
    lastName: String(lastName ?? "").trim(),
    phoneNumber: String(phoneNumber ?? "").trim(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload, { merge: true });
}

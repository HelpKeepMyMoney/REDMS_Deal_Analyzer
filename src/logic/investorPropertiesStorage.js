import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase.js";
import { loadAllSavedSearchesForAdmin, loadSavedSearch } from "./savedSearchStorage.js";

const INVESTOR_PROPERTIES_COLLECTION = "investorProperties";

/** Sanitize property ID for use as Firestore document ID (no slashes). */
function sanitizePropertyId(id) {
  if (!id || typeof id !== "string") return null;
  return id.replace(/\//g, "_");
}

/** Load all properties marked for investor view. */
export async function loadInvestorProperties() {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, INVESTOR_PROPERTIES_COLLECTION));
    const list = snap.docs.map((d) => {
      const data = d.data();
      return { ...data.property, id: data.property?.id ?? d.id, _addedAt: data.addedAt?.toMillis?.() ?? 0 };
    });
    list.sort((a, b) => (b._addedAt || 0) - (a._addedAt || 0));
    return list.map(({ _addedAt, ...p }) => p);
  } catch (e) {
    console.warn("loadInvestorProperties error:", e);
    return [];
  }
}

/** Add or overwrite a property in the investor pool. */
export async function addInvestorProperty(property, sourceSearchId, userId) {
  if (!db) throw new Error("Firebase is not configured");
  if (!property?.id) throw new Error("Property id is required");
  const docId = sanitizePropertyId(property.id);
  if (!docId) throw new Error("Invalid property id");

  const ref = doc(db, INVESTOR_PROPERTIES_COLLECTION, docId);
  await setDoc(ref, {
    property: { ...property, id: property.id },
    sourceSearchId: sourceSearchId || null,
    addedAt: serverTimestamp(),
    addedBy: userId || null,
  });
}

/** Remove a property from the investor pool. */
export async function removeInvestorProperty(propertyId) {
  if (!db) throw new Error("Firebase is not configured");
  if (!propertyId) throw new Error("Property id is required");
  const docId = sanitizePropertyId(propertyId);
  if (!docId) return;

  const ref = doc(db, INVESTOR_PROPERTIES_COLLECTION, docId);
  await deleteDoc(ref);
}

/** Add or remove a property from the investor pool. */
export async function setInvestorPropertyIncluded(propertyId, included, property, sourceSearchId, userId) {
  if (included) {
    if (!property) throw new Error("Property object required when including");
    await addInvestorProperty(property, sourceSearchId, userId);
  } else {
    await removeInvestorProperty(propertyId);
  }
}

/** Load set of property IDs currently in the investor pool. */
export async function loadInvestorPropertyIds() {
  if (!db) return new Set();
  const snap = await getDocs(collection(db, INVESTOR_PROPERTIES_COLLECTION));
  const ids = new Set();
  for (const d of snap.docs) {
    const data = d.data();
    const pid = data.property?.id ?? d.id;
    if (pid) ids.add(pid);
  }
  return ids;
}

/** Load all properties from all saved searches with inclusion status (admin only). */
export async function loadAllPropertiesForAdmin() {
  if (!db) return [];
  const allSearches = await loadAllSavedSearchesForAdmin();
  const investorIds = await loadInvestorPropertyIds();
  const byId = new Map();

  for (const search of allSearches) {
    const full = await loadSavedSearch(search.id);
    if (!full?.results?.length) continue;
    for (const prop of full.results) {
      const id = prop?.id;
      if (!id) continue;
      if (byId.has(id)) {
        const existing = byId.get(id);
        if (!existing.sourceSearchIds.includes(search.id)) {
          existing.sourceSearchIds.push(search.id);
          existing.sourceSearchNames.push(search.name);
        }
        continue;
      }
      byId.set(id, {
        property: prop,
        sourceSearchIds: [search.id],
        sourceSearchNames: [search.name],
        isIncluded: investorIds.has(id),
      });
    }
  }

  return Array.from(byId.values());
}

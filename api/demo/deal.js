/**
 * Public API: returns the demo deal (17917 Mackay St, Detroit, MI 48212).
 * Fetches from Firestore deals where sharedWithAll=true, or by DEMO_DEAL_ID env.
 * No auth required.
 */
import { getAdminFirestore } from "../../lib/firebase-admin.js";

const DEMO_ADDRESS = {
  street: "17917 Mackay St",
  city: "Detroit",
  state: "MI",
  zipCode: "48212",
};

function normalizeStreet(s) {
  if (!s || typeof s !== "string") return "";
  return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/\.\s*$/, "");
}

function addressMatches(data) {
  const street = normalizeStreet(data.street || data.address);
  const city = (data.city || "").toString().trim().toLowerCase();
  const state = (data.state || "").toString().trim().toUpperCase();
  const zip = (data.zipCode || "").toString().replace(/\D/g, "").slice(0, 5);
  const demoStreet = normalizeStreet(DEMO_ADDRESS.street);
  const demoCity = DEMO_ADDRESS.city.toLowerCase();
  const demoState = DEMO_ADDRESS.state;
  const demoZip = DEMO_ADDRESS.zipCode;
  return (
    street.includes("mackay") &&
    city.includes("detroit") &&
    state === demoState &&
    zip === demoZip
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = getAdminFirestore();
    const dealId = process.env.DEMO_DEAL_ID;

    if (dealId) {
      const ref = db.collection("deals").doc(dealId);
      const snap = await ref.get();
      if (snap.exists) {
        const data = snap.data();
        const { updatedAt, createdAt, dealName, userId, sharedWith, sharedWithAll, ...inp } = data;
        return res.status(200).json({
          deal: { ...inp, dealName: dealName ?? undefined },
          dealId: snap.id,
        });
      }
    }

    const snap = await db.collection("deals").where("sharedWithAll", "==", true).get();

    for (const d of snap.docs) {
      const data = d.data();
      if (addressMatches(data)) {
        const { updatedAt, createdAt, dealName, userId, sharedWith, sharedWithAll, ...inp } = data;
        return res.status(200).json({
          deal: { ...inp, dealName: dealName ?? undefined },
          dealId: d.id,
        });
      }
    }

    const fallbackDeal = {
      street: DEMO_ADDRESS.street,
      city: DEMO_ADDRESS.city,
      state: DEMO_ADDRESS.state,
      zipCode: DEMO_ADDRESS.zipCode,
      offerPrice: 35000,
      rehabLevel: "Full",
      rehabCost: 30000,
      totalRent: 1200,
      bedrooms: 3,
      bathrooms: 1,
      sqft: 1200,
      yearBuilt: 1925,
      lotSize: 5000,
      currentYearTax: 1200,
      newPropertyTax: 1100,
      dealName: "17917 Mackay St, Detroit, MI 48212",
    };
    return res.status(200).json({
      deal: fallbackDeal,
      dealId: "demo-fallback",
    });
  } catch (err) {
    console.error("demo/deal error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

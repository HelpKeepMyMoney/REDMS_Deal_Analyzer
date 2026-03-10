/**
 * Get subscription status for current user. GET with auth.
 */
import { requireAuth } from "../lib/requireAuth.js";
import { getAdminFirestore } from "../lib/firebase-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let decoded;
  try {
    decoded = await requireAuth(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  try {
    const db = getAdminFirestore();
    const tierDoc = await db.doc(`userTiers/${decoded.uid}`).get();
    const data = tierDoc.data();

    if (!tierDoc.exists || !data) {
      return res.status(200).json({ tier: "free", subscriptionId: null, status: null });
    }

    return res.status(200).json({
      tier: data.tier || "free",
      subscriptionId: data.subscriptionId || null,
      status: data.status || "ACTIVE",
    });
  } catch (err) {
    console.error("subscription status error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

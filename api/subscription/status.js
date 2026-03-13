/**
 * Get subscription status for current user. GET with auth.
 */
import { requireAuth } from "../../lib/requireAuth.js";
import { getAdminFirestore } from "../../lib/firebase-admin.js";
import { getCycleFromPlanId } from "../../lib/paypal.js";

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
    const tierRef = db.doc(`userTiers/${decoded.uid}`);
    const tierDoc = await tierRef.get();
    const data = tierDoc.data();

    if (!tierDoc.exists || !data) {
      return res.status(200).json({ tier: "free", subscriptionId: null, status: null, cycle: null });
    }

    let cycle = data.cycle;
    if (!cycle && data.planId) {
      cycle = getCycleFromPlanId(data.planId);
      if (cycle) {
        await tierRef.update({ cycle, updatedAt: new Date() });
      }
    }

    const cancelAtPeriodEnd = !!data.cancelAtPeriodEnd;
    const accessUntil = data.accessUntil?.toDate?.()?.toISOString?.() ?? (data.accessUntil || null);

    return res.status(200).json({
      tier: data.tier || "free",
      subscriptionId: data.subscriptionId || null,
      status: data.status || "ACTIVE",
      cycle: cycle || null,
      cancelAtPeriodEnd,
      accessUntil,
    });
  } catch (err) {
    console.error("subscription status error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

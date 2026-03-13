/**
 * Complete subscription after PayPal return (for local dev when webhook can't reach localhost).
 * POST with { subscription_id } in body. Fetches subscription from PayPal, verifies it belongs
 * to the current user, and updates Firestore userTiers.
 */
import { requireAuth } from "../../lib/requireAuth.js";
import { getAdminFirestore } from "../../lib/firebase-admin.js";
import { getSubscriptionsController, getCycleFromPlanId } from "../../lib/paypal.js";

const TIER_MAP = {
  "investor:monthly": "investor",
  "investor:annual": "investor",
  "pro:monthly": "pro",
  "pro:annual": "pro",
  "wholesaler:monthly": "wholesaler",
  "wholesaler:annual": "wholesaler",
};

function getTierFromPlanId(planId) {
  const planKey = Object.keys(process.env).find(
    (k) => k.startsWith("PAYPAL_PLAN_") && process.env[k] === planId
  );
  if (!planKey) return null;
  const match = planKey.match(/PAYPAL_PLAN_(INVESTOR|PRO|WHOLESALER)_(MONTHLY|ANNUAL)/);
  if (!match) return null;
  const plan = match[1].toLowerCase();
  const cycle = match[2].toLowerCase();
  return TIER_MAP[`${plan}:${cycle}`] || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let decoded;
  try {
    decoded = await requireAuth(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  const subscriptionId = req.body?.subscription_id || req.query?.subscription_id;
  if (!subscriptionId) {
    return res.status(400).json({ error: "Missing subscription_id" });
  }

  try {
    const subsController = getSubscriptionsController();
    const result = await subsController.getSubscription({ id: subscriptionId });
    const sub = result.result;

    if (!sub) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const customId = sub.customId || sub.custom_id;
    if (customId !== decoded.uid) {
      return res.status(403).json({ error: "Subscription does not belong to this user" });
    }

    const planId = sub.planId || sub.plan_id || sub.plan?.id || sub.plan?.plan_id;
    const status = sub.status || sub.status_code;
    const invalidStatuses = ["CANCELLED", "SUSPENDED", "EXPIRED"];
    if (status && invalidStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({ error: `Subscription status is ${status}` });
    }

    const tier = getTierFromPlanId(planId) || "investor";
    const cycle = getCycleFromPlanId(planId);
    const db = getAdminFirestore();
    await db.doc(`userTiers/${decoded.uid}`).set({
      tier,
      subscriptionId,
      planId: planId || null,
      cycle: cycle || null,
      status: "ACTIVE",
      updatedAt: new Date(),
    });

    return res.status(200).json({ success: true, tier });
  } catch (err) {
    console.error("subscription complete error:", err);
    const body = typeof err.body === "string" ? (() => { try { return JSON.parse(err.body); } catch { return null; } })() : err.body;
    const details = body?.details?.[0];
    const msg = details?.description || body?.message || err.message;
    return res.status(500).json({ error: msg || "Failed to complete subscription" });
  }
}

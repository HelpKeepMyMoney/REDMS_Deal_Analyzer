/**
 * Consolidated subscription handler. Handles status (GET), cancel (POST), complete (POST).
 * Routes via vercel.json rewrites: /api/subscription/status, cancel, complete -> /api/subscription-handler?action=...
 */
import { requireAuth } from "../lib/requireAuth.js";
import { getAdminFirestore } from "../lib/firebase-admin.js";
import { getSubscriptionsController, getCycleFromPlanId } from "../lib/paypal.js";

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
  const action = req.query?.action;

  let decoded;
  try {
    decoded = await requireAuth(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  if (action === "status") {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
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

  if (action === "cancel") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }
    try {
      const db = getAdminFirestore();
      const tierRef = db.doc(`userTiers/${decoded.uid}`);
      const tierDoc = await tierRef.get();
      const data = tierDoc.data();
      if (!tierDoc.exists || !data?.subscriptionId) {
        return res.status(400).json({ error: "No active subscription to cancel" });
      }
      if (data.cancelAtPeriodEnd) {
        return res.status(200).json({
          ok: true,
          message: "Subscription already set to cancel at period end",
          accessUntil: data.accessUntil?.toDate?.()?.toISOString?.() ?? data.accessUntil,
        });
      }
      const subsController = getSubscriptionsController();
      const result = await subsController.getSubscription({ id: data.subscriptionId });
      const sub = result.result;
      if (!sub) return res.status(404).json({ error: "Subscription not found" });
      const customId = sub.customId || sub.custom_id;
      if (customId !== decoded.uid) return res.status(403).json({ error: "Subscription does not belong to this user" });
      const status = sub.status || sub.status_code;
      if (status && ["CANCELLED", "SUSPENDED", "EXPIRED"].includes(status.toUpperCase())) {
        return res.status(400).json({ error: `Subscription is already ${status}` });
      }
      const billingInfo = sub.billingInfo || sub.billing_info || {};
      const nextBillingTime = billingInfo.nextBillingTime || billingInfo.next_billing_time;
      let accessUntil = null;
      if (nextBillingTime) {
        accessUntil = typeof nextBillingTime === "string" ? new Date(nextBillingTime) : nextBillingTime;
      } else {
        const startTime = sub.startTime || sub.start_time;
        const cycle = data.cycle || "monthly";
        const start = startTime ? new Date(startTime) : new Date();
        const end = new Date(start);
        if (cycle === "annual") end.setFullYear(end.getFullYear() + 1);
        else end.setMonth(end.getMonth() + 1);
        accessUntil = end;
      }
      await tierRef.update({ cancelAtPeriodEnd: true, accessUntil, updatedAt: new Date() });
      return res.status(200).json({
        ok: true,
        message: "Subscription will not renew. You keep access until the end of your billing period.",
        accessUntil: accessUntil.toISOString(),
      });
    } catch (err) {
      console.error("subscription cancel error:", err);
      const body = typeof err.body === "string" ? (() => { try { return JSON.parse(err.body); } catch { return null; } })() : err.body;
      const msg = body?.details?.[0]?.description || body?.message || err.message;
      return res.status(500).json({ error: msg || "Failed to cancel subscription" });
    }
  }

  if (action === "complete") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }
    const subscriptionId = req.body?.subscription_id || req.query?.subscription_id;
    if (!subscriptionId) return res.status(400).json({ error: "Missing subscription_id" });
    try {
      const subsController = getSubscriptionsController();
      const result = await subsController.getSubscription({ id: subscriptionId });
      const sub = result.result;
      if (!sub) return res.status(404).json({ error: "Subscription not found" });
      const customId = sub.customId || sub.custom_id;
      if (customId !== decoded.uid) return res.status(403).json({ error: "Subscription does not belong to this user" });
      const planId = sub.planId || sub.plan_id || sub.plan?.id || sub.plan?.plan_id;
      const status = sub.status || sub.status_code;
      if (status && ["CANCELLED", "SUSPENDED", "EXPIRED"].includes(status.toUpperCase())) {
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
      const msg = body?.details?.[0]?.description || body?.message || err.message;
      return res.status(500).json({ error: msg || "Failed to complete subscription" });
    }
  }

  return res.status(400).json({ error: "Unknown action" });
}

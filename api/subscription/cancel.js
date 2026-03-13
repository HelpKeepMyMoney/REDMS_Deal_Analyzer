/**
 * Cancel subscription at end of billing period.
 * User keeps access until period end; no renewal. Cron will call PayPal cancel when period ends.
 */
import { requireAuth } from "../../lib/requireAuth.js";
import { getAdminFirestore } from "../../lib/firebase-admin.js";
import { getSubscriptionsController } from "../../lib/paypal.js";

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

    if (!sub) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const customId = sub.customId || sub.custom_id;
    if (customId !== decoded.uid) {
      return res.status(403).json({ error: "Subscription does not belong to this user" });
    }

    const status = sub.status || sub.status_code;
    if (status && ["CANCELLED", "SUSPENDED", "EXPIRED"].includes(status.toUpperCase())) {
      return res.status(400).json({ error: `Subscription is already ${status}` });
    }

    const billingInfo = sub.billingInfo || sub.billing_info || {};
    const nextBillingTime = billingInfo.nextBillingTime || billingInfo.next_billing_time;
    let accessUntil = null;
    if (nextBillingTime) {
      const d = typeof nextBillingTime === "string" ? new Date(nextBillingTime) : nextBillingTime;
      accessUntil = d;
    } else {
      const startTime = sub.startTime || sub.start_time;
      const cycle = data.cycle || "monthly";
      const start = startTime ? new Date(startTime) : new Date();
      const end = new Date(start);
      if (cycle === "annual") {
        end.setFullYear(end.getFullYear() + 1);
      } else {
        end.setMonth(end.getMonth() + 1);
      }
      accessUntil = end;
    }

    await tierRef.update({
      cancelAtPeriodEnd: true,
      accessUntil,
      updatedAt: new Date(),
    });

    return res.status(200).json({
      ok: true,
      message: "Subscription will not renew. You keep access until the end of your billing period.",
      accessUntil: accessUntil.toISOString(),
    });
  } catch (err) {
    console.error("subscription cancel error:", err);
    const body = typeof err.body === "string" ? (() => { try { return JSON.parse(err.body); } catch { return null; } })() : err.body;
    const details = body?.details?.[0];
    const msg = details?.description || body?.message || err.message;
    return res.status(500).json({ error: msg || "Failed to cancel subscription" });
  }
}

/**
 * Vercel cron: runs daily to cancel PayPal subscriptions whose period has ended.
 * For users with cancelAtPeriodEnd and accessUntil <= now, calls PayPal cancel and deletes userTiers.
 * Secured by CRON_SECRET env var.
 */
import { getAdminFirestore } from "../../lib/firebase-admin.js";
import { cancelPayPalSubscription } from "../../lib/paypal.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const db = getAdminFirestore();
    const now = new Date();
    const snapshot = await db
      .collection("userTiers")
      .where("cancelAtPeriodEnd", "==", true)
      .get();

    let processed = 0;
    let errors = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const accessUntil = data.accessUntil?.toDate?.() ?? (data.accessUntil ? new Date(data.accessUntil) : null);
      if (!accessUntil || accessUntil > now) continue;

      const subscriptionId = data.subscriptionId;
      if (!subscriptionId) {
        await doc.ref.delete();
        processed++;
        continue;
      }

      try {
        await cancelPayPalSubscription(subscriptionId, "Billing period ended");
        await doc.ref.delete();
        processed++;
      } catch (e) {
        console.error(`Failed to cancel subscription ${subscriptionId} for ${doc.id}:`, e);
        errors.push({ uid: doc.id, error: e.message });
      }
    }

    return res.status(200).json({
      ok: true,
      processed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("subscription-cancel-period-end cron error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

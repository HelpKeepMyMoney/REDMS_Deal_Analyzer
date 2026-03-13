/**
 * PayPal webhook handler. Verifies signature and processes subscription events.
 * POST only; no auth (PayPal calls this).
 */
import { getAdminFirestore } from "../../lib/firebase-admin.js";
import { getPayPalClient, getCycleFromPlanId } from "../../lib/paypal.js";

function getBaseUrl() {
  const mode = process.env.PAYPAL_MODE || "sandbox";
  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const baseUrl = getBaseUrl();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = await res.json();
  return data.access_token;
}

async function verifyWebhookSignature(req, body) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn("PAYPAL_WEBHOOK_ID not set, skipping verification");
    return true;
  }

  const transmissionId = req.headers["paypal-transmission-id"];
  const transmissionSig = req.headers["paypal-transmission-sig"];
  const transmissionTime = req.headers["paypal-transmission-time"];
  const certUrl = req.headers["paypal-cert-url"];
  const authAlgo = req.headers["paypal-auth-algo"];

  if (!transmissionId || !transmissionSig || !transmissionTime || !certUrl || !authAlgo) {
    console.warn("Missing required PayPal webhook headers");
    return false;
  }

  const token = await getAccessToken();
  const baseUrl = getBaseUrl();
  const verifyRes = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      webhook_id: webhookId,
      webhook_event: body,
    }),
  });

  if (!verifyRes.ok) {
    console.error("PayPal verify-webhook-signature failed:", await verifyRes.text());
    return false;
  }

  const verifyData = await verifyRes.json();
  return verifyData.verification_status === "SUCCESS";
}

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

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const eventId = body.id;
  const eventType = body.event_type;

  if (!eventId) {
    return res.status(400).json({ error: "Missing event id" });
  }

  const verified = await verifyWebhookSignature(req, body);
  if (!verified) {
    return res.status(401).json({ error: "Webhook signature verification failed" });
  }

  const db = getAdminFirestore();
  const processedRef = db.doc(`processedWebhooks/${eventId}`);
  const processedSnap = await processedRef.get();
  if (processedSnap.exists) {
    return res.status(200).json({ received: true });
  }

  const resource = body.resource || {};

  if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
    const subscriptionId = resource.id;
    const customId = resource.custom_id || resource.subscriber?.payer_id;
    const planId = resource.plan_id;

    if (!customId) {
      console.warn("BILLING.SUBSCRIPTION.ACTIVATED: no custom_id, skipping");
      await processedRef.set({ eventType, processedAt: new Date() });
      return res.status(200).json({ received: true });
    }

    const tier = getTierFromPlanId(planId) || "investor";
    const cycle = getCycleFromPlanId(planId);
    await db.doc(`userTiers/${customId}`).set({
      tier,
      subscriptionId,
      planId,
      cycle: cycle || null,
      status: "ACTIVE",
      updatedAt: new Date(),
    });
  } else if (
    eventType === "BILLING.SUBSCRIPTION.CANCELLED" ||
    eventType === "BILLING.SUBSCRIPTION.SUSPENDED" ||
    eventType === "BILLING.SUBSCRIPTION.EXPIRED"
  ) {
    const subscriptionId = resource.id;
    const customId = resource.custom_id;

    if (customId) {
      await db.doc(`userTiers/${customId}`).delete();
    } else {
      const subs = await db.collection("userTiers").where("subscriptionId", "==", subscriptionId).limit(1).get();
      subs.docs.forEach((d) => d.ref.delete());
    }
  }

  await processedRef.set({ eventType, processedAt: new Date() });
  return res.status(200).json({ received: true });
}

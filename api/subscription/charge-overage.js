/**
 * Charge $10 overage. GET with auth: creates Order, redirects to PayPal.
 * GET with ?token=... (return from PayPal): captures, increments overagePaidCounts, redirects to /investor?overagePaid=1
 */
import { requireAuth } from "../lib/requireAuth.js";
import { getOrdersController } from "../lib/paypal.js";
import { getAdminFirestore } from "../lib/firebase-admin.js";
import { CheckoutPaymentIntent } from "@paypal/paypal-server-sdk";

const OVERAGE_AMOUNT = "10.00";

function getBaseUrl(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function incrementOveragePaid(db, userId) {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ref = db.doc(`dealUsage/${userId}`);
  const snap = await ref.get();
  const data = snap.data() || {};
  const counts = data.overagePaidCounts || {};
  counts[month] = (counts[month] || 0) + 1;
  await ref.set(
    { overagePaidCounts: counts, updatedAt: now },
    { merge: true }
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token } = req.query || {};
  const baseUrl = getBaseUrl(req);

  const authHeader = req.headers?.authorization;
  const hasAuth = authHeader?.startsWith("Bearer ");

  if (token) {
    const db = getAdminFirestore();
    const ordersController = getOrdersController();
    try {
      await ordersController.captureOrder({ id: token });
      const orderRes = await ordersController.getOrder({ id: token });
      const pu = orderRes.result?.purchaseUnits?.[0];
      const customId = pu?.customId || pu?.custom_id;
      if (customId) {
        await incrementOveragePaid(db, customId);
      }
    } catch (err) {
      console.error("charge-overage capture error:", err);
      return res.redirect(302, `${baseUrl}/investor?overageError=1`);
    }
    return res.redirect(302, `${baseUrl}/investor?overagePaid=1`);
  }

  let decoded;
  try {
    decoded = await requireAuth(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  try {
    const ordersController = getOrdersController();
    const body = {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          amount: {
            currencyCode: "USD",
            value: OVERAGE_AMOUNT,
          },
          description: "Deal analysis overage",
          customId: decoded.uid,
        },
      ],
      applicationContext: {
        returnUrl: `${baseUrl}/api/subscription/charge-overage`,
        cancelUrl: `${baseUrl}/investor?overageCancelled=1`,
      },
    };

    const result = await ordersController.createOrder({ body });
    const links = result.result?.links || [];
    const approveLink = links.find((l) => l.rel === "approve" && l.href);
    if (!approveLink?.href) {
      return res.status(500).json({ error: "No approval URL from PayPal" });
    }

    if (hasAuth) {
      return res.status(200).json({ approvalUrl: approveLink.href });
    }
    res.redirect(302, approveLink.href);
  } catch (err) {
    console.error("charge-overage create error:", err);
    return res.status(500).json({ error: err.message || "Failed to create order" });
  }
}

/**
 * Create PayPal subscription. GET with ?plan=investor|pro|wholesaler&cycle=monthly|annual
 * Requires Authorization: Bearer <token>. Returns JSON { approvalUrl } for fetch; redirects when no auth (legacy).
 */
import { requireAuth } from "../../lib/requireAuth.js";
import { getPlanId, createPayPalSubscription } from "../../lib/paypal-cancel.js";

function getBaseUrl(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

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

  const { plan, cycle } = req.query || {};
  const validPlans = ["investor", "pro", "wholesaler"];
  const validCycles = ["monthly", "annual"];
  if (!validPlans.includes(plan) || !validCycles.includes(cycle)) {
    return res.status(400).json({ error: "Invalid plan or cycle" });
  }

  const planId = getPlanId(plan, cycle);
  if (!planId) {
    return res.status(500).json({ error: "Plan not configured" });
  }

  const baseUrl = getBaseUrl(req);
  const returnUrl = `${baseUrl}/profile?subscription=success`;
  const cancelUrl = `${baseUrl}/profile?subscription=cancelled`;

  try {
    const { approvalUrl } = await createPayPalSubscription(planId, decoded.uid, returnUrl, cancelUrl);

    const hasAuth = req.headers?.authorization?.startsWith("Bearer ");
    if (hasAuth) {
      return res.status(200).json({ approvalUrl });
    }
    res.redirect(302, approvalUrl);
  } catch (err) {
    console.error("subscription create error:", err);
    const msg = err.message || "Failed to create subscription. Check that PayPal plan IDs are configured and active.";
    return res.status(500).json({ error: msg });
  }
}

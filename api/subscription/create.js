/**
 * Create PayPal subscription. GET with ?plan=investor|pro|wholesaler&cycle=monthly|annual
 * Requires Authorization: Bearer <token>. Returns JSON { approvalUrl } for fetch; redirects when no auth (legacy).
 */
import { requireAuth } from "../../lib/requireAuth.js";
import { getSubscriptionsController, getPlanId } from "../../lib/paypal.js";

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
    const subsController = getSubscriptionsController();

    const body = {
      planId,
      customId: decoded.uid,
      applicationContext: {
        returnUrl,
        cancelUrl,
      },
    };

    const result = await subsController.createSubscription({
      body,
      prefer: "return=representation",
    });

    const links = result.result?.links || [];
    const approveLink = links.find((l) => l.rel === "approve" && l.href);
    if (!approveLink?.href) {
      return res.status(500).json({ error: "No approval URL from PayPal" });
    }

    const hasAuth = req.headers?.authorization?.startsWith("Bearer ");
    if (hasAuth) {
      return res.status(200).json({ approvalUrl: approveLink.href });
    }
    res.redirect(302, approveLink.href);
  } catch (err) {
    console.error("subscription create error:", err);
    // Extract useful details from PayPal API errors (body may be JSON string)
    let body = err.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = null;
      }
    }
    body = body || err.result || err.response?.result;
    const details = body?.details?.[0];
    const issue = details?.description || details?.issue || body?.message || err.message;
    const fallback = "Failed to create subscription. Check that PayPal plan IDs are configured and active.";
    const msg = issue && issue !== "The error response" ? issue : fallback;
    return res.status(500).json({ error: msg });
  }
}

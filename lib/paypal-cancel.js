/**
 * PayPal subscription operations via REST API (no SDK).
 * Used by admin-handler, cron, subscription/create; avoids loading
 * @paypal/paypal-server-sdk which can fail in some serverless environments.
 */

const PLAN_MAP = {
  "investor:monthly": "PAYPAL_PLAN_INVESTOR_MONTHLY",
  "investor:annual": "PAYPAL_PLAN_INVESTOR_ANNUAL",
  "pro:monthly": "PAYPAL_PLAN_PRO_MONTHLY",
  "pro:annual": "PAYPAL_PLAN_PRO_ANNUAL",
  "wholesaler:monthly": "PAYPAL_PLAN_WHOLESALER_MONTHLY",
  "wholesaler:annual": "PAYPAL_PLAN_WHOLESALER_ANNUAL",
};

export function getPlanId(plan, cycle) {
  const key = `${plan}:${cycle}`;
  const envKey = PLAN_MAP[key];
  if (!envKey) return null;
  return process.env[envKey] || null;
}

/** Get PayPal OAuth access token for server-side API calls. */
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const mode = process.env.PAYPAL_MODE || "sandbox";
  const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || "Failed to get PayPal token");
  return data.access_token;
}

/** Returns "monthly" | "annual" | null based on planId. */
export function getCycleFromPlanId(planId) {
  if (!planId) return null;
  const planKey = Object.keys(process.env).find(
    (k) => k.startsWith("PAYPAL_PLAN_") && process.env[k] === planId
  );
  if (!planKey) return null;
  const m = planKey.match(/PAYPAL_PLAN_(?:INVESTOR|PRO|WHOLESALER)_(MONTHLY|ANNUAL)/);
  return m ? m[1].toLowerCase() : null;
}

/** Create a PayPal subscription. Returns { approvalUrl } or throws. */
export async function createPayPalSubscription(planId, customId, returnUrl, cancelUrl) {
  const mode = process.env.PAYPAL_MODE || "sandbox";
  const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const token = await getPayPalAccessToken();
  const res = await fetch(`${base}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      plan_id: planId,
      custom_id: customId,
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const details = data?.details?.[0];
    const msg = details?.description || details?.issue || data?.message || "Failed to create subscription";
    throw new Error(msg);
  }
  const links = data?.links || [];
  const approveLink = links.find((l) => l.rel === "approve" && l.href);
  if (!approveLink?.href) {
    throw new Error("No approval URL from PayPal");
  }
  return { approvalUrl: approveLink.href };
}

/** Cancel a PayPal subscription. Stops renewal; user keeps access until period end. */
export async function cancelPayPalSubscription(subscriptionId, reason = "Customer requested cancellation") {
  const mode = process.env.PAYPAL_MODE || "sandbox";
  const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const token = await getPayPalAccessToken();
  const res = await fetch(`${base}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const body = await res.text();
    let errMsg = "Failed to cancel subscription";
    try {
      const err = JSON.parse(body);
      errMsg = err.message || err.details?.[0]?.description || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
}

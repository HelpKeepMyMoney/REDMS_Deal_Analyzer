/**
 * PayPal subscription cancel via REST API (no SDK).
 * Used by admin-handler and cron; avoids loading @paypal/paypal-server-sdk
 * which can fail in some serverless environments.
 */

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

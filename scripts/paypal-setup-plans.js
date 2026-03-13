/**
 * Create PayPal products and subscription plans via API (sandbox).
 * Run: node scripts/paypal-setup-plans.js
 * Requires: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE in .env
 *
 * Optional: PAYPAL_PRODUCT_ID - use existing product (e.g. PROD-xxx) instead of creating one.
 *
 * Creates one product (if needed) and 6 plans (investor/pro/wholesaler × monthly/annual).
 * Outputs plan IDs to add to .env.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Load .env
try {
  const env = readFileSync(resolve(root, ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch (e) {
  console.warn("Could not load .env:", e.message);
}

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_MODE = process.env.PAYPAL_MODE || "sandbox";
const BASE = PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  console.error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in .env");
  process.exit(1);
}

async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || JSON.stringify(data));
  return data.access_token;
}

async function createProduct(token) {
  const res = await fetch(`${BASE}/v1/catalogs/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      name: "REDMS Subscription",
      description: "Real Estate Deal Management System subscription plans",
      type: "SERVICE",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  return data.id;
}

const PLANS = [
  { plan: "investor", cycle: "monthly", name: "Investor Monthly", price: "39", interval: "MONTH", count: 1 },
  { plan: "investor", cycle: "annual", name: "Investor Annual", price: "390", interval: "YEAR", count: 1 },
  { plan: "pro", cycle: "monthly", name: "Pro Monthly", price: "99", interval: "MONTH", count: 1 },
  { plan: "pro", cycle: "annual", name: "Pro Annual", price: "990", interval: "YEAR", count: 1 },
  { plan: "wholesaler", cycle: "monthly", name: "Wholesaler Monthly", price: "149", interval: "MONTH", count: 1 },
  { plan: "wholesaler", cycle: "annual", name: "Wholesaler Annual", price: "1490", interval: "YEAR", count: 1 },
];

async function createPlan(token, productId, { plan, cycle, name, price, interval, count }) {
  const res = await fetch(`${BASE}/v1/billing/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      product_id: productId,
      name,
      description: `${name} - REDMS`,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: { interval_unit: interval, interval_count: count },
          tenure_type: "REGULAR",
          sequence: 1,
          pricing_scheme: {
            fixed_price: { value: price, currency_code: "USD" },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 1,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || (data.details?.[0]?.description) || JSON.stringify(data));
  return data.id;
}

async function main() {
  console.log("PayPal plan setup (mode:", PAYPAL_MODE, ")\n");

  const token = await getAccessToken();
  console.log("Got access token");

  let productId = process.env.PAYPAL_PRODUCT_ID;
  if (productId) {
    console.log("Using existing product:", productId);
  } else {
    productId = await createProduct(token);
    console.log("Created product:", productId);
  }

  const planIds = {};
  for (const p of PLANS) {
    const id = await createPlan(token, productId, p);
    planIds[`${p.plan}:${p.cycle}`] = id;
    console.log(`  ${p.name}: ${id}`);
  }

  console.log("\nAdd these to your .env:\n");
  console.log("PAYPAL_PLAN_INVESTOR_MONTHLY=" + planIds["investor:monthly"]);
  console.log("PAYPAL_PLAN_INVESTOR_ANNUAL=" + planIds["investor:annual"]);
  console.log("PAYPAL_PLAN_PRO_MONTHLY=" + planIds["pro:monthly"]);
  console.log("PAYPAL_PLAN_PRO_ANNUAL=" + planIds["pro:annual"]);
  console.log("PAYPAL_PLAN_WHOLESALER_MONTHLY=" + planIds["wholesaler:monthly"]);
  console.log("PAYPAL_PLAN_WHOLESALER_ANNUAL=" + planIds["wholesaler:annual"]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

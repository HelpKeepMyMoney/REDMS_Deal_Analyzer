/**
 * PayPal client for subscription and order APIs.
 * Uses @paypal/paypal-server-sdk with env: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE
 */
import {
  Client,
  Environment,
  SubscriptionsController,
  OrdersController,
} from "@paypal/paypal-server-sdk";

let _client = null;
let _subsController = null;
let _ordersController = null;

export function getPayPalClient() {
  if (_client) return _client;
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const mode = process.env.PAYPAL_MODE || "sandbox";
  if (!clientId || !clientSecret) {
    throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");
  }
  _client = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: clientId,
      oAuthClientSecret: clientSecret,
    },
    environment: mode === "live" ? Environment.Production : Environment.Sandbox,
  });
  return _client;
}

export function getSubscriptionsController() {
  if (!_subsController) {
    _subsController = new SubscriptionsController(getPayPalClient());
  }
  return _subsController;
}

export function getOrdersController() {
  if (!_ordersController) {
    _ordersController = new OrdersController(getPayPalClient());
  }
  return _ordersController;
}

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

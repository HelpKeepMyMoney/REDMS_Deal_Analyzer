/**
 * Admin: get or set user config (deal params overrides). GET returns paramsOverrides; POST sets them.
 */
import { getAdminFirestore } from "../../lib/firebase-admin.js";
import { requireAdmin } from "../../lib/requireAdmin.js";

const SCALAR_KEYS = [
  "maxTpc", "minLoanAmount", "minFlipCoCPct", "minBhCoCPct", "minWholesaleFee",
  "detroitTaxSevRatio", "detroitTaxRate", "detroitTaxFlat",
  "referralFraction", "initialReferralPct", "investorReferralPct", "mortgagePointsRate",
  "minAcqMgmtFee", "minRealtorFee",
  "depreciationYears", "depreciationLandFraction", "depreciationMinBasis",
];

function filterOverrides(obj) {
  if (!obj || typeof obj !== "object") return {};
  const out = {};
  for (const k of SCALAR_KEYS) {
    if (obj[k] != null && typeof obj[k] === "number" && !isNaN(obj[k])) {
      out[k] = obj[k];
    }
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }

  const uid = req.method === "GET" ? req.query?.uid : req.body?.uid;
  if (!uid) {
    return res.status(400).json({ error: "uid required" });
  }

  try {
    const db = getAdminFirestore();
    const ref = db.doc(`userConfig/${uid}`);

    if (req.method === "GET") {
      const snap = await ref.get();
      const data = snap.data();
      const overrides = data?.paramsOverrides ?? {};
      return res.status(200).json({ paramsOverrides: overrides });
    }

    const { paramsOverrides } = req.body || {};
    const filtered = filterOverrides(paramsOverrides);
    await ref.set(
      { paramsOverrides: filtered, updatedAt: new Date() },
      { merge: true }
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("set-user-config error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

/**
 * Consolidated admin API handler. Handles list-users, create-user, delete-user, set-role, set-user-config.
 * Also handles account delete (self) when action=delete-user&self=1.
 * Routes via vercel.json rewrites: /api/admin/* and /api/account/delete -> /api/admin-handler?action=...
 */
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminFirestore } from "../lib/firebase-admin.js";
import { requireAdmin } from "../lib/requireAdmin.js";
import { requireAuth } from "../lib/requireAuth.js";
import { cancelPayPalSubscription } from "../lib/paypal-cancel.js";

const VALID_ROLES = ["free", "investor", "pro", "client", "wholesaler", "admin"];

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

async function doDeleteUser(uid, auth, db, cancelSubscription = false) {
  if (cancelSubscription) {
    const tierDoc = await db.doc(`userTiers/${uid}`).get();
    const subscriptionId = tierDoc.data()?.subscriptionId;
    if (subscriptionId) {
      try {
        await cancelPayPalSubscription(subscriptionId, "Account deleted");
      } catch (e) {
        console.warn("Could not cancel PayPal subscription during account delete:", e);
      }
    }
  }
  const batch = db.batch();
  batch.delete(db.doc(`admins/${uid}`));
  batch.delete(db.doc(`wholesalers/${uid}`));
  batch.delete(db.doc(`clients/${uid}`));
  batch.delete(db.doc(`userTiers/${uid}`));
  batch.delete(db.doc(`dealUsage/${uid}`));
  batch.delete(db.doc(`users/${uid}`));
  batch.delete(db.doc(`signupNotifications/${uid}`));
  await batch.commit();
  await auth.deleteUser(uid);
}

export default async function handler(req, res) {
  const action = req.query?.action;
  const isSelfDelete = req.query?.self === "1";

  if (action === "list-users") {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }
    try {
      await requireAdmin(req);
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }
    try {
      const auth = getAdminAuth();
      const db = getAdminFirestore();
      const users = [];
      let nextPageToken;
      do {
        const result = await auth.listUsers(1000, nextPageToken);
        for (const u of result.users) {
          const [adminDoc, wholesalerDoc, clientDoc, userTiersDoc] = await Promise.all([
            db.doc(`admins/${u.uid}`).get(),
            db.doc(`wholesalers/${u.uid}`).get(),
            db.doc(`clients/${u.uid}`).get(),
            db.doc(`userTiers/${u.uid}`).get(),
          ]);
          const tier = userTiersDoc.data()?.tier;
          const role = adminDoc.exists ? "admin" : wholesalerDoc.exists ? "wholesaler" : clientDoc.exists ? "client"
            : tier && ["investor", "pro", "wholesaler"].includes(tier) ? tier : "free";
          users.push({ uid: u.uid, email: u.email, role, created: u.metadata.creationTime });
        }
        nextPageToken = result.pageToken;
      } while (nextPageToken);
      return res.status(200).json({ users });
    } catch (err) {
      console.error("list-users error:", err);
      return res.status(500).json({ error: err.message || "Internal error" });
    }
  }

  if (action === "create-user") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }
    try {
      await requireAdmin(req);
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }
    const { email, password, role } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }
    const effectiveRole = role && VALID_ROLES.includes(role) ? role : "free";
    try {
      const auth = getAdminAuth();
      const db = getAdminFirestore();
      const userRecord = await auth.createUser({ email, password });
      const uid = userRecord.uid;
      if (effectiveRole === "admin") {
        await db.doc(`admins/${uid}`).set({});
      } else if (effectiveRole === "wholesaler") {
        await db.doc(`wholesalers/${uid}`).set({});
        await db.doc(`userTiers/${uid}`).set({ tier: "wholesaler", upgradedByAdmin: true }, { merge: true });
      } else if (effectiveRole === "client") {
        await db.doc(`clients/${uid}`).set({});
      } else if (effectiveRole === "investor" || effectiveRole === "pro") {
        await db.doc(`userTiers/${uid}`).set({ tier: effectiveRole, upgradedByAdmin: true }, { merge: true });
      }
      return res.status(200).json({ uid });
    } catch (err) {
      console.error("create-user error:", err);
      return res.status(500).json({ error: err.message || "Internal error" });
    }
  }

  if (action === "delete-user") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }
    let decoded;
    if (isSelfDelete) {
      try {
        decoded = await requireAuth(req);
      } catch (err) {
        return res.status(err.status || 401).json({ error: err.message });
      }
      if (req.body?.uid && req.body.uid !== decoded.uid) {
        return res.status(403).json({ error: "Cannot delete another user" });
      }
    } else {
      try {
        decoded = await requireAdmin(req);
      } catch (err) {
        return res.status(err.status || 500).json({ error: err.message });
      }
    }
    const uid = isSelfDelete ? decoded.uid : req.body?.uid;
    if (!uid) {
      return res.status(400).json({ error: "uid required" });
    }
    if (!isSelfDelete && uid === decoded.uid) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }
    try {
      const auth = getAdminAuth();
      const db = getAdminFirestore();
      await doDeleteUser(uid, auth, db, isSelfDelete);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("delete-user error:", err);
      const msg = err.code === "auth/user-not-found" ? "User not found" : err.message || "Internal error";
      return res.status(500).json({ error: msg });
    }
  }

  if (action === "set-role") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }
    try {
      await requireAdmin(req);
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }
    const { uid, role } = req.body || {};
    if (!uid) return res.status(400).json({ error: "uid required" });
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` });
    try {
      const db = getAdminFirestore();
      const adminRef = db.doc(`admins/${uid}`);
      const wholesalerRef = db.doc(`wholesalers/${uid}`);
      const clientRef = db.doc(`clients/${uid}`);
      const userTiersRef = db.doc(`userTiers/${uid}`);
      const dealUsageRef = db.doc(`dealUsage/${uid}`);
      if (role === "admin") {
        await adminRef.set({});
        await wholesalerRef.delete();
        await clientRef.delete();
        await userTiersRef.delete();
      } else if (role === "wholesaler") {
        await wholesalerRef.set({});
        await adminRef.delete();
        await clientRef.delete();
        await userTiersRef.set({ tier: "wholesaler", upgradedByAdmin: true }, { merge: true });
      } else if (role === "client") {
        await clientRef.set({});
        await adminRef.delete();
        await wholesalerRef.delete();
        await userTiersRef.delete();
      } else if (role === "investor" || role === "pro") {
        await adminRef.delete();
        await wholesalerRef.delete();
        await clientRef.delete();
        await userTiersRef.set({ tier: role, upgradedByAdmin: true }, { merge: true });
      } else {
        await adminRef.delete();
        await wholesalerRef.delete();
        await clientRef.delete();
        await userTiersRef.delete();
      }
      if (role === "free") {
        await dealUsageRef.set({
          totalAnalysesCount: 0,
          monthlyCounts: {},
          overagePaidCounts: {},
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("set-role error:", err);
      return res.status(500).json({ error: err.message || "Internal error" });
    }
  }

  if (action === "user-config") {
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
    if (!uid) return res.status(400).json({ error: "uid required" });
    try {
      const db = getAdminFirestore();
      const ref = db.doc(`userConfig/${uid}`);
      if (req.method === "GET") {
        const snap = await ref.get();
        const overrides = snap.data()?.paramsOverrides ?? {};
        return res.status(200).json({ paramsOverrides: overrides });
      }
      const { paramsOverrides } = req.body || {};
      await ref.set({ paramsOverrides: filterOverrides(paramsOverrides), updatedAt: new Date() }, { merge: true });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("set-user-config error:", err);
      return res.status(500).json({ error: err.message || "Internal error" });
    }
  }

  return res.status(400).json({ error: "Unknown action" });
}

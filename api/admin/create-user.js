import { getAdminAuth, getAdminFirestore } from "../lib/firebase-admin.js";
import { requireAdmin } from "../lib/requireAdmin.js";

export default async function handler(req, res) {
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

  const VALID_ROLES = ["free", "investor", "pro", "client", "wholesaler", "admin"];
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
    // free: no collections needed

    return res.status(200).json({ uid });
  } catch (err) {
    console.error("create-user error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

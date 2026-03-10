import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "../lib/firebase-admin.js";
import { requireAdmin } from "../lib/requireAdmin.js";

const VALID_ROLES = ["free", "investor", "pro", "client", "wholesaler", "admin"];

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

  const { uid, role } = req.body || {};
  if (!uid) {
    return res.status(400).json({ error: "uid required" });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` });
  }

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
      // free
      await adminRef.delete();
      await wholesalerRef.delete();
      await clientRef.delete();
      await userTiersRef.delete();
    }

    // When setting role to free: reset deal usage to give them 3 deals (not lifetime/unlimited)
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

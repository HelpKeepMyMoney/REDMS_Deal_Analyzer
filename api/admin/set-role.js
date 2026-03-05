import { getAdminFirestore } from "../lib/firebase-admin.js";
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

  const { uid, role } = req.body || {};
  if (!uid) {
    return res.status(400).json({ error: "uid required" });
  }

  try {
    const db = getAdminFirestore();
    const adminRef = db.doc(`admins/${uid}`);
    const wholesalerRef = db.doc(`wholesalers/${uid}`);

    if (role === "admin") {
      await adminRef.set({});
    } else if (role === "wholesaler") {
      await wholesalerRef.set({});
    } else {
      await adminRef.delete();
      await wholesalerRef.delete();
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("set-role error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

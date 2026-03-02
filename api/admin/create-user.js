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

  try {
    const auth = getAdminAuth();
    const db = getAdminFirestore();
    const userRecord = await auth.createUser({ email, password });

    if (role === "admin") {
      await db.doc(`admins/${userRecord.uid}`).set({});
    }

    return res.status(200).json({ uid: userRecord.uid });
  } catch (err) {
    console.error("create-user error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

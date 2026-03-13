/**
 * Delete a user from Firebase Auth and clean up related Firestore documents.
 * Admin only. Cannot delete self.
 */
import { getAdminAuth, getAdminFirestore } from "../../lib/firebase-admin.js";
import { requireAdmin } from "../../lib/requireAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let decoded;
  try {
    decoded = await requireAdmin(req);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }

  const { uid } = req.body || {};
  if (!uid) {
    return res.status(400).json({ error: "uid required" });
  }

  if (uid === decoded.uid) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }

  try {
    const auth = getAdminAuth();
    const db = getAdminFirestore();

    // Delete role/tier documents so user won't appear in list-users
    const batch = db.batch();
    batch.delete(db.doc(`admins/${uid}`));
    batch.delete(db.doc(`wholesalers/${uid}`));
    batch.delete(db.doc(`clients/${uid}`));
    batch.delete(db.doc(`userTiers/${uid}`));
    batch.delete(db.doc(`dealUsage/${uid}`));
    batch.delete(db.doc(`users/${uid}`));
    batch.delete(db.doc(`signupNotifications/${uid}`));
    await batch.commit();

    // Delete user from Firebase Auth
    await auth.deleteUser(uid);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("delete-user error:", err);
    const msg = err.code === "auth/user-not-found" ? "User not found" : err.message || "Internal error";
    return res.status(500).json({ error: msg });
  }
}

/**
 * User deletes their own account. Immediately revokes access.
 * Requires auth. User can only delete their own account.
 */
import { getAdminAuth, getAdminFirestore } from "../../lib/firebase-admin.js";
import { requireAuth } from "../../lib/requireAuth.js";
import { cancelPayPalSubscription } from "../../lib/paypal.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let decoded;
  try {
    decoded = await requireAuth(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  const uid = decoded.uid;

  try {
    const auth = getAdminAuth();
    const db = getAdminFirestore();

    const tierDoc = await db.doc(`userTiers/${uid}`).get();
    const tierData = tierDoc.data();
    const subscriptionId = tierData?.subscriptionId;

    if (subscriptionId) {
      try {
        await cancelPayPalSubscription(subscriptionId, "Account deleted");
      } catch (e) {
        console.warn("Could not cancel PayPal subscription during account delete:", e);
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

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("account delete error:", err);
    const msg = err.code === "auth/user-not-found" ? "User not found" : err.message || "Internal error";
    return res.status(500).json({ error: msg });
  }
}

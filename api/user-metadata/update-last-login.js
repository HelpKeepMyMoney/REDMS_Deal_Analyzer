import { getAdminFirestore } from "../../lib/firebase-admin.js";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "../../lib/requireAuth.js";

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

  try {
    const db = getAdminFirestore();
    const ref = db.collection("userMetadata").doc(decoded.uid);
    await ref.set({ lastLoginAt: FieldValue.serverTimestamp() }, { merge: true });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("update-last-login error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

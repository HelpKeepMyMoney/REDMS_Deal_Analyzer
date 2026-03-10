import { getAdminFirestore } from "../../lib/firebase-admin.js";
import { requireAuth } from "../../lib/requireAuth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
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
    const snap = await db.collection("userMetadata").doc(decoded.uid).get();
    const data = snap.data();
    const lastLoginAt = data?.lastLoginAt?.toDate?.()?.toISOString?.() ?? null;
    return res.status(200).json({ lastLoginAt });
  } catch (err) {
    console.error("last-login error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

/**
 * Public API: returns investor properties for demo (unauthenticated).
 * Uses Firebase Admin SDK to read investorProperties collection.
 * No auth required.
 */
import { getAdminFirestore } from "../../lib/firebase-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = getAdminFirestore();
    const snap = await db.collection("investorProperties").get();

    const list = snap.docs.map((d) => {
      const data = d.data();
      const prop = data.property || {};
      const id = prop.id || d.id;
      const addedAt = data.addedAt?.toMillis?.() ?? 0;
      return { ...prop, id, _addedAt: addedAt };
    });

    list.sort((a, b) => (b._addedAt || 0) - (a._addedAt || 0));
    const properties = list.map(({ _addedAt, ...p }) => p);

    return res.status(200).json({ properties });
  } catch (err) {
    console.error("demo/properties error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

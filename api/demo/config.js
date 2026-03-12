/**
 * Public API: returns app config for demo (unauthenticated).
 * Uses Firebase Admin SDK to read appConfig/params.
 * Falls back to defaults if not found.
 */
import { getAdminFirestore } from "../../lib/firebase-admin.js";
import { mergeConfig } from "../../src/logic/configParams.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = getAdminFirestore();
    const snap = await db.doc("appConfig/params").get();
    const data = snap.exists ? snap.data() : null;
    const config = mergeConfig(data);
    return res.status(200).json({ config });
  } catch (err) {
    console.error("demo/config error:", err);
    const config = mergeConfig(null);
    return res.status(200).json({ config });
  }
}

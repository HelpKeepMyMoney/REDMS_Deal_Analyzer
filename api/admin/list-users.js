import { getAdminAuth, getAdminFirestore } from "../lib/firebase-admin.js";
import { requireAdmin } from "../lib/requireAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }

  try {
    const auth = getAdminAuth();
    const db = getAdminFirestore();
    const users = [];
    let nextPageToken;

    do {
      const result = await auth.listUsers(1000, nextPageToken);
      for (const u of result.users) {
        const adminDoc = await db.doc(`admins/${u.uid}`).get();
        users.push({
          uid: u.uid,
          email: u.email,
          role: adminDoc.exists ? "admin" : "user",
          created: u.metadata.creationTime,
        });
      }
      nextPageToken = result.pageToken;
    } while (nextPageToken);

    return res.status(200).json({ users });
  } catch (err) {
    console.error("list-users error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

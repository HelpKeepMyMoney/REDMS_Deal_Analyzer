import { getAdminAuth, getAdminFirestore } from "../../lib/firebase-admin.js";
import { requireAdmin } from "../../lib/requireAdmin.js";

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
        const [adminDoc, wholesalerDoc, clientDoc, userTiersDoc] = await Promise.all([
          db.doc(`admins/${u.uid}`).get(),
          db.doc(`wholesalers/${u.uid}`).get(),
          db.doc(`clients/${u.uid}`).get(),
          db.doc(`userTiers/${u.uid}`).get(),
        ]);
        const tier = userTiersDoc.data()?.tier;
        const role = adminDoc.exists
          ? "admin"
          : wholesalerDoc.exists
            ? "wholesaler"
            : clientDoc.exists
              ? "client"
              : tier && ["investor", "pro"].includes(tier)
                ? tier
                : "free";
        users.push({
          uid: u.uid,
          email: u.email,
          role,
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

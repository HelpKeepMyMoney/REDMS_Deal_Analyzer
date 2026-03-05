/**
 * Sends an email notification to admins when a new user signs up.
 * Called by the client after successful signup. Uses same Resend + ADMIN_NOTIFICATION_EMAIL as interest notifications.
 */
import { getAdminAuth, getAdminFirestore } from "../lib/firebase-admin.js";
import { requireAuth } from "../lib/requireAuth.js";
import { sendEmail } from "../lib/resend.js";

const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "helpkeepmymoney@gmail.com";

async function getAdminEmails() {
  const auth = getAdminAuth();
  const db = getAdminFirestore();
  const adminsSnap = await db.collection("admins").get();
  const emails = new Set([ADMIN_NOTIFICATION_EMAIL]);
  for (const doc of adminsSnap.docs) {
    const uid = doc.id;
    try {
      const userRecord = await auth.getUser(uid);
      if (userRecord?.email) emails.add(userRecord.email);
    } catch (e) {
      console.warn("Could not get email for admin", uid, e.message);
    }
  }
  return Array.from(emails);
}

function buildEmailHtml(userEmail, userId) {
  const appUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://redms-deal-analyzer.vercel.app";

  return `
    <div style="font-family: sans-serif; max-width: 600px;">
      <h2>REDMS: New User Signup</h2>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p><strong>User ID:</strong> ${userId}</p>
      <p style="margin-top: 24px;">
        <a href="${appUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">View in REDMS</a>
      </p>
    </div>
  `;
}

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

  const { email: userEmail, uid: userId } = decoded;
  if (!userEmail) {
    return res.status(400).json({ error: "User email not found in token" });
  }

  try {
    const db = getAdminFirestore();
    const sentRef = db.doc(`signupNotifications/${userId}`);
    const sentSnap = await sentRef.get();
    if (sentSnap.exists) {
      return res.status(200).json({ success: true, alreadySent: true });
    }

    const adminEmails = await getAdminEmails();
    if (adminEmails.length > 0) {
      const html = buildEmailHtml(userEmail, userId);
      const subject = `REDMS: New User Signup - ${userEmail}`;
      const { error } = await sendEmail({ to: adminEmails, subject, html });
      if (error) {
        console.warn("Failed to send signup notification email:", error);
        return res.status(500).json({ error: "Failed to send notification" });
      }
    }

    await sentRef.set({ sentAt: new Date().toISOString(), userEmail });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("signup-notification error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

import { getAdminAuth, getAdminFirestore } from "../lib/firebase-admin.js";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "../lib/requireAuth.js";
import { sendEmail } from "../lib/resend.js";

const VALID_TYPES = ["request_analysis", "favorite", "request_zoom", "start_buying", "request_wholesaler_access"];

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

function isAdmin(db, uid) {
  return db.doc(`admins/${uid}`).get().then((d) => d.exists);
}

function buildEmailHtml(payload) {
  const { type, userEmail, message, propertySnapshot, dealName, dealId } = payload;
  const appUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://redms-deal-analyzer.vercel.app";

  let details = "";
  if (type === "request_analysis" && propertySnapshot) {
    const p = propertySnapshot;
    const addr = [p.addressLine1, p.city, p.state, p.zipCode].filter(Boolean).join(", ");
    details = `
      <p><strong>Property:</strong> ${addr || "N/A"}</p>
      <p>Price: $${(p.price || 0).toLocaleString()} | Beds: ${p.bedrooms ?? "—"} | Baths: ${p.bathrooms ?? "—"} | Sqft: ${p.squareFootage ?? "—"}</p>
    `;
  } else if (dealId) {
    details = `<p><strong>Deal:</strong> ${dealName || dealId}</p>`;
  }

  const actionLabels = {
    request_analysis: "Request Deal Analysis",
    favorite: "Saved to Favorites",
    request_zoom: "Zoom meeting request",
    start_buying: "Purchase Interest",
    request_wholesaler_access: "Request Wholesaler Access",
  };

  return `
    <div style="font-family: sans-serif; max-width: 600px;">
      <h2>REDMS Interest Request</h2>
      <p><strong>From:</strong> ${userEmail}</p>
      <p><strong>Action:</strong> ${actionLabels[type] || type}</p>
      ${details}
      ${message ? `<p><strong>Message:</strong><br/>${message.replace(/\n/g, "<br/>")}</p>` : ""}
      <p style="margin-top: 24px;">
        <a href="${appUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">View in REDMS</a>
      </p>
    </div>
  `;
}

function buildEmailSubject(payload) {
  const { type, userEmail, propertySnapshot, dealName } = payload;
  const dealRef = dealName || "deal";
  if (type === "request_analysis" && propertySnapshot) {
    const addr = [propertySnapshot.addressLine1, propertySnapshot.city, propertySnapshot.state]
      .filter(Boolean)
      .join(", ");
    return `REDMS: Request Deal Analysis - ${userEmail} - ${addr || "property"}`;
  }
  const subjectLabels = {
    favorite: "Saved to Favorites",
    request_zoom: "Zoom meeting request",
    start_buying: "Purchase Interest",
    request_wholesaler_access: "Request Wholesaler Access",
  };
  const label = subjectLabels[type] || type;
  return `REDMS: ${label} - ${userEmail} - ${dealRef}`;
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

  const { type, message, propertySnapshot, dealId, dealName } = req.body || {};
  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: "Invalid type. Must be one of: " + VALID_TYPES.join(", ") });
  }

  if (type !== "request_analysis" && type !== "request_wholesaler_access" && !dealId) {
    return res.status(400).json({ error: "dealId required for deal-level actions" });
  }

  if (type === "request_analysis" && !propertySnapshot) {
    return res.status(400).json({ error: "propertySnapshot required for request_analysis" });
  }

  const db = getAdminFirestore();
  const userIsAdmin = await isAdmin(db, decoded.uid);
  if (type === "request_analysis" && userIsAdmin) {
    return res.status(400).json({
      error: "Admins can analyze properties directly. Use the Analyze Deal button.",
    });
  }

  const userIsWholesaler = await db.doc(`wholesalers/${decoded.uid}`).get().then((d) => d.exists);
  if (type === "request_wholesaler_access" && userIsWholesaler) {
    return res.status(400).json({
      error: "You already have Wholesaler access.",
    });
  }

  const payload = {
    type,
    userId: decoded.uid,
    userEmail: decoded.email || "unknown",
    message: (message || "").trim() || null,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
    propertySnapshot: type === "request_analysis" ? propertySnapshot : null,
    dealId: dealId || null,
    dealName: dealName || null,
  };

  try {
    const ref = await db.collection("interestRequests").add(payload);
    const id = ref.id;

    if (type === "favorite" && dealId) {
      await db.collection("userFavorites").add({
        userId: decoded.uid,
        dealId,
        dealName: dealName || null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    const adminEmails = await getAdminEmails();
    if (adminEmails.length > 0) {
      const html = buildEmailHtml(payload);
      const subject = buildEmailSubject(payload);
      const { error } = await sendEmail({ to: adminEmails, subject, html });
      if (error) {
        console.warn("Failed to send interest notification email:", error);
      }
    }

    return res.status(200).json({ id, success: true });
  } catch (err) {
    console.error("interest/create error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

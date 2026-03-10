/**
 * Verify Firebase ID token and ensure user is admin.
 * Returns decoded token or throws.
 */
import { getAdminAuth, getAdminFirestore } from "./firebase-admin.js";

export async function requireAdmin(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    const err = new Error("Missing or invalid Authorization header");
    err.status = 401;
    throw err;
  }

  const token = authHeader.slice(7);
  const auth = getAdminAuth();
  const db = getAdminFirestore();

  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch (e) {
    const err = new Error("Invalid or expired token");
    err.status = 401;
    throw err;
  }

  const adminDoc = await db.doc(`admins/${decoded.uid}`).get();
  if (!adminDoc.exists) {
    const err = new Error("Admin access required");
    err.status = 403;
    throw err;
  }

  return decoded;
}

/**
 * Verify Firebase ID token (any authenticated user).
 * Returns decoded token or throws.
 */
import { getAdminAuth } from "./firebase-admin.js";

export async function requireAuth(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    const err = new Error("Missing or invalid Authorization header");
    err.status = 401;
    throw err;
  }

  const token = authHeader.slice(7);
  const auth = getAdminAuth();

  try {
    return await auth.verifyIdToken(token);
  } catch (e) {
    const err = new Error("Invalid or expired token");
    err.status = 401;
    throw err;
  }
}

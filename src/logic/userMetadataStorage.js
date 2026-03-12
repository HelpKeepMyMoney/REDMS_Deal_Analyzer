const STORAGE_KEY_PREFIX = "redms_lastLoginAt_";

function getLocalLastLoginAt(userId) {
  if (!userId || typeof localStorage === "undefined") return null;
  try {
    const val = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    return val || null;
  } catch {
    return null;
  }
}

function setLocalLastLoginAt(userId) {
  if (!userId || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, new Date().toISOString());
  } catch {}
}

/**
 * Get user's last login timestamp (ISO string or null).
 * Uses API route first; falls back to localStorage when API is unavailable (e.g. local dev).
 * @param {() => Promise<string>} getIdToken - Function that returns the current user's ID token
 * @param {string} [userId] - User's Firebase UID (required for localStorage fallback)
 */
export async function getLastLoginAt(getIdToken, userId) {
  if (!getIdToken) return userId ? getLocalLastLoginAt(userId) : null;
  try {
    const token = await getIdToken();
    const res = await fetch("/api/user-metadata", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.lastLoginAt) return data.lastLoginAt;
    if (userId) return getLocalLastLoginAt(userId);
    return null;
  } catch (e) {
    console.warn("getLastLoginAt error:", e);
    if (userId) return getLocalLastLoginAt(userId);
    return null;
  }
}

/**
 * Set user's last login timestamp to now (call when user dismisses new-deals notification).
 * Uses API route first; falls back to localStorage when API is unavailable so dismissal persists.
 * @param {string} userId - User's Firebase UID
 * @param {() => Promise<string>} getIdToken - Function that returns the current user's ID token
 */
export async function setLastLoginAt(userId, getIdToken) {
  if (!userId) throw new Error("userId required");
  if (!getIdToken) throw new Error("getIdToken required");
  try {
    const token = await getIdToken();
    const res = await fetch("/api/user-metadata", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setLocalLastLoginAt(userId);
      return;
    }
  } catch (e) {
    console.warn("setLastLoginAt API error:", e);
  }
  setLocalLastLoginAt(userId);
}

/**
 * Get user's last login timestamp (ISO string or null).
 * Uses API route to avoid client-side Firestore read permission issues.
 * @param {() => Promise<string>} getIdToken - Function that returns the current user's ID token
 */
export async function getLastLoginAt(getIdToken) {
  if (!getIdToken) return null;
  try {
    const token = await getIdToken();
    const res = await fetch("/api/user-metadata/last-login", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    return data.lastLoginAt ?? null;
  } catch (e) {
    console.warn("getLastLoginAt error:", e);
    return null;
  }
}

/**
 * Set user's last login timestamp to now (call when user dismisses new-deals notification).
 * Uses API route to avoid client-side Firestore write permission issues.
 * @param {string} userId - User's Firebase UID
 * @param {() => Promise<string>} getIdToken - Function that returns the current user's ID token
 */
export async function setLastLoginAt(userId, getIdToken) {
  if (!userId) throw new Error("userId required");
  if (!getIdToken) throw new Error("getIdToken required");
  const token = await getIdToken();
  const res = await fetch("/api/user-metadata/update-last-login", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || res.statusText || "Failed to update last login");
  }
}

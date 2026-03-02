/**
 * Admin API client for Vercel serverless functions.
 * Replaces Firebase callable functions (listUsers, createUser, setUserRole).
 */

/**
 * @param {() => Promise<string>} getIdToken - Function that returns the current user's ID token
 */
export function createAdminApi(getIdToken) {
  async function fetchWithAuth(url, options = {}) {
    const token = await getIdToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || res.statusText || "Request failed");
      err.code = res.status === 401 ? "unauthenticated" : res.status === 403 ? "permission-denied" : "internal";
      throw err;
    }
    return data;
  }

  return {
    async listUsers() {
      return fetchWithAuth("/api/admin/list-users");
    },
    async createUser({ email, password, role }) {
      return fetchWithAuth("/api/admin/create-user", {
        method: "POST",
        body: JSON.stringify({ email, password, role }),
      });
    },
    async setUserRole({ uid, role }) {
      return fetchWithAuth("/api/admin/set-role", {
        method: "POST",
        body: JSON.stringify({ uid, role }),
      });
    },
  };
}

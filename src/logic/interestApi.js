/**
 * Client-side API for interest requests (request analysis, favorite, zoom, buy).
 * Uses Firebase ID token for auth.
 */

/**
 * @param {() => Promise<string>} getIdToken - Function that returns the current user's ID token
 */
export function createInterestApi(getIdToken) {
  async function fetchWithAuth(options = {}) {
    const token = await getIdToken();
    const res = await fetch("/api/interest/create", {
      ...options,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: options.body ?? JSON.stringify(options.json ?? {}),
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
    /**
     * @param {{ type: string; message?: string; propertySnapshot?: object; dealId?: string; dealName?: string }} payload
     */
    async createInterest(payload) {
      return fetchWithAuth({
        body: JSON.stringify(payload),
      });
    },
  };
}

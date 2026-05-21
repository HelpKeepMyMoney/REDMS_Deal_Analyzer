import { buildStreetViewUrlFromAddress, formatAddressForStreetView } from "./propertySearchApi.js";

/**
 * Fetches a Street View image URL for a deal address.
 * Uses the authenticated /api/streetview route when available, with a client-side fallback.
 *
 * @param {object} inp - Deal input with street, city, state, zipCode
 * @param {() => Promise<string>} getIdToken
 * @returns {Promise<string>}
 */
export async function fetchStreetViewUrl(inp, getIdToken) {
  const address = formatAddressForStreetView(inp);
  if (!address) {
    throw new Error("Enter a street address before loading Street View.");
  }

  if (typeof getIdToken === "function") {
    try {
      const params = new URLSearchParams();
      if (inp?.street) params.set("street", String(inp.street).trim());
      if (inp?.city) params.set("city", String(inp.city).trim());
      if (inp?.state) params.set("state", String(inp.state).trim());
      if (inp?.zipCode) params.set("zipCode", String(inp.zipCode).trim());

      const token = await getIdToken();
      const res = await fetch(`/api/streetview?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.imageUrl) {
        return data.imageUrl;
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error(data.error || "Sign in again to load Street View.");
      }
      if (data.error) {
        throw new Error(data.error);
      }
      if (!res.ok) {
        throw new Error("Failed to load Street View.");
      }
    } catch (e) {
      if (e instanceof TypeError) {
        // Network failure (e.g. npm run dev without vercel dev) — fall through to client URL.
      } else {
        throw e;
      }
    }
  }

  const fallbackUrl = buildStreetViewUrlFromAddress(inp);
  if (!fallbackUrl) {
    throw new Error(
      "Street View is not configured. Add GOOGLE_MAPS_API_KEY to your server environment."
    );
  }
  return fallbackUrl;
}

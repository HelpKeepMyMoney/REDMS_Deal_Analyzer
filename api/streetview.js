/**
 * Authenticated Street View lookup via Google Maps Metadata + Static APIs.
 * Uses server-side GOOGLE_MAPS_API_KEY (falls back to VITE_GOOGLE_MAPS_API_KEY).
 */
import { requireAuth } from "../lib/requireAuth.js";

function getMapsKey() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "";
}

function formatAddress({ street, city, state, zipCode }) {
  const parts = [street, city, state, zipCode]
    .filter(Boolean)
    .map((s) => String(s).trim());
  if (parts.length === 0) return null;
  const address = parts.join(", ");
  return address || null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await requireAuth(req);
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message });
  }

  const key = getMapsKey();
  if (!key) {
    return res.status(503).json({
      error: "Street View is not configured. Add GOOGLE_MAPS_API_KEY to your environment.",
    });
  }

  const location = formatAddress(req.query);
  if (!location) {
    return res.status(400).json({ error: "Address is required." });
  }

  try {
    const metaParams = new URLSearchParams({ location, key });
    const metaRes = await fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?${metaParams.toString()}`
    );
    const meta = await metaRes.json().catch(() => ({}));

    if (meta.status === "ZERO_RESULTS") {
      return res.status(404).json({
        error: "No Street View imagery is available for this address.",
      });
    }

    if (meta.status !== "OK") {
      const message = meta.error_message || meta.status || "Street View request failed";
      if (/invalid.*api key/i.test(message)) {
        return res.status(502).json({
          error: "Google Maps API key is invalid. Create a new key with Street View Static API enabled.",
        });
      }
      return res.status(502).json({ error: message });
    }

    const imageParams = new URLSearchParams({
      size: "800x600",
      location,
      key,
    });
    return res.status(200).json({
      imageUrl: `https://maps.googleapis.com/maps/api/streetview?${imageParams.toString()}`,
    });
  } catch {
    return res.status(502).json({ error: "Failed to reach Google Street View." });
  }
}

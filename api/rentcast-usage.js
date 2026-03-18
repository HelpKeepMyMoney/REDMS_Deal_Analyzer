/**
 * Fetches RentCast API usage from their API if available.
 * RentCast dashboard shows usage at app.rentcast.io - this tries common usage endpoints.
 * Falls back to making a minimal request and parsing response headers.
 */

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.VITE_RENTCAST_API_KEY || process.env.RENTCAST_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ usage: null, source: "no-api-key" });
  }

  // Try RentCast usage/billing endpoint (undocumented - may not exist)
  const endpoints = [
    "https://api.rentcast.io/v1/usage",
    "https://api.rentcast.io/v1/billing/usage",
    "https://api.rentcast.io/v1/account/usage",
  ];

  for (const url of endpoints) {
    try {
      const r = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", "X-Api-Key": apiKey },
      });
      if (r.ok) {
        const data = await r.json();
        const used = data?.used ?? data?.requestsUsed ?? data?.count;
        const limit = data?.limit ?? data?.requestsLimit ?? data?.quota ?? 50;
        if (typeof used === "number" && typeof limit === "number") {
          return res.status(200).json({
            usage: { remaining: Math.max(0, limit - used), used, limit },
            source: "api",
          });
        }
      }
    } catch {
      continue;
    }
  }

  // RentCast doesn't expose usage API - return null so client uses local tracking
  return res.status(200).json({ usage: null, source: "unavailable" });
}

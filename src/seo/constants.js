/**
 * Canonical site origin for SEO (canonical URLs, Open Graph, JSON-LD, sitemap).
 * Set VITE_SITE_URL in .env (e.g. https://your-domain.com) — no trailing slash.
 */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || "https://redms-deal-analyzer.vercel.app"
).replace(/\/$/, "");

export const SEO_TITLE = "REDMS · Real Estate Deal Management System";

export const SEO_DESCRIPTION =
  "REDMS is a real estate deal management system for investors and wholesalers: analyze fix-and-flip and buy-and-hold deals, ROI projections, 30-year cash flow, and professional proforma reports in one platform.";

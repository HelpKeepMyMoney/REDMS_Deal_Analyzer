/**
 * Rent estimation for REDMS Deal Analyzer.
 * Uses heuristic-based estimation (no external API) to avoid rate limits and API costs.
 * Optimized for Detroit Section 8 / single-family rentals with 1% rule sanity checks.
 */

/**
 * Detroit Section 8 / market rent base by bedroom count (approximate 2024 ranges).
 * Used when API is unavailable or address is incomplete.
 */
const DETROIT_RENT_BY_BEDROOMS = {
  0: 650,
  1: 750,
  2: 900,
  3: 1100,
  4: 1250,
  5: 1400,
};

/** Default $/sqft for Detroit single-family when sqft is known. */
const DETROIT_RENT_PER_SQFT = 0.85;

/** Basement adds ~8% to rent (extra livable space). */
const BASEMENT_BONUS_PCT = 8;

/**
 * @deprecated RentCast API removed to avoid excessive API calls. Use estimateRentHeuristic or estimateMonthlyRent instead.
 * Kept for backwards compatibility; always returns null.
 */
export async function fetchRentEstimateFromApi(_property) {
  return null;
}

/**
 * Estimates monthly rent using heuristics (no API).
 * Optimized for Detroit Section 8 single-family rentals.
 *
 * @param {Object} property - Property attributes
 * @param {number} [property.bedrooms] - Bedroom count (default 3)
 * @param {number} [property.bathrooms] - Bathroom count
 * @param {number} [property.sqft] - Square footage
 * @param {string} [property.basement] - "Yes" or "No"
 * @returns {number} Estimated monthly rent
 */
export function estimateRentHeuristic(property) {
  if (!property) return 0;

  const beds = Math.max(0, Math.floor(Number(property.bedrooms) || 3));
  const baths = Number(property.bathrooms) || 1;
  const sqft = Number(property.sqft) || 0;
  const basement = (property.basement || "").toLowerCase() === "yes";

  // Base from bedroom count (Detroit Section 8 typical)
  const baseByBeds = DETROIT_RENT_BY_BEDROOMS[beds] ?? DETROIT_RENT_BY_BEDROOMS[5] + (beds - 5) * 150;
  let rent = baseByBeds;

  // Adjust by sqft if available (blend bedroom-based with sqft-based)
  if (sqft > 0) {
    const sqftBased = sqft * DETROIT_RENT_PER_SQFT;
    rent = 0.6 * rent + 0.4 * sqftBased;
  }

  // Basement bonus
  if (basement) {
    rent *= 1 + BASEMENT_BONUS_PCT / 100;
  }

  // Bathroom bonus (half baths add ~$25)
  const extraBaths = Math.max(0, baths - 1);
  rent += extraBaths * 25;

  return Math.round(Math.max(400, Math.min(3000, rent)));
}

/**
 * Estimates monthly rent using heuristic (no API calls).
 * Uses bedroom count, sqft, and basement for Detroit Section 8 / single-family.
 * @param {Object} property - Property with bedrooms, bathrooms, sqft, basement
 * @returns {Promise<{ rent: number, source: 'heuristic' }>}
 */
export async function estimateMonthlyRent(property) {
  const rent = estimateRentHeuristic(property);
  return { rent, source: "heuristic" };
}

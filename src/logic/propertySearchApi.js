/**
 * Property Search API Service
 * Connects to the RentCast API to search for sale listings (investment properties).
 *
 * To use live data:
 * 1. Sign up at https://rentcast.io
 * 2. Get an API key.
 * 3. Add VITE_RENTCAST_API_KEY=your_key_here to your .env file.
 */

const API_KEY = import.meta.env.VITE_RENTCAST_API_KEY;
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const BASE_URL = "https://api.rentcast.io/v1/listings/sale";
const PROPERTIES_URL = "https://api.rentcast.io/v1/properties";

// Mock data to use when no API key is present
const MOCK_PROPERTIES = [
    {
        id: "mock-1",
        addressLine1: "123 Main St",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        price: 450000,
        bedrooms: 3,
        bathrooms: 2,
        squareFootage: 1800,
        propertyType: "Single Family",
        yearBuilt: 2010,
        lotSize: 5000,
        listedDate: new Date(Date.now() - 86400000 * 14).toISOString(),
        status: "Active",
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "mock-2",
    addressLine1: "456 Oak Ave",
    city: "Austin",
    state: "TX",
    zipCode: "78704",
    price: 320000,
    bedrooms: 2,
    bathrooms: 1.5,
    squareFootage: 1200,
    propertyType: "Condo",
    yearBuilt: 2005,
    lotSize: 0,
    listedDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    status: "Active",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "mock-detroit",
    addressLine1: "1234 Washington Blvd",
    city: "Detroit",
    state: "MI",
    zipCode: "48201",
    price: 85000,
    bedrooms: 3,
    bathrooms: 2,
    squareFootage: 1400,
    propertyType: "Single Family",
    yearBuilt: 1920,
    lotSize: 4000,
    listedDate: new Date(Date.now() - 86400000 * 7).toISOString(),
    status: "Active",
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "mock-3",
    addressLine1: "789 Pine Ln",
    city: "Round Rock",
    state: "TX",
    zipCode: "78664",
    price: 550000,
    bedrooms: 4,
    bathrooms: 3,
    squareFootage: 2400,
    propertyType: "Single Family",
    yearBuilt: 2018,
    lotSize: 8000,
    listedDate: new Date(Date.now() - 86400000 * 12).toISOString(),
    status: "Active",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800",
  },
];

/**
 * Searches for sale listings (investment properties) based on the given criteria.
 * @param {Object} criteria - The search criteria.
 * @param {string} criteria.city - The city to search in.
 * @param {string} criteria.state - The state abbreviation (e.g., "TX").
 * @param {string} criteria.zipCode - The zip code.
 * @param {number} criteria.maxPrice - Maximum property price.
 * @param {number} criteria.minBeds - Minimum number of bedrooms.
 * @param {number} criteria.minBaths - Minimum number of bathrooms.
 * @param {string} criteria.propertyType - Type of property (e.g., "Single Family").
 * @returns {Promise<Array>} Array of property objects.
 */
export async function searchProperties(criteria) {
  if (!API_KEY) {
    console.warn("VITE_RENTCAST_API_KEY is not set. Using mock property data for development.");
    return simulateSearchWithMockData(criteria);
  }

  try {
    const params = new URLSearchParams();

    // Location (at least one required for bulk search)
    if (criteria.city) params.append("city", criteria.city);
    if (criteria.state) params.append("state", criteria.state);
    if (criteria.zipCode) params.append("zipCode", criteria.zipCode);

    if (!criteria.city && !criteria.state && !criteria.zipCode) {
      throw new Error("Please enter at least a city, state, or zip code.");
    }

    // RentCast supports range params: min:max (use * for unbounded)
    const minPrice = criteria.minPrice ? Number(criteria.minPrice) : null;
    const maxPrice = criteria.maxPrice ? Number(criteria.maxPrice) : null;
    if (minPrice != null && !isNaN(minPrice) && maxPrice != null && !isNaN(maxPrice)) {
      params.append("price", `${minPrice}:${maxPrice}`);
    } else if (minPrice != null && !isNaN(minPrice)) {
      params.append("price", `${minPrice}:*`);
    } else if (maxPrice != null && !isNaN(maxPrice)) {
      params.append("price", `*:${maxPrice}`);
    }
    if (criteria.minBeds) {
      params.append("bedrooms", `${Number(criteria.minBeds)}:*`);
    }
    if (criteria.minBaths) {
      params.append("bathrooms", `${Number(criteria.minBaths)}:*`);
    }
    if (criteria.propertyType && criteria.propertyType !== "Any") {
      params.append("propertyType", criteria.propertyType);
    }

    params.append("limit", "50");

    const url = `${BASE_URL}?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Api-Key": API_KEY,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errText || response.statusText}`);
    }

    const data = await response.json();

    // RentCast returns an array of listings directly
    const listings = Array.isArray(data) ? data : data?.listings ?? data?.data ?? [];
    return listings.map(normalizeApiData).filter((prop) => matchFilters(prop, criteria));
  } catch (error) {
    console.error("Error fetching properties from RentCast API:", error);
    throw error;
  }
}

// Placeholder house images when listings don't include photos (RentCast API has no image field)
const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&q=80&w=800",
];

function pickPlaceholderImage(propertyId) {
  if (!propertyId) return PLACEHOLDER_IMAGES[0];
  let hash = 0;
  for (let i = 0; i < propertyId.length; i++) {
    hash = (hash << 5) - hash + propertyId.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % PLACEHOLDER_IMAGES.length;
  return PLACEHOLDER_IMAGES[idx];
}

function extractImageUrl(rawProp) {
  const img =
    rawProp.image ||
    rawProp.imageUrl ||
    rawProp.primaryPhoto ||
    rawProp.primaryImage ||
    (Array.isArray(rawProp.images) && rawProp.images[0]) ||
    (Array.isArray(rawProp.photos) && rawProp.photos[0]) ||
    (rawProp.media?.images?.[0]) ||
    (rawProp.photos?.[0]?.url ?? rawProp.photos?.[0]);
  return typeof img === "string" ? img : img?.url ?? null;
}

/**
 * Builds a Google Street View Static API URL for the given coordinates.
 * Returns null if key or coords are missing.
 */
function buildStreetViewUrl(lat, lng) {
  if (!GOOGLE_MAPS_KEY || lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;
  const params = new URLSearchParams({
    size: "800x600",
    location: `${lat},${lng}`,
    key: GOOGLE_MAPS_KEY,
  });
  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}

/**
 * Builds a Google Street View Static API URL from a property address.
 * Uses street, city, state, zipCode. Returns null if key or address is missing.
 */
export function buildStreetViewUrlFromAddress(inp) {
  if (!GOOGLE_MAPS_KEY) return null;
  const parts = [
    inp?.street,
    inp?.city,
    inp?.state,
    inp?.zipCode,
  ].filter(Boolean).map((s) => String(s).trim());
  if (parts.length === 0) return null;
  const address = parts.join(", ");
  if (!address) return null;
  const params = new URLSearchParams({
    size: "800x600",
    location: address,
    key: GOOGLE_MAPS_KEY,
  });
  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}

/**
 * Normalizes RentCast listing data into our app's format.
 */
function normalizeApiData(rawProp) {
  const listedDate = rawProp.listedDate || rawProp.listed_date || null;
  const id = rawProp.id || Math.random().toString();
  const apiImage = extractImageUrl(rawProp);
  const streetViewUrl = buildStreetViewUrl(rawProp.latitude, rawProp.longitude);
  const placeholder = pickPlaceholderImage(id);
  const imageUrl = apiImage || streetViewUrl || placeholder;
  return {
    id,
    addressLine1: rawProp.addressLine1 || (rawProp.formattedAddress || "").split(",")[0]?.trim() || "",
    city: rawProp.city || "",
    state: rawProp.state || "",
    zipCode: rawProp.zipCode || "",
    price: rawProp.price ?? 0,
    bedrooms: rawProp.bedrooms ?? 0,
    bathrooms: rawProp.bathrooms ?? 0,
    squareFootage: rawProp.squareFootage ?? 0,
    lotSize: rawProp.lotSize ?? 0,
    propertyType: rawProp.propertyType || "Unknown",
    yearBuilt: rawProp.yearBuilt ?? null,
    status: rawProp.status || "Active",
    image: imageUrl,
    imageFallback: streetViewUrl ? placeholder : null,
    listedDate,
    daysOnMarket: rawProp.daysOnMarket ?? null,
  };
}

/**
 * Client-side filter (for mock data or when API doesn't support all filters).
 */
function matchFilters(property, criteria) {
  if (criteria.minPrice && property.price < Number(criteria.minPrice)) return false;
  if (criteria.maxPrice && property.price > Number(criteria.maxPrice)) return false;
  if (criteria.minBeds && property.bedrooms < Number(criteria.minBeds)) return false;
  if (criteria.minBaths && property.bathrooms < Number(criteria.minBaths)) return false;
  if (
    criteria.propertyType &&
    criteria.propertyType !== "Any" &&
    property.propertyType !== criteria.propertyType
  ) {
    const t1 = (property.propertyType || "").replace(/\s+/g, "").toLowerCase();
    const t2 = (criteria.propertyType || "").replace(/\s+/g, "").toLowerCase();
    if (t1 !== t2) return false;
  }
  if (criteria.status === "active") {
    if ((property.status || "").toLowerCase() !== "active") return false;
  } else if (criteria.status === "inactive") {
    if ((property.status || "").toLowerCase() === "active") return false;
  }
  if (criteria.listedAfter && property.listedDate) {
    const listedDate = new Date(property.listedDate);
    const afterDate = new Date(criteria.listedAfter);
    if (isNaN(listedDate.getTime()) || listedDate < afterDate) return false;
  } else if (criteria.listedAfter && !property.listedDate) {
    return false;
  }
  const minDays = Number(criteria.listingsOlderThan) || 0;
  if (minDays > 0) {
    const daysOnMarket = typeof property.daysOnMarket === "number" && !isNaN(property.daysOnMarket)
      ? property.daysOnMarket
      : property.listedDate
        ? Math.floor((Date.now() - new Date(property.listedDate).getTime()) / (24 * 60 * 60 * 1000))
        : null;
    if (daysOnMarket == null || daysOnMarket < minDays) return false;
  }
  return true;
}

/**
 * Fetches property record details from RentCast /properties endpoint.
 * Requires API key. Nationwide coverage.
 */
async function fetchPropertyDetailsRentCast(address) {
  if (!API_KEY || !address || typeof address !== "string") return null;
  const trimmed = address.trim();
  if (!trimmed) return null;

  try {
    const params = new URLSearchParams({ address: trimmed });
    const response = await fetch(`${PROPERTIES_URL}?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Api-Key": API_KEY,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const record = Array.isArray(data) ? data[0] : data;
    if (!record) return null;

    const result = {};

    if (record.assessorID) result.apn = record.assessorID;

    if (record.propertyTaxes && typeof record.propertyTaxes === "object") {
      const years = Object.keys(record.propertyTaxes).map(Number).filter((y) => !isNaN(y));
      const latestYear = Math.max(...years, 0);
      if (latestYear > 0 && record.propertyTaxes[latestYear]?.total != null) {
        const total = Number(record.propertyTaxes[latestYear].total);
        if (!isNaN(total)) {
          result.currentYearTax = total;
          result.newPropertyTax = total;
        }
      }
    }

    if (record.owner?.names && Array.isArray(record.owner.names) && record.owner.names.length > 0) {
      result.propertyOwner = record.owner.names.join(", ");
    }

    if (record.legalDescription) result.legalDescription = record.legalDescription;

    return result;
  } catch (error) {
    console.warn("RentCast property details failed:", error);
    return null;
  }
}

/**
 * Fetches property record details (tax, owner, legal).
 * Detroit, MI only: uses Detroit Open Data (free, no API key).
 * Other areas: returns null (no RentCast).
 *
 * @param {string} address - Full address in format "Street, City, State, Zip"
 * @param {Object} [options] - { city, state } for jurisdiction check
 * @returns {Promise<{apn?: string, currentYearTax?: number, newPropertyTax?: number, propertyOwner?: string, legalDescription?: string}|null>}
 */
export async function fetchPropertyDetails(address, _options = {}) {
  if (!address || typeof address !== "string") return null;
  const trimmed = address.trim();
  if (!trimmed) return null;

  const { fetchPropertyDetailsFromDetroit } = await import("./detroitPropertyApi.js");
  return fetchPropertyDetailsFromDetroit(trimmed);
}

/**
 * Simulates an API call and filters mock data.
 */
async function simulateSearchWithMockData(criteria) {
  return new Promise((resolve) => {
    setTimeout(() => {
      let results = MOCK_PROPERTIES;

      if (criteria.city) {
        results = results.filter((p) =>
          p.city.toLowerCase().includes(criteria.city.toLowerCase())
        );
      }
      if (criteria.state) {
        results = results.filter((p) => p.state.toLowerCase() === criteria.state.toLowerCase());
      }
      if (criteria.zipCode) {
        results = results.filter((p) => p.zipCode.includes(criteria.zipCode));
      }

      results = results.filter((p) => matchFilters(p, criteria));
      resolve(results);
    }, 800);
  });
}

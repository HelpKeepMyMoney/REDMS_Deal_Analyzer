/**
 * Detroit Open Data - Property details from City of Detroit ArcGIS REST API.
 * Free, no API key required. Covers Detroit, MI only.
 * Data source: https://detroitdata.org/dataset/parcels
 */

const DETROIT_PARCELS_URL =
  "https://services2.arcgis.com/qvkbeam7Wirps6zC/arcgis/rest/services/Parcels_Current/FeatureServer/0/query";

/** Detroit total millage ~67 mills (city + county + school). Tax = taxable_value * (millage/1000) */
const DETROIT_MILLAGE_RATE = 0.067;

/** Street suffixes Detroit often omits (e.g. "15810 PRAIRIE" not "15810 PRAIRIE ST") */
const STREET_SUFFIXES = new Set([
  "st", "street", "ave", "avenue", "blvd", "boulevard", "dr", "drive",
  "ln", "lane", "rd", "road", "ct", "court", "pl", "place", "way", "cir", "circle",
  "ter", "terrace", "trl", "trail", "pkwy", "parkway", "hwy", "highway",
]);

/**
 * Extracts street portion from full address.
 * Detroit parcel API stores only street (e.g. "123 Main St"), not "City, State Zip".
 */
function getStreetFromAddress(address) {
  if (!address || typeof address !== "string") return "";
  const trimmed = address.trim();
  const street = trimmed.split(",")[0]?.trim() || trimmed;
  return street;
}

/**
 * Builds ArcGIS where clause for address search.
 * Skips street suffixes (St, Ave, etc.) - Detroit often omits them.
 */
function buildAddressWhereClause(street) {
  if (!street || typeof street !== "string") return null;
  const tokens = street
    .trim()
    .split(/\s+/)
    .filter((t) => {
      const lower = t.toLowerCase();
      return t.length > 0 && !STREET_SUFFIXES.has(lower);
    });
  if (tokens.length === 0) return null;
  const conditions = tokens.map((t) => {
    const escaped = String(t).replace(/'/g, "''");
    return `UPPER(address) LIKE '%${escaped.toUpperCase()}%'`;
  });
  return conditions.join(" AND ");
}

/**
 * Fetches property details from Detroit ArcGIS parcels API.
 * Free, no API key. Covers Detroit, MI only.
 *
 * @param {string} address - Full address (e.g. "123 Main St, Detroit, MI 48201")
 * @param {Object} [options] - Optional city, state for jurisdiction check
 * @returns {Promise<{apn?: string, currentYearTax?: number, newPropertyTax?: number, propertyOwner?: string, legalDescription?: string}|null>}
 */
export async function fetchPropertyDetailsFromDetroit(address, _options = {}) {
  const street = getStreetFromAddress(address);
  const where = buildAddressWhereClause(street);
  if (!where) return null;

  try {
    const params = new URLSearchParams({
      where,
      outFields: "parcel_number,taxpayer_1,taxpayer_2,legal_description,taxable_value,assessed_value,address",
      returnGeometry: "false",
      f: "json",
      resultRecordCount: "5",
    });

    const response = await fetch(`${DETROIT_PARCELS_URL}?${params.toString()}`);

    if (!response.ok) return null;

    const data = await response.json();
    const features = data?.features || [];

    if (features.length === 0) return null;

    const attrs = features[0]?.attributes;
    if (!attrs) return null;

    const result = {};

    if (attrs.parcel_number) result.apn = String(attrs.parcel_number);

    const owners = [attrs.taxpayer_1, attrs.taxpayer_2].filter(Boolean).map(String);
    if (owners.length > 0) result.propertyOwner = owners.join(", ");

    if (attrs.legal_description) result.legalDescription = String(attrs.legal_description);

    const taxableValue = Number(attrs.taxable_value);
    if (!isNaN(taxableValue) && taxableValue > 0) {
      const estimatedTax = taxableValue * DETROIT_MILLAGE_RATE;
      result.currentYearTax = Math.round(estimatedTax);
      result.newPropertyTax = result.currentYearTax;
    }

    return result;
  } catch (error) {
    console.warn("Detroit property API failed:", error);
    return null;
  }
}

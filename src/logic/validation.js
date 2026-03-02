import { RANGES } from "./constants.js";

/**
 * Clamp a numeric input to a valid range. Returns { value, error }.
 * error is a short message if value was clamped or invalid; otherwise null.
 */
export function clampNumber(value, key) {
  const range = RANGES[key];
  if (range == null) {
    const n = Number(value);
    if (isNaN(n)) return { value: 0, error: "Invalid number" };
    if (n < 0 && key !== "annualAppreciation") return { value: 0, error: "Cannot be negative" };
    return { value: n, error: null };
  }
  const n = Number(value);
  if (isNaN(n)) return { value: range[0], error: "Invalid number" };
  const [min, max] = range;
  if (n < min) return { value: min, error: `Min ${min}` };
  if (n > max) return { value: max, error: `Max ${max}` };
  return { value: n, error: null };
}

/**
 * Apply clamping to the full input object for known percentage/capped fields.
 * Non-numeric and text fields are left as-is.
 */
export function sanitizeInput(inp) {
  const out = { ...inp };
  for (const key of Object.keys(RANGES)) {
    if (key in out && typeof out[key] === "number") {
      const { value } = clampNumber(out[key], key);
      out[key] = value;
    }
  }
  if (typeof out.offerPrice === "number" && out.offerPrice < 0) out.offerPrice = 0;
  if (typeof out.totalRent === "number" && out.totalRent < 0) out.totalRent = 0;
  if (typeof out.wholesaleFee === "number" && out.wholesaleFee < 0) out.wholesaleFee = 0;
  if (typeof out.currentYearTax === "number" && out.currentYearTax < 0) out.currentYearTax = 0;
  if (typeof out.inspectionFee === "number" && out.inspectionFee < 0) out.inspectionFee = 0;
  if (typeof out.llcSetup === "number" && out.llcSetup < 0) out.llcSetup = 0;
  if (typeof out.appraisalFee === "number" && out.appraisalFee < 0) out.appraisalFee = 0;
  if (typeof out.settlementCosts === "number" && out.settlementCosts < 0) out.settlementCosts = 0;
  if (typeof out.miscFees === "number" && out.miscFees < 0) out.miscFees = 0;
  if (typeof out.holdingMonthsBuffer === "number" && out.holdingMonthsBuffer < 0) out.holdingMonthsBuffer = 0;
  if (typeof out.bedrooms === "number" && out.bedrooms < 0) out.bedrooms = 0;
  if (typeof out.bathrooms === "number" && out.bathrooms < 0) out.bathrooms = 0;
  if (typeof out.sqft === "number" && out.sqft < 0) out.sqft = 0;
  if (typeof out.lotSize === "number" && out.lotSize < 0) out.lotSize = 0;
  if (typeof out.yearBuilt === "number" && out.yearBuilt < 0) out.yearBuilt = 0;
  if (typeof out.stories === "number" && out.stories < 0) out.stories = 0;
  return out;
}

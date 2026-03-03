/**
 * Merges stored (localStorage) preferences into base input.
 * Used by full analyzer and quick analyzer for consistent defaults.
 */
import { REHAB_COST, REHAB_TIME, DETROIT_TAX_SEV_RATIO, DETROIT_TAX_RATE, DETROIT_TAX_FLAT } from "./constants.js";
import { sanitizeInput } from "./validation.js";

export function mergeStored(base, stored) {
  if (base.address != null && base.street == null) {
    base.street = base.address;
    base.address = undefined;
  }
  if (stored && stored.rehabCost == null && stored.rehabMonths == null && stored.rehabLevel != null) {
    base.rehabCost = REHAB_COST[stored.rehabLevel] ?? 0;
    base.rehabMonths = REHAB_TIME[stored.rehabLevel] ?? 0;
  }
  if (stored && stored.titleInsurancePct != null && (stored.titleInsurance == null || stored.titleInsurance === undefined)) {
    base.titleInsurance = base.offerPrice * (stored.titleInsurancePct / 100);
  }
  if (stored && stored.insurancePct != null && (stored.landlordsInsurance == null || stored.landlordsInsurance === undefined)) {
    const costPlusRehab = (base.offerPrice ?? 0) + (base.rehabCost ?? 0);
    base.landlordsInsurance = costPlusRehab * (stored.insurancePct / 100);
  }
  if (stored && (stored.newPropertyTax == null || stored.newPropertyTax === undefined) && base.offerPrice != null) {
    base.newPropertyTax = base.offerPrice * DETROIT_TAX_SEV_RATIO * DETROIT_TAX_RATE + DETROIT_TAX_FLAT;
  }
  return sanitizeInput(base);
}

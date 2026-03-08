/**
 * App config parameters. Defaults from constants.js; overridable by Firestore appConfig.
 */

import {
  REHAB_COST as DEFAULT_REHAB_COST,
  REHAB_TIME as DEFAULT_REHAB_TIME,
  MAX_TPC as DEFAULT_MAX_TPC,
  MIN_LOAN_AMOUNT as DEFAULT_MIN_LOAN_AMOUNT,
  DETROIT_TAX_SEV_RATIO as DEFAULT_DETROIT_TAX_SEV_RATIO,
  DETROIT_TAX_RATE as DEFAULT_DETROIT_TAX_RATE,
  DETROIT_TAX_FLAT as DEFAULT_DETROIT_TAX_FLAT,
  REFERRAL_FRACTION as DEFAULT_REFERRAL_FRACTION,
  INITIAL_REFERRAL_PCT as DEFAULT_INITIAL_REFERRAL_PCT,
  INVESTOR_REFERRAL_PCT as DEFAULT_INVESTOR_REFERRAL_PCT,
  MORTGAGE_POINTS_RATE as DEFAULT_MORTGAGE_POINTS_RATE,
  MIN_ACQ_MGMT_FEE as DEFAULT_MIN_ACQ_MGMT_FEE,
  MIN_REALTOR_FEE as DEFAULT_MIN_REALTOR_FEE,
  DEPRECIATION_YEARS as DEFAULT_DEPRECIATION_YEARS,
  DEPRECIATION_LAND_FRACTION as DEFAULT_DEPRECIATION_LAND_FRACTION,
  DEPRECIATION_MIN_BASIS as DEFAULT_DEPRECIATION_MIN_BASIS,
  TITLE_INSURANCE_RATES as DEFAULT_TITLE_INSURANCE_RATES,
} from "./constants.js";

/** Wholesaler deal-check defaults (per-property overridable) */
export const DEFAULT_MIN_FLIP_COC_PCT = 25;
export const DEFAULT_MIN_BH_COC_PCT = 10;
export const DEFAULT_MIN_WHOLESALE_FEE = 5000;

/** Default config (matches constants.js). Used when Firestore has no overrides. */
export const DEFAULT_CONFIG = {
  maxTpc: DEFAULT_MAX_TPC,
  minLoanAmount: DEFAULT_MIN_LOAN_AMOUNT,
  minFlipCoCPct: DEFAULT_MIN_FLIP_COC_PCT,
  minBhCoCPct: DEFAULT_MIN_BH_COC_PCT,
  minWholesaleFee: DEFAULT_MIN_WHOLESALE_FEE,
  rehabCost: { ...DEFAULT_REHAB_COST },
  rehabTime: { ...DEFAULT_REHAB_TIME },
  detroitTaxSevRatio: DEFAULT_DETROIT_TAX_SEV_RATIO,
  detroitTaxRate: DEFAULT_DETROIT_TAX_RATE,
  detroitTaxFlat: DEFAULT_DETROIT_TAX_FLAT,
  referralFraction: DEFAULT_REFERRAL_FRACTION,
  initialReferralPct: DEFAULT_INITIAL_REFERRAL_PCT,
  investorReferralPct: DEFAULT_INVESTOR_REFERRAL_PCT,
  mortgagePointsRate: DEFAULT_MORTGAGE_POINTS_RATE,
  minAcqMgmtFee: DEFAULT_MIN_ACQ_MGMT_FEE,
  minRealtorFee: DEFAULT_MIN_REALTOR_FEE,
  depreciationYears: DEFAULT_DEPRECIATION_YEARS,
  depreciationLandFraction: DEFAULT_DEPRECIATION_LAND_FRACTION,
  depreciationMinBasis: DEFAULT_DEPRECIATION_MIN_BASIS,
  titleInsuranceRates: { ...DEFAULT_TITLE_INSURANCE_RATES },
};

/**
 * Merge Firestore doc into default config. Handles nested objects (rehabCost, rehabTime, titleInsuranceRates).
 * @param {Record<string, unknown> | null} firestoreData - Raw doc from appConfig/params
 * @returns {typeof DEFAULT_CONFIG}
 */
export function mergeConfig(firestoreData) {
  if (!firestoreData || typeof firestoreData !== "object") {
    return { ...DEFAULT_CONFIG };
  }
  const out = { ...DEFAULT_CONFIG };
  const scalarKeys = [
    "maxTpc", "minLoanAmount", "minFlipCoCPct", "minBhCoCPct", "minWholesaleFee",
    "detroitTaxSevRatio", "detroitTaxRate", "detroitTaxFlat",
    "referralFraction", "initialReferralPct", "investorReferralPct", "mortgagePointsRate", "minAcqMgmtFee", "minRealtorFee",
    "depreciationYears", "depreciationLandFraction", "depreciationMinBasis",
  ];
  for (const k of scalarKeys) {
    if (firestoreData[k] != null && typeof firestoreData[k] === "number" && !isNaN(firestoreData[k])) {
      out[k] = firestoreData[k];
    }
  }
  if (firestoreData.rehabCost && typeof firestoreData.rehabCost === "object") {
    out.rehabCost = { ...DEFAULT_REHAB_COST, ...firestoreData.rehabCost };
  }
  if (firestoreData.rehabTime && typeof firestoreData.rehabTime === "object") {
    out.rehabTime = { ...DEFAULT_REHAB_TIME, ...firestoreData.rehabTime };
  }
  if (firestoreData.titleInsuranceRates && typeof firestoreData.titleInsuranceRates === "object") {
    out.titleInsuranceRates = { ...DEFAULT_TITLE_INSURANCE_RATES, ...firestoreData.titleInsuranceRates };
  }
  return out;
}

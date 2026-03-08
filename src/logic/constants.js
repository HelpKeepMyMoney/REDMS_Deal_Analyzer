/** REDMS deal and tax constants (aligned with spreadsheet) */

export const REHAB_COST = { No: 0, Low: 5000, Medium: 10000, High: 15000, Full: 30000 };
export const REHAB_TIME = { No: 0, Low: 1, Medium: 2, High: 3, Full: 3 };
export const REHAB_LEVELS = ["No", "Low", "Medium", "High", "Full"];

/** Max total project cost (Summary!B31) */
export const MAX_TPC = 60000;

/** Minimum 1st mortgage loan amount (below this, use all-cash) */
export const MIN_LOAN_AMOUNT = 50000;

/** Detroit property tax: (SEV × rate) + flat. SEV = price × 50%, rate = 85.2737 mills (2024 non-homestead), flat = trash service */
export const DETROIT_TAX_SEV_RATIO = 0.5;
export const DETROIT_TAX_RATE = 0.0852737;
export const DETROIT_TAX_FLAT = 240;

/** Referral fee as fraction of preferred ROI / investor split */
export const REFERRAL_FRACTION = 1 / 9;

/** Initial Referral as percentage of Preferred ROI (e.g. 11.11 ≈ 1/9) */
export const INITIAL_REFERRAL_PCT = (1 / 9) * 100;

/** Investor Referral as percentage of Preferred ROI (e.g. 11.11 ≈ 1/9) */
export const INVESTOR_REFERRAL_PCT = (1 / 9) * 100;

/** Mortgage points (e.g. 4%) */
export const MORTGAGE_POINTS_RATE = 0.04;

/** Min acquisition management fee */
export const MIN_ACQ_MGMT_FEE = 1000;

/** Min realtor/sale fee */
export const MIN_REALTOR_FEE = 1000;

/** Depreciation: 27.5 years, 75% land improvement. Rehab included in basis only if > threshold. */
export const DEPRECIATION_YEARS = 27.5;
export const DEPRECIATION_LAND_FRACTION = 0.75;
export const DEPRECIATION_MIN_BASIS = 20000;

/**
 * Michigan owner's title insurance rate schedule (ALTA Owner's Policy).
 * Based on FNTI/Stewart/First American rate manuals. Policy amount = purchase price.
 * Tiers: base up to $20k, then per-thousand rates that decrease at higher amounts.
 */
export const TITLE_INSURANCE_RATES = {
  /** Base premium for policies up to $20,000 */
  baseUpTo20k: 375,
  /** $20,001–$100,000: rate per $1,000 over $20k (e.g. 7.36 = $7.36/thousand) */
  rate20kTo100k: 7.36,
  /** $100,001–$500,000: rate per $1,000 over $100k */
  rate100kTo500k: 4.56,
  /** $500,001+: rate per $1,000 over $500k */
  rate500kPlus: 3.5,
};

/** Input validation ranges (for clamping). Percentages 0–100; retailCapRate stored as decimal 0–1. */
export const RANGES = {
  retailCapRate: [0, 1],
  pmiPct: [0, 100],
  mgmtFeePct: [0, 100],
  pmFeePct: [0, 100],
  vacancyPct: [0, 100],
  capexPct: [0, 100],
  annualRentIncrease: [0, 100],
  annualAppreciation: [-50, 100],
  profitSplitPct: [0, 100],
  preferredROIPct: [0, 100],
  realtorSaleFeePct: [0, 100],
  marginalTaxBracket: [0, 100],
  initialReferralPct: [0, 100],
  investorReferralPct: [0, 100],
};

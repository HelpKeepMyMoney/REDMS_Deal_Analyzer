/**
 * Tier constants for REDMS Deal Analyzer.
 * Free tier serves as the trial; no PayPal trial period.
 */

export const TIERS = {
  FREE: "free",
  INVESTOR: "investor",
  PRO: "pro",
  CLIENT: "client",
  WHOLESALER: "wholesaler",
  ADMIN: "admin",
};

export const TIER_LIMITS = {
  free: {
    maxAnalysesTotal: 3,
    canSaveDeals: true,
    canExport: false,
    canCollaborate: false,
    maxSavedDeals: 3,
    dealParams: "limited",
    hasWholesalerModule: false,
  },
  investor: {
    maxAnalysesPerMonth: 10,
    overagePerDeal: 10,
    canSaveDeals: true,
    canExport: true,
    canCollaborate: false,
    maxSavedDeals: Infinity,
    dealParams: "full",
    hasWholesalerModule: false,
  },
  pro: {
    maxAnalysesPerMonth: 30,
    overagePerDeal: 10,
    canSaveDeals: true,
    canExport: true,
    canCollaborate: true,
    canShareDeals: true,
    portfolioTracking: true,
    dealParams: "full",
    hasWholesalerModule: false,
  },
  client: {
    canSaveDeals: false,
    canExport: true,
    canCollaborate: false,
    maxSavedDeals: 0,
    dealParams: "admin_only",
    hasWholesalerModule: false,
  },
  wholesaler: {
    maxAnalysesPerMonth: 60,
    overagePerDeal: 10,
    canSaveDeals: true,
    canExport: true,
    canCollaborate: true,
    canShareDeals: true,
    portfolioTracking: true,
    dealParams: "full",
    hasWholesalerModule: true,
  },
  admin: {
    maxAnalysesPerMonth: Infinity,
    canSaveDeals: true,
    canExport: true,
    canCollaborate: true,
    canShareDeals: true,
    portfolioTracking: true,
    dealParams: "full",
    hasWholesalerModule: true,
  },
};

export const PRICES = {
  investor: { monthly: 39, annual: 390 },
  pro: { monthly: 99, annual: 990 },
  wholesaler: { monthly: 149, annual: 1490 },
};

export const OVERAGE_PRICE = 10;
export const GRACE_PERIOD_DAYS = 5;

/** Keys Free tier can override in deal params */
export const FREE_TIER_PARAM_KEYS = [
  "maxTpc",
  "minLoanAmount",
  "minFlipCoCPct",
  "minBhCoCPct",
];

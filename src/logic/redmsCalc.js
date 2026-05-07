import { normalizeMortgageYN } from "./validation.js";
import {
  REHAB_COST as DEFAULT_REHAB_COST,
  REHAB_TIME as DEFAULT_REHAB_TIME,
  MAX_TPC as DEFAULT_MAX_TPC,
  DETROIT_TAX_SEV_RATIO as DEFAULT_DETROIT_TAX_SEV_RATIO,
  DETROIT_TAX_RATE as DEFAULT_DETROIT_TAX_RATE,
  DETROIT_TAX_FLAT as DEFAULT_DETROIT_TAX_FLAT,
  REFERRAL_FRACTION as DEFAULT_REFERRAL_FRACTION,
  INITIAL_REFERRAL_PCT as DEFAULT_INITIAL_REFERRAL_PCT,
  INVESTOR_REFERRAL_PCT as DEFAULT_INVESTOR_REFERRAL_PCT,
  MORTGAGE_POINTS_RATE as DEFAULT_MORTGAGE_POINTS_RATE,
  MIN_FIRST_MTG_UPFRONT_POINTS as DEFAULT_MIN_FIRST_MTG_UPFRONT_POINTS,
  MIN_ACQ_MGMT_FEE as DEFAULT_MIN_ACQ_MGMT_FEE,
  MIN_REALTOR_FEE as DEFAULT_MIN_REALTOR_FEE,
  DEPRECIATION_YEARS as DEFAULT_DEPRECIATION_YEARS,
  DEPRECIATION_LAND_FRACTION as DEFAULT_DEPRECIATION_LAND_FRACTION,
  DEPRECIATION_MIN_BASIS as DEFAULT_DEPRECIATION_MIN_BASIS,
  TITLE_INSURANCE_RATES as DEFAULT_TITLE_INSURANCE_RATES,
} from "./constants.js";

/** Build params object for calc from config (or use defaults). */
function getCalcParams(config) {
  if (!config) {
    return {
      REHAB_COST: DEFAULT_REHAB_COST,
      REHAB_TIME: DEFAULT_REHAB_TIME,
      MAX_TPC: DEFAULT_MAX_TPC,
      MIN_FLIP_COC_PCT: 25,
      MIN_BH_COC_PCT: 10,
      MIN_WHOLESALE_FEE: 5000,
      DETROIT_TAX_SEV_RATIO: DEFAULT_DETROIT_TAX_SEV_RATIO,
      DETROIT_TAX_RATE: DEFAULT_DETROIT_TAX_RATE,
      DETROIT_TAX_FLAT: DEFAULT_DETROIT_TAX_FLAT,
      REFERRAL_FRACTION: DEFAULT_REFERRAL_FRACTION,
      INITIAL_REFERRAL_PCT: DEFAULT_INITIAL_REFERRAL_PCT,
      INVESTOR_REFERRAL_PCT: DEFAULT_INVESTOR_REFERRAL_PCT,
      MORTGAGE_POINTS_RATE: DEFAULT_MORTGAGE_POINTS_RATE,
      MIN_ACQ_MGMT_FEE: DEFAULT_MIN_ACQ_MGMT_FEE,
      MIN_REALTOR_FEE: DEFAULT_MIN_REALTOR_FEE,
      DEPRECIATION_YEARS: DEFAULT_DEPRECIATION_YEARS,
      DEPRECIATION_LAND_FRACTION: DEFAULT_DEPRECIATION_LAND_FRACTION,
      DEPRECIATION_MIN_BASIS: DEFAULT_DEPRECIATION_MIN_BASIS,
      TITLE_INSURANCE_RATES: DEFAULT_TITLE_INSURANCE_RATES,
    };
  }
  return {
    REHAB_COST: config.rehabCost ?? DEFAULT_REHAB_COST,
    REHAB_TIME: config.rehabTime ?? DEFAULT_REHAB_TIME,
    MAX_TPC: config.maxTpc ?? DEFAULT_MAX_TPC,
    MIN_FLIP_COC_PCT: config.minFlipCoCPct ?? 25,
    MIN_BH_COC_PCT: config.minBhCoCPct ?? 10,
    MIN_WHOLESALE_FEE: config.minWholesaleFee ?? 5000,
    DETROIT_TAX_SEV_RATIO: config.detroitTaxSevRatio ?? DEFAULT_DETROIT_TAX_SEV_RATIO,
    DETROIT_TAX_RATE: config.detroitTaxRate ?? DEFAULT_DETROIT_TAX_RATE,
    DETROIT_TAX_FLAT: config.detroitTaxFlat ?? DEFAULT_DETROIT_TAX_FLAT,
    REFERRAL_FRACTION: config.referralFraction ?? DEFAULT_REFERRAL_FRACTION,
    INITIAL_REFERRAL_PCT: config.initialReferralPct ?? DEFAULT_INITIAL_REFERRAL_PCT,
    INVESTOR_REFERRAL_PCT: config.investorReferralPct ?? DEFAULT_INVESTOR_REFERRAL_PCT,
    MORTGAGE_POINTS_RATE: config.mortgagePointsRate ?? DEFAULT_MORTGAGE_POINTS_RATE,
    MIN_ACQ_MGMT_FEE: config.minAcqMgmtFee ?? DEFAULT_MIN_ACQ_MGMT_FEE,
    MIN_REALTOR_FEE: config.minRealtorFee ?? DEFAULT_MIN_REALTOR_FEE,
    DEPRECIATION_YEARS: config.depreciationYears ?? DEFAULT_DEPRECIATION_YEARS,
    DEPRECIATION_LAND_FRACTION: config.depreciationLandFraction ?? DEFAULT_DEPRECIATION_LAND_FRACTION,
    DEPRECIATION_MIN_BASIS: config.depreciationMinBasis ?? DEFAULT_DEPRECIATION_MIN_BASIS,
    TITLE_INSURANCE_RATES: config.titleInsuranceRates ?? DEFAULT_TITLE_INSURANCE_RATES,
  };
}

function monthlyPMT(annualRate, termYears, principal) {
  if (!principal || principal <= 0) return 0;
  if (annualRate === 0) return principal / (termYears * 12);
  const r = annualRate / 12;
  const n = termYears * 12;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Buyer's property tax prorated from annual tax. Tax year is 7/1–6/30 (paid July 1).
 * Closing is assumed 30 days from today; buyer owes from closing through 6/30.
 */
function buyerProratedPropertyTax(annualTax) {
  if (annualTax == null || isNaN(annualTax) || annualTax <= 0) return 0;
  const today = new Date();
  const closingDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  closingDate.setDate(closingDate.getDate() + 30);

  const closingYear = closingDate.getFullYear();
  const closingMonth = closingDate.getMonth();

  let fyStart;
  let fyEnd;
  if (closingMonth >= 6) {
    fyStart = new Date(closingYear, 6, 1);
    fyEnd = new Date(closingYear + 1, 5, 30);
  } else {
    fyStart = new Date(closingYear - 1, 6, 1);
    fyEnd = new Date(closingYear, 5, 30);
  }

  const buyerDays = Math.floor((fyEnd.getTime() - closingDate.getTime()) / MS_PER_DAY) + 1;
  const totalDays = Math.floor((fyEnd.getTime() - fyStart.getTime()) / MS_PER_DAY) + 1;
  if (totalDays <= 0 || buyerDays <= 0) return 0;
  return annualTax * (buyerDays / totalDays);
}

/**
 * Holding costs = Annual Tax if we hold past a 7/1 (tax due date); else $0.
 * Closing = today + 30 days; holding end = closing + rehab months + holding buffer months.
 */
function holdingCostsPropertyTax(annualTax, rehabMonths, holdingMonthsBuffer) {
  if (annualTax == null || isNaN(annualTax) || annualTax <= 0) return 0;
  const today = new Date();
  const closingDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  closingDate.setDate(closingDate.getDate() + 30);

  const holdingEnd = new Date(
    closingDate.getFullYear(),
    closingDate.getMonth() + rehabMonths + holdingMonthsBuffer,
    closingDate.getDate()
  );

  const closingYear = closingDate.getFullYear();
  const closingMonth = closingDate.getMonth();
  const nextJuly1 =
    closingMonth < 6
      ? new Date(closingYear, 6, 1)
      : new Date(closingYear + 1, 6, 1);

  return holdingEnd >= nextJuly1 ? annualTax : 0;
}

/**
 * Estimate owner's title insurance premium using Michigan tiered rate schedule.
 * Policy amount = purchase price. Returns 0 for amount <= 0.
 * @param {number} purchasePrice
 * @param {object} [titleRates] - Optional; defaults to constants.
 */
export function calcTitleInsurance(purchasePrice, titleRates = null) {
  if (purchasePrice == null || purchasePrice <= 0) return 0;
  const amt = purchasePrice;
  const rates = titleRates ?? DEFAULT_TITLE_INSURANCE_RATES;
  const { baseUpTo20k, rate20kTo100k, rate100kTo500k, rate500kPlus } = rates;
  if (amt <= 20000) return baseUpTo20k;
  if (amt <= 100000) return baseUpTo20k + (amt - 20000) * (rate20kTo100k / 1000);
  if (amt <= 500000) {
    const tier1 = baseUpTo20k + 80000 * (rate20kTo100k / 1000);
    return tier1 + (amt - 100000) * (rate100kTo500k / 1000);
  }
  const tier1 = baseUpTo20k + 80000 * (rate20kTo100k / 1000);
  const tier2 = tier1 + 400000 * (rate100kTo500k / 1000);
  return tier2 + (amt - 500000) * (rate500kPlus / 1000);
}

/**
 * Pure deal calculator. Given input object, returns all flip/B&H metrics and deal checks.
 * @param {object} inp - Deal input
 * @param {object} [config] - Optional app config (from ConfigContext); uses constants if omitted.
 */
export function calc(inp, config = null) {
  const p = getCalcParams(config);
  const {
    totalRent,
    rehabLevel,
    rehabCost: inpRehabCost,
    rehabMonths: inpRehabMonths,
    offerPrice,
    wholesaleFee,
    retailCapRate,
    currentYearTax,
    newPropertyTax: inpNewPropertyTax,
    rehabInsurance: inpRehabInsurance,
    landlordsInsurance: inpLandlordsInsurance,
    pmiPct,
    mortgage1Rate,
    mortgage1Term,
    mortgage2Rate,
    inspectionFee,
    llcSetup,
    appraisalFee,
    titleInsurance: inpTitleInsurance,
    settlementCosts,
    miscFees,
    mgmtFeePct,
    prepaidInsMonths,
    holdingMonthsBuffer,
    pmFeePct,
    vacancyPct,
    capexPct,
    annualRentIncrease,
    annualAppreciation,
    marginalTaxBracket,
    profitSplitPct,
    preferredROIPct,
    realtorSaleFeePct,
    tenantAcquisition,
    recommendedReserves,
    retailTenantAcquisition,
    retailRecommendedReserves,
    downPaymentPct,
    mortgage2Amt: inpMortgage2Amt,
    businessCosts,
  } = inp;

  const mortgage1YN = normalizeMortgageYN(inp.mortgage1YN);
  const mortgage2YN = normalizeMortgageYN(inp.mortgage2YN);

  const rehabCost =
    typeof inpRehabCost === "number" && !isNaN(inpRehabCost)
      ? inpRehabCost
      : (p.REHAB_COST[rehabLevel] ?? 0);
  const rehabMonths =
    typeof inpRehabMonths === "number" && !isNaN(inpRehabMonths)
      ? inpRehabMonths
      : (p.REHAB_TIME[rehabLevel] ?? 0);
  const holdingMonths = rehabMonths + holdingMonthsBuffer;

  const downPayment = offerPrice * ((typeof downPaymentPct === 'number' && !isNaN(downPaymentPct) ? downPaymentPct : 0) / 100);
  const mortgage1Amt = mortgage1YN === "Yes" ? offerPrice - downPayment : 0;
  let mortgage1Pts = mortgage1Amt * p.MORTGAGE_POINTS_RATE;
  if (mortgage1YN === "Yes") {
    mortgage1Pts = Math.max(mortgage1Pts, DEFAULT_MIN_FIRST_MTG_UPFRONT_POINTS);
  }
  const upfront = inspectionFee + llcSetup + appraisalFee;
  const titleIns =
    typeof inpTitleInsurance === "number" && !isNaN(inpTitleInsurance) && inpTitleInsurance >= 0
      ? inpTitleInsurance
      : calcTitleInsurance(offerPrice, p.TITLE_INSURANCE_RATES);
  const acqMgmtFee = Math.max((mgmtFeePct / 100) * offerPrice, p.MIN_ACQ_MGMT_FEE);
  const rehabIns =
    typeof inpRehabInsurance === "number" && !isNaN(inpRehabInsurance) && inpRehabInsurance >= 0
      ? inpRehabInsurance
      : 0;
  const annualInsurance =
    typeof inpLandlordsInsurance === "number" &&
      !isNaN(inpLandlordsInsurance) &&
      inpLandlordsInsurance >= 0
      ? inpLandlordsInsurance
      : (offerPrice + rehabCost) * 0.025;
  /** Landlord's insurance included in closing = 1/9 of annual premium. */
  const landlordsClosingIns = annualInsurance / 9;
  const prepaidIns = landlordsClosingIns;
  const buyerTax = buyerProratedPropertyTax(currentYearTax);
  const closing =
    titleIns + settlementCosts + miscFees + acqMgmtFee + landlordsClosingIns + buyerTax + rehabIns;
  const annualPMI = mortgage1Amt * (pmiPct / 100);
  const annualTaxFlip = currentYearTax;

  const calculatedMtg2Amt = rehabCost + downPayment + wholesaleFee + mortgage1Pts + closing;
  const mortgage2Amt =
    mortgage2YN === "Yes"
      ? (typeof inpMortgage2Amt === "number" && !isNaN(inpMortgage2Amt) ? inpMortgage2Amt : calculatedMtg2Amt)
      : 0;
  const mortgage2Pts = mortgage2Amt * p.MORTGAGE_POINTS_RATE;
  const mtg1Monthly = monthlyPMT(mortgage1Rate, mortgage1Term, mortgage1Amt);
  const mtg2Monthly = mortgage2Amt * (mortgage2Rate / 12);
  const holdingCosts = holdingCostsPropertyTax(
    currentYearTax,
    rehabMonths,
    holdingMonthsBuffer
  );
  const totalInvestment =
    rehabCost +
    offerPrice +
    wholesaleFee +
    mortgage1Pts +
    upfront +
    closing +
    mortgage2Pts +
    holdingCosts -
    mortgage2Amt -
    mortgage1Amt;
  const totalCosts =
    rehabCost +
    offerPrice +
    wholesaleFee +
    mortgage1Pts +
    upfront +
    closing +
    mortgage2Pts +
    holdingCosts;

  const bhPurchasePrice = totalInvestment;
  const bhAnnualTax =
    typeof inpNewPropertyTax === "number" &&
      !isNaN(inpNewPropertyTax) &&
      inpNewPropertyTax >= 0
      ? inpNewPropertyTax
      : offerPrice * p.DETROIT_TAX_SEV_RATIO * p.DETROIT_TAX_RATE + p.DETROIT_TAX_FLAT;
  const bhPmFeeMonthly = (pmFeePct / 100) * totalRent;
  const bhAnnualPmFee = bhPmFeeMonthly * 12;
  const bhAnnualIns = annualInsurance;
  const bhBusinessCosts =
    typeof businessCosts === "number" && !isNaN(businessCosts) && businessCosts >= 0
      ? businessCosts
      : 0;
  const bhAnnualExpenses = bhAnnualIns + bhAnnualTax + bhAnnualPmFee + bhBusinessCosts;
  const annualGrossRent = totalRent * 12;
  const annualCashExpNeg = -bhAnnualExpenses;
  const noi = annualGrossRent + annualCashExpNeg;
  const arv = retailCapRate > 0 ? noi / retailCapRate : 0;
  const tenantAcq =
    typeof tenantAcquisition === "number" && !isNaN(tenantAcquisition) && tenantAcquisition >= 0
      ? tenantAcquisition
      : 1 * totalRent;
  const calculatedReserves = Math.round(
    3 *
      (annualInsurance / 12 +
        bhAnnualTax / 12 +
        bhPmFeeMonthly +
        mtg1Monthly +
        mtg2Monthly)
  );
  const reserves =
    typeof recommendedReserves === "number" && !isNaN(recommendedReserves) && recommendedReserves >= 0
      ? recommendedReserves
      : calculatedReserves;
  const bhTotalInvestment = bhPurchasePrice + tenantAcq + reserves;

  const monthlyOperatingCosts =
    annualInsurance / 12 + bhAnnualTax / 12 + bhPmFeeMonthly + mtg1Monthly + mtg2Monthly;
  const retailReservesDefault = Math.round(6 * monthlyOperatingCosts);
  const retailTenantAcq =
    typeof retailTenantAcquisition === "number" && !isNaN(retailTenantAcquisition) && retailTenantAcquisition >= 0
      ? retailTenantAcquisition
      : 0;
  const retailReserves =
    typeof retailRecommendedReserves === "number" && !isNaN(retailRecommendedReserves) && retailRecommendedReserves >= 0
      ? retailRecommendedReserves
      : retailReservesDefault;
  const retailTotalInvestment = arv + retailTenantAcq + retailReserves;
  const capRateRetail = arv > 0 ? noi / arv : 0;
  const netRentMonthly =
    totalRent -
    totalRent * (vacancyPct / 100) -
    totalRent * (capexPct / 100);
  const bhAnnualMtg1 = mtg1Monthly * 12;
  const bhAnnualMtg2 = mtg2Monthly * 12;
  const noiWithReserves = netRentMonthly * 12 - bhAnnualExpenses - bhAnnualMtg1 - bhAnnualMtg2;
  const totalCost = totalInvestment + mortgage1Amt + mortgage2Amt;
  const capRate = totalCost > 0 ? noi / totalCost : 0;
  const bhCashFlowAfterDebt = noi - bhAnnualMtg1 - bhAnnualMtg2;
  const bhCashOnCash = bhTotalInvestment > 0 ? bhCashFlowAfterDebt / bhTotalInvestment : 0;
  const retailCashOnCash = retailTotalInvestment > 0 ? bhCashFlowAfterDebt / retailTotalInvestment : 0;

  const realtorFeeBase = (realtorSaleFeePct / 100) * arv;
  const realtorFee = Math.max(realtorFeeBase, p.MIN_REALTOR_FEE);
  const preferredROI = totalInvestment * (preferredROIPct / 100);
  const initialReferralDeduct = preferredROI * (p.INITIAL_REFERRAL_PCT / 100);
  const investorReferralFee = initialReferralDeduct;
  const netProceedsAfterPayoffs = arv - realtorFee - mortgage1Amt - mortgage2Amt;
  const minSalesPrice = totalInvestment + realtorFee + preferredROI + investorReferralFee + mortgage1Amt + mortgage2Amt;
  const grossProfit = netProceedsAfterPayoffs - totalInvestment;
  const profitToSplit = grossProfit - preferredROI - initialReferralDeduct;
  const investorSplitPct = (100 - profitSplitPct) / 100;
  const investorSplit = profitToSplit * investorSplitPct;
  const investorSplitReferral = preferredROI * (p.INVESTOR_REFERRAL_PCT / 100);
  const bnicSplit = profitToSplit - investorSplit - investorSplitReferral;
  const totalInvestorROI = preferredROI + investorSplit;
  const totalROI_flip =
    netProceedsAfterPayoffs - totalInvestment - investorReferralFee - bnicSplit;
  const cashOnCash = totalInvestment > 0 ? totalROI_flip / totalInvestment : 0;
  const annualizedROI = holdingMonths > 0 ? cashOnCash * 12 / holdingMonths : 0;

  const minFlipCoC = (p.MIN_FLIP_COC_PCT ?? 25) / 100;
  const minBhCoC = (p.MIN_BH_COC_PCT ?? 10) / 100;
  const dealCheck1 = cashOnCash < minFlipCoC;
  const dealCheck2 = bhCashOnCash < minBhCoC;
  const dealCheck3 = bhTotalInvestment > p.MAX_TPC;
  const isDeal = !dealCheck1 && !dealCheck2 && !dealCheck3;

  const deprBasis =
    offerPrice +
    titleIns +
    (rehabCost > p.DEPRECIATION_MIN_BASIS ? rehabCost : 0);
  const annualDepr =
    deprBasis * (1 / p.DEPRECIATION_YEARS) * p.DEPRECIATION_LAND_FRACTION;
  const projections = [];
  let rentalIncome = annualGrossRent;
  let propCosts = bhAnnualExpenses;
  let propValue = arv;

  for (let yr = 1; yr <= 30; yr++) {
    if (yr > 1) {
      rentalIncome *= 1 + annualRentIncrease / 100;
      propCosts *= 1 + annualRentIncrease / 100;
      propValue *= 1 + annualAppreciation / 100;
    }
    const mtg1PaymentYear = yr <= mortgage1Term ? mtg1Monthly * 12 : 0;
    const mortgagePayment = mtg1PaymentYear + (mtg2Monthly * 12);
    const netCash = rentalIncome - mortgagePayment - propCosts;
    const depr =
      yr <= 27 ? annualDepr : yr === 28 ? annualDepr / 2 : 0;
    const reserves_yr = -(vacancyPct / 100 + capexPct / 100) * rentalIncome;
    const roi = bhTotalInvestment > 0 ? netCash / bhTotalInvestment : 0;
    const roe = propValue > 0 ? netCash / propValue : 0;
    projections.push({
      yr,
      rentalIncome,
      mortgagePayment,
      propCosts,
      netCash,
      depr,
      netGain: 0,
      reserves_yr,
      roi,
      roe,
      propValue,
    });
  }

  const gt = {
    rentalIncome: projections.reduce((s, p) => s + p.rentalIncome, 0),
    propCosts: projections.reduce((s, p) => s + p.propCosts, 0),
    mortgagePayment: projections.reduce((s, p) => s + p.mortgagePayment, 0),
    netCash: projections.reduce((s, p) => s + p.netCash, 0),
    depr: projections.reduce((s, p) => s + p.depr, 0),
    reserves_yr: projections.reduce((s, p) => s + p.reserves_yr, 0),
  };

  return {
    rehabCost,
    rehabMonths,
    holdingMonths,
    offerPrice,
    downPayment,
    mortgage1Amt,
    mortgage1Pts,
    calculatedMtg2Amt,
    mortgage2Amt,
    mortgage2Pts,
    upfront,
    titleIns,
    acqMgmtFee,
    prepaidIns,
    landlordsClosingIns,
    buyerTax,
    rehabIns,
    closing,
    annualInsurance,
    annualPMI,
    annualTaxFlip,
    mtg1Monthly,
    mtg2Monthly,
    holdingCosts,
    totalInvestment,
    totalCosts,
    bhPurchasePrice,
    bhAnnualTax,
    bhPmFeeMonthly,
    bhAnnualPmFee,
    bhBusinessCosts,
    bhAnnualIns,
    bhAnnualExpenses,
    annualGrossRent,
    noi,
    arv,
    tenantAcq,
    reserves,
    bhTotalInvestment,
    retailReservesDefault,
    retailTenantAcq,
    retailReserves,
    retailTotalInvestment,
    capRateRetail,
    retailCashOnCash,
    netRentMonthly,
    noiWithReserves,
    capRate,
    bhAnnualMtg1,
    bhAnnualMtg2,
    bhCashFlowAfterDebt,
    bhCashOnCash,
    realtorFee,
    netProceedsAfterPayoffs,
    preferredROI,
    investorReferralFee,
    minSalesPrice,
    grossProfit,
    initialReferralDeduct,
    profitToSplit,
    investorSplit,
    investorSplitReferral,
    bnicSplit,
    totalInvestorROI,
    totalROI_flip,
    cashOnCash,
    annualizedROI,
    isDeal,
    dealCheck1,
    dealCheck2,
    dealCheck3,
    projections,
    gt,
  };
}

/**
 * Merge app config with per-deal risk overrides for wholesaler calculations.
 * @param {object} appConfig - From ConfigContext (appConfig/params)
 * @param {object} [riskOverrides] - Per-deal overrides from wholesalerDeals
 */
export function mergeWholesalerConfig(appConfig, riskOverrides) {
  if (!riskOverrides || typeof riskOverrides !== "object") {
    return appConfig;
  }
  const merged = { ...appConfig };
  const keys = ["minWholesaleFee", "minFlipCoCPct", "minBhCoCPct", "maxTpc"];
  for (const k of keys) {
    if (riskOverrides[k] != null && typeof riskOverrides[k] === "number" && !isNaN(riskOverrides[k])) {
      merged[k] = riskOverrides[k];
    }
  }
  if (riskOverrides.rehabCost && typeof riskOverrides.rehabCost === "object") {
    merged.rehabCost = { ...(merged.rehabCost || {}), ...riskOverrides.rehabCost };
  }
  if (riskOverrides.rehabTime && typeof riskOverrides.rehabTime === "object") {
    merged.rehabTime = { ...(merged.rehabTime || {}), ...riskOverrides.rehabTime };
  }
  return merged;
}

/**
 * Find the maximum offer to buyer (contract price + wholesale fee) where the deal indicator shows "Deal".
 * Assumes wholesale fee = 0 so the result is the ceiling the wholesaler can allocate between
 * purchase price and their fee. Does not change when purchase price or wholesale fee change.
 * @param {object} inp - Deal input
 * @param {object} config - Merged config
 * @returns {number|null} Max offer to buyer where isDeal, or null if no valid range
 */
function findMaxOfferToBuyer(inp, config) {
  const r = calc({ ...inp, wholesaleFee: 0 }, config);
  const arv = r.arv ?? 0;
  let hi = Math.max(arv * 1.2, 100000);
  const tol = 50;

  const test = (totalPrice) => {
    const testInp = { ...inp, offerPrice: totalPrice, wholesaleFee: 0 };
    return calc(testInp, config).isDeal;
  };

  if (!test(0)) return null;
  if (test(hi)) return Math.round(hi);

  let lo = 0;
  let best = 0;
  while (hi - lo > tol) {
    const mid = (lo + hi) / 2;
    if (test(mid)) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.round(best);
}

/**
 * Wholesaler-specific calc. Uses calc() and adds wholesaler outputs.
 * @param {object} inp - Deal input
 * @param {object} config - Merged config (appConfig + riskOverrides)
 */
export function calcWholesaler(inp, config = null) {
  const r = calc(inp, config);
  const p = getCalcParams(config);
  const minWholesaleFee = p.MIN_WHOLESALE_FEE ?? 5000;
  const wholesaleFee = typeof inp.wholesaleFee === "number" && !isNaN(inp.wholesaleFee) ? inp.wholesaleFee : 0;
  const offerPrice = typeof inp.offerPrice === "number" && !isNaN(inp.offerPrice) ? inp.offerPrice : 0;

  const offerPriceToBuyer = offerPrice + wholesaleFee;
  const wholesaleSpread = r.grossProfit + wholesaleFee;
  const investorWouldTakeDeal = r.isDeal;
  const isWholesalerDeal = wholesaleFee >= minWholesaleFee && investorWouldTakeDeal;

  const maxOfferToBuyer = findMaxOfferToBuyer(inp, config) ?? offerPriceToBuyer;

  return {
    ...r,
    offerPriceToBuyer,
    wholesaleSpread,
    maxOfferToBuyer,
    investorWouldTakeDeal,
    isWholesalerDeal,
  };
}

export const DEFAULT_INPUT = {
  street: "1234 Sample Dr.",
  city: "Detroit",
  state: "MI",
  zipCode: "48238",
  propertyOwner: "",
  apn: "",
  use: "",
  notes: "",
  notesHistory: [],
  wedPage: "",
  picsVideos: "",
  image: "",
  imageFallback: "",
  totalRent: 1000,
  rehabLevel: "Full",
  rehabCost: 30000,
  rehabMonths: 3,
  offerPrice: 19400,
  wholesaleFee: 0,
  retailCapRate: 0.1,
  currentYearTax: 1000,
  newPropertyTax: undefined, // set below: Detroit non-homestead estimate from offerPrice
  rehabInsurance: 0,
  landlordsInsurance: undefined, // set below: 2.5% × (purchase price + rehab cost)
  pmiPct: 0,
  mortgage1YN: "No",
  downPaymentPct: 20,
  mortgage1Rate: 0.1,
  mortgage1Term: 30,
  mortgage2YN: "No",
  mortgage2Amt: undefined,
  mortgage2Rate: 0.12,
  inspectionFee: 500,
  llcSetup: 500,
  appraisalFee: 25,
  titleInsurance: undefined, // auto-estimated from Michigan tiered rate schedule when omitted
  settlementCosts: 1000,
  miscFees: 2000,
  mgmtFeePct: 2,
  prepaidInsMonths: 1,
  holdingMonthsBuffer: 3,
  pmFeePct: 11,
  vacancyPct: 2.5,
  capexPct: 2.5,
  annualRentIncrease: 5,
  annualAppreciation: 3.8,
  marginalTaxBracket: 21,
  profitSplitPct: 50,
  preferredROIPct: 10,
  realtorSaleFeePct: 4,
  tenantAcquisition: undefined, // if provided, overrides calculated value (1 × totalRent)
  recommendedReserves: undefined, // if provided, overrides calculated value (3 × monthly expenses)
  retailTenantAcquisition: undefined, // Retail Investor: if provided, overrides default $0
  retailRecommendedReserves: undefined, // Retail Investor: if provided, overrides 6 × monthly operating costs
  businessCosts: 150, // Annual business costs; subtracts from NOI
  bedrooms: 3,
  bathrooms: 1,
  sqft: 1000,
  basement: "Yes",
  lotSize: 3500,
  yearBuilt: 1940,
  stories: 1.5,
};
DEFAULT_INPUT.landlordsInsurance =
  (DEFAULT_INPUT.offerPrice + DEFAULT_INPUT.rehabCost) * 0.025;
DEFAULT_INPUT.newPropertyTax = Math.round(
  DEFAULT_INPUT.offerPrice * DEFAULT_DETROIT_TAX_SEV_RATIO * DEFAULT_DETROIT_TAX_RATE +
    DEFAULT_DETROIT_TAX_FLAT
);

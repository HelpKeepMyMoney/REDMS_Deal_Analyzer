/**
 * Quick deal analysis for property search results.
 * Runs calc() with property data + defaults to produce a Deal/No Deal indicator.
 */

import { calc } from "./redmsCalc.js";
import { DEFAULT_INPUT } from "./redmsCalc.js";
import { estimateRentHeuristic } from "./rentEstimate.js";
import { loadStoredInput } from "./storage.js";
import { mergeStored } from "./mergeStored.js";
import { DETROIT_TAX_SEV_RATIO, DETROIT_TAX_RATE, DETROIT_TAX_FLAT, MIN_LOAN_AMOUNT } from "./constants.js";
import { REHAB_COST, REHAB_LEVELS, REHAB_TIME } from "./constants.js";

/**
 * Builds calc input from a search-result property using defaults for missing fields.
 * Uses fixed totalRent (from Full rehab) so rehab-level comparison is consistent.
 * @param {Object} property - Property from search
 * @param {string} rehabLevel - Rehab level: No, Low, Medium, High, Full
 * @param {number} [fixedRent] - If provided, use this rent instead of heuristic (for consistent rehab comparison)
 * @returns {Object} Input object for calc()
 */
function buildCalcInputFromProperty(property, rehabLevel = "Full", fixedRent = null) {
  if (!property) return null;
  const offerPrice = Number(property.price);
  if (isNaN(offerPrice) || offerPrice <= 0) return null;
  const rehabCost = REHAB_COST[rehabLevel] ?? REHAB_COST.Full ?? 30000;

  const rentInput = {
    bedrooms: property.bedrooms ?? 3,
    bathrooms: property.bathrooms ?? 1,
    sqft: property.squareFootage ?? property.sqft ?? 0,
    basement: property.basement ?? "No",
    offerPrice,
    rehabCost: REHAB_COST.Full ?? 30000,
  };
  const totalRent = fixedRent ?? estimateRentHeuristic(rentInput);

  const estimatedTax =
    offerPrice * DETROIT_TAX_SEV_RATIO * DETROIT_TAX_RATE + DETROIT_TAX_FLAT;

  return {
    ...DEFAULT_INPUT,
    street: property.addressLine1 ?? property.street ?? "",
    city: property.city ?? "",
    state: property.state ?? "",
    zipCode: property.zipCode ?? "",
    offerPrice,
    totalRent,
    rehabLevel,
    currentYearTax: property.currentYearTax ?? estimatedTax,
    newPropertyTax: property.newPropertyTax ?? estimatedTax,
    sqft: property.squareFootage ?? property.sqft ?? 1000,
    bedrooms: property.bedrooms ?? 3,
    bathrooms: property.bathrooms ?? 1,
    lotSize: property.lotSize ?? 3500,
    yearBuilt: property.yearBuilt ?? null,
  };
}

/**
 * Runs a quick deal analysis on a property from search results.
 * Uses rent assumption from Full rehab, then analyzes from No → Low → Medium → High → Full.
 * Stops at the first No Deal and reports the previous level (last level that was Deal).
 *
 * @param {Object} property - Property from search results
 * @param {Object} [financingOptions] - Optional: { addFinancing: boolean, downPaymentPct?: number, mortgage1RatePct?: number }
 * @param {Object} [config] - Optional app config (from useConfig); uses constants if omitted.
 * @returns {{ isDeal: boolean, dealRehabLevel: string|null, estimatedRent, annualNOI, bhCashOnCash, investmentRequired } | null}
 */
export function analyzePropertyForDeal(property, financingOptions = null, config = null) {
  const minLoan = config?.minLoanAmount ?? MIN_LOAN_AMOUNT;
  const rehabCost = config?.rehabCost ?? REHAB_COST;
  const rehabTime = config?.rehabTime ?? REHAB_TIME;

  const baseInput = buildCalcInputFromProperty(property, "Full");
  if (!baseInput) return null;

  const fixedRent = baseInput.totalRent;
  const requestedFinancing = financingOptions?.addFinancing === true;
  const downPaymentPct = financingOptions?.downPaymentPct ?? 20;
  const mortgage1RatePct = financingOptions?.mortgage1RatePct ?? 7.5;
  const offerPrice = baseInput.offerPrice;
  const loanAmountIfFinanced = offerPrice * (1 - (Number(downPaymentPct) || 20) / 100);
  const useFinancing = requestedFinancing && loanAmountIfFinanced >= minLoan;

  try {
    let lastDealLevel = null;
    let lastDealResult = null;
    const stored = loadStoredInput();

    for (const level of REHAB_LEVELS) {
      let input = buildCalcInputFromProperty(property, level, fixedRent);
      input = mergeStored(input, stored);
      input.rehabLevel = level;
      input.rehabCost = rehabCost[level] ?? rehabCost.Full ?? 30000;
      input.rehabMonths = rehabTime[level] ?? 3;
      if (useFinancing) {
        input.mortgage1YN = "Yes";
        input.downPaymentPct = Number(downPaymentPct) || 20;
        input.mortgage1Rate = (Number(mortgage1RatePct) || 7.5) / 100;
      }
      const result = calc(input, config);
      if (result.isDeal) {
        lastDealLevel = level;
        lastDealResult = result;
      } else {
        break;
      }
    }

    const fallbackLevel = lastDealLevel ?? "Full";
    let fallbackInput = buildCalcInputFromProperty(property, fallbackLevel, fixedRent);
    fallbackInput = mergeStored(fallbackInput, stored);
    fallbackInput.rehabLevel = fallbackLevel;
    fallbackInput.rehabCost = rehabCost[fallbackLevel] ?? rehabCost.Full ?? 30000;
    fallbackInput.rehabMonths = rehabTime[fallbackLevel] ?? 3;
    const result = lastDealResult ?? calc(fallbackInput, config);

    return {
      isDeal: lastDealLevel != null,
      dealRehabLevel: lastDealLevel,
      dealCheck1: result.dealCheck1,
      dealCheck2: result.dealCheck2,
      dealCheck3: result.dealCheck3,
      estimatedRent: fixedRent,
      annualNOI: result.noi,
      bhCashOnCash: result.bhCashOnCash,
      investmentRequired: result.bhTotalInvestment,
      loanAmount: useFinancing ? result.mortgage1Amt : null,
    };
  } catch (e) {
    console.warn("Quick deal analysis failed for property:", property?.id, e);
    return null;
  }
}

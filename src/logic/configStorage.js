/**
 * Firestore read/write for app config parameters. Admins can write.
 */

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { mergeConfig, DEFAULT_CONFIG } from "./configParams.js";

const CONFIG_DOC_ID = "params";

/** Load app config from Firestore. Returns merged config (defaults + overrides). */
export async function loadAppConfig() {
  if (!db) return mergeConfig(null);
  try {
    const ref = doc(db, "appConfig", CONFIG_DOC_ID);
    const snap = await getDoc(ref);
    if (!snap.exists()) return mergeConfig(null);
    return mergeConfig(snap.data());
  } catch (e) {
    console.warn("Failed to load app config, using defaults:", e);
    return mergeConfig(null);
  }
}

/** Save app config to Firestore. Caller must be admin (Firestore rules enforce). */
export async function saveAppConfig(config) {
  if (!db) throw new Error("Firebase is not configured");
  const payload = {
    maxTpc: config.maxTpc,
    minLoanAmount: config.minLoanAmount,
    rehabCost: config.rehabCost,
    rehabTime: config.rehabTime,
    detroitTaxSevRatio: config.detroitTaxSevRatio,
    detroitTaxRate: config.detroitTaxRate,
    detroitTaxFlat: config.detroitTaxFlat,
    referralFraction: config.referralFraction,
    initialReferralPct: config.initialReferralPct,
    investorReferralPct: config.investorReferralPct,
    mortgagePointsRate: config.mortgagePointsRate,
    minAcqMgmtFee: config.minAcqMgmtFee,
    minRealtorFee: config.minRealtorFee,
    depreciationYears: config.depreciationYears,
    depreciationLandFraction: config.depreciationLandFraction,
    depreciationMinBasis: config.depreciationMinBasis,
    titleInsuranceRates: config.titleInsuranceRates,
  };
  const ref = doc(db, "appConfig", CONFIG_DOC_ID);
  await setDoc(ref, payload, { merge: true });
}

export { DEFAULT_CONFIG };

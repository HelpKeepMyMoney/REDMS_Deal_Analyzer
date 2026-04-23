import { describe, it, expect } from "vitest";
import { calc, calcTitleInsurance, DEFAULT_INPUT } from "./redmsCalc.js";
import { MAX_TPC, MIN_FIRST_MTG_UPFRONT_POINTS } from "./constants.js";

describe("redmsCalc", () => {
  it("returns all expected keys for default input", () => {
    const r = calc(DEFAULT_INPUT);
    const expectedKeys = [
      "rehabCost",
      "rehabMonths",
      "holdingMonths",
      "offerPrice",
      "totalInvestment",
      "totalCosts",
      "noi",
      "arv",
      "bhTotalInvestment",
      "capRate",
      "bhCashOnCash",
      "isDeal",
      "dealCheck1",
      "dealCheck2",
      "dealCheck3",
      "projections",
      "gt",
    ];
    for (const key of expectedKeys) {
      expect(r).toHaveProperty(key);
    }
  });

  it("projections has 30 years", () => {
    const r = calc(DEFAULT_INPUT);
    expect(r.projections).toHaveLength(30);
    expect(r.projections[0].yr).toBe(1);
    expect(r.projections[29].yr).toBe(30);
  });

  it("deal checks are booleans", () => {
    const r = calc(DEFAULT_INPUT);
    expect(typeof r.dealCheck1).toBe("boolean");
    expect(typeof r.dealCheck2).toBe("boolean");
    expect(typeof r.dealCheck3).toBe("boolean");
    expect(typeof r.isDeal).toBe("boolean");
  });

  it("isDeal is false when flip cash-on-cash < 25%", () => {
    const inp = { ...DEFAULT_INPUT, offerPrice: 100000, totalRent: 500 };
    const r = calc(inp);
    expect(r.cashOnCash < 0.25).toBe(true);
    expect(r.dealCheck1).toBe(true);
    expect(r.isDeal).toBe(false);
  });

  it("isDeal is false when bhTotalInvestment > MAX_TPC", () => {
    const inp = { ...DEFAULT_INPUT, offerPrice: 100000, totalRent: 3000 };
    const r = calc(inp);
    expect(r.dealCheck3).toBe(true);
    expect(r.isDeal).toBe(false);
  });

  it("uses rehab cost and months from input when provided", () => {
    expect(calc({ ...DEFAULT_INPUT, rehabLevel: "No", rehabCost: 0, rehabMonths: 0 }).rehabCost).toBe(0);
    expect(calc({ ...DEFAULT_INPUT, rehabLevel: "No", rehabCost: 0, rehabMonths: 0 }).rehabMonths).toBe(0);
    expect(calc({ ...DEFAULT_INPUT, rehabLevel: "Full", rehabCost: 30000, rehabMonths: 3 }).rehabCost).toBe(30000);
    expect(calc({ ...DEFAULT_INPUT, rehabLevel: "Full", rehabCost: 30000, rehabMonths: 3 }).rehabMonths).toBe(3);
  });

  it("manual rehab overrides are used in calculations", () => {
    const r = calc({ ...DEFAULT_INPUT, rehabLevel: "Full", rehabCost: 25000, rehabMonths: 2 });
    expect(r.rehabCost).toBe(25000);
    expect(r.rehabMonths).toBe(2);
  });

  it("falls back to level presets when rehab cost/months omitted", () => {
    const inpNo = { ...DEFAULT_INPUT, rehabLevel: "No" };
    delete inpNo.rehabCost;
    delete inpNo.rehabMonths;
    expect(calc(inpNo).rehabCost).toBe(0);
    expect(calc(inpNo).rehabMonths).toBe(0);
    const inpFull = { ...DEFAULT_INPUT, rehabLevel: "Full" };
    delete inpFull.rehabCost;
    delete inpFull.rehabMonths;
    expect(calc(inpFull).rehabCost).toBe(30000);
    expect(calc(inpFull).rehabMonths).toBe(3);
  });

  it("NOI and ARV are non-negative for sane input", () => {
    const r = calc(DEFAULT_INPUT);
    expect(r.noi).toBeGreaterThanOrEqual(0);
    expect(r.arv).toBeGreaterThanOrEqual(0);
  });

  it("uses Michigan tiered title insurance estimate when titleInsurance omitted", () => {
    const inp = { ...DEFAULT_INPUT, titleInsurance: undefined };
    const r = calc(inp);
    expect(r.titleIns).toBe(calcTitleInsurance(inp.offerPrice));
    expect(r.titleIns).toBe(375); // $15,500 <= $20k → base $375
  });

  it("uses manual title insurance when provided", () => {
    const inp = { ...DEFAULT_INPUT, titleInsurance: 500 };
    const r = calc(inp);
    expect(r.titleIns).toBe(500);
  });

  it("calcTitleInsurance returns tiered rates for various price points", () => {
    expect(calcTitleInsurance(15000)).toBe(375); // <= $20k
    expect(calcTitleInsurance(50000)).toBeCloseTo(596, 0); // $375 + 30k * 7.36/1000
    expect(calcTitleInsurance(100000)).toBeCloseTo(964, 0);
    expect(calcTitleInsurance(150000)).toBeCloseTo(1192, 0);
    expect(calcTitleInsurance(0)).toBe(0);
  });

  it("gt sums match sum of projection rows", () => {
    const r = calc(DEFAULT_INPUT);
    const sumRental = r.projections.reduce((s, p) => s + p.rentalIncome, 0);
    const sumNetCash = r.projections.reduce((s, p) => s + p.netCash, 0);
    expect(r.gt.rentalIncome).toBeCloseTo(sumRental, 0);
    expect(r.gt.netCash).toBeCloseTo(sumNetCash, 0);
  });

  it("businessCosts default and reduces NOI when increased", () => {
    const r0 = calc(DEFAULT_INPUT);
    expect(r0.bhBusinessCosts).toBe(150);
    const r1 = calc({ ...DEFAULT_INPUT, businessCosts: 1200 });
    expect(r1.bhBusinessCosts).toBe(1200);
    expect(r1.noi).toBe(r0.noi - (1200 - 150));
  });

  it("1st Mtg upfront points are at least MIN_FIRST_MTG_UPFRONT_POINTS when 1st mortgage is Yes", () => {
    const inp = { ...DEFAULT_INPUT, mortgage1YN: "Yes", offerPrice: 15500, downPaymentPct: 20 };
    const r = calc(inp);
    expect(r.mortgage1Pts).toBe(MIN_FIRST_MTG_UPFRONT_POINTS);
  });

  it("1st Mtg upfront points stay percentage-based when above floor", () => {
    const inp = { ...DEFAULT_INPUT, mortgage1YN: "Yes", offerPrice: 200000, downPaymentPct: 20 };
    const r = calc(inp);
    const loan = 160000;
    expect(r.mortgage1Pts).toBeCloseTo(loan * 0.04, 0);
  });

  it("applies 1st mtg upfront floor for legacy mortgage1YN yes/true from Firestore", () => {
    const base = { ...DEFAULT_INPUT, offerPrice: 15500, downPaymentPct: 20 };
    expect(calc({ ...base, mortgage1YN: "YES" }).mortgage1Pts).toBe(MIN_FIRST_MTG_UPFRONT_POINTS);
    expect(calc({ ...base, mortgage1YN: true }).mortgage1Pts).toBe(MIN_FIRST_MTG_UPFRONT_POINTS);
    expect(calc({ ...base, mortgage1YN: "  yes " }).mortgage1Pts).toBe(MIN_FIRST_MTG_UPFRONT_POINTS);
  });

  it("includes landlord's insurance in closing as 1/9 of annual premium", () => {
    const inp = { ...DEFAULT_INPUT, landlordsInsurance: 1500 };
    const r = calc(inp);
    expect(r.annualInsurance).toBe(1500);
    expect(r.landlordsClosingIns).toBeCloseTo(1500 / 9, 8);
    expect(r.prepaidIns).toBe(r.landlordsClosingIns);
  });
});

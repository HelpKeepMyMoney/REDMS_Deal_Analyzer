import { describe, it, expect } from "vitest";
import { estimateRentHeuristic, estimateMonthlyRent } from "./rentEstimate.js";

describe("rentEstimate", () => {
  describe("estimateRentHeuristic", () => {
    it("returns bedroom-based rent for Detroit Section 8", () => {
      expect(estimateRentHeuristic({ bedrooms: 1 })).toBeGreaterThanOrEqual(700);
      expect(estimateRentHeuristic({ bedrooms: 2 })).toBeGreaterThanOrEqual(850);
      expect(estimateRentHeuristic({ bedrooms: 3 })).toBeGreaterThanOrEqual(1000);
      expect(estimateRentHeuristic({ bedrooms: 4 })).toBeGreaterThanOrEqual(1150);
    });

    it("adjusts by sqft when provided", () => {
      const base = estimateRentHeuristic({ bedrooms: 3 });
      const withSqft = estimateRentHeuristic({ bedrooms: 3, sqft: 1500 });
      expect(withSqft).not.toBe(base);
    });

    it("adds basement bonus when basement is Yes", () => {
      const noBasement = estimateRentHeuristic({ bedrooms: 3, basement: "No" });
      const withBasement = estimateRentHeuristic({ bedrooms: 3, basement: "Yes" });
      expect(withBasement).toBeGreaterThan(noBasement);
    });

    it("ignores offerPrice and rehabCost (no 1% sanity check)", () => {
      const rentWithout = estimateRentHeuristic({ bedrooms: 1 });
      const rentWith = estimateRentHeuristic({
        bedrooms: 1,
        offerPrice: 50000,
        rehabCost: 10000,
      });
      expect(rentWith).toBe(rentWithout);
    });

    it("returns a number between 400 and 3000", () => {
      const rent = estimateRentHeuristic({ bedrooms: 0 });
      expect(rent).toBeGreaterThanOrEqual(400);
      expect(rent).toBeLessThanOrEqual(3000);
    });

    it("handles empty property", () => {
      expect(estimateRentHeuristic({})).toBeGreaterThan(0);
    });
  });

  describe("estimateMonthlyRent", () => {
    it("returns heuristic when API is unavailable", async () => {
      const result = await estimateMonthlyRent({
        bedrooms: 3,
        sqft: 1000,
        basement: "Yes",
      });
      expect(result.rent).toBeGreaterThan(0);
      expect(result.source).toBe("heuristic");
    });

    it("returns heuristic when address is incomplete", async () => {
      const result = await estimateMonthlyRent({
        street: "",
        city: "",
        bedrooms: 3,
      });
      expect(result.source).toBe("heuristic");
      expect(result.rent).toBeGreaterThan(0);
    });
  });

});

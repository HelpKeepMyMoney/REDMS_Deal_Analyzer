import { describe, it, expect, vi, beforeEach } from "vitest";
import { TIERS } from "./tierConstants.js";

const mockDocData = { monthlyCounts: {}, overagePaidCounts: {}, totalAnalysesCount: 0 };
const mockGetDoc = vi.fn();

vi.mock("../firebase.js", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: vi.fn(),
  serverTimestamp: () => ({}),
}));

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function makeSnapshot(data) {
  return {
    exists: () => true,
    data: () => ({ ...data }),
  };
}

describe("dealUsageStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocData.monthlyCounts = {};
    mockDocData.overagePaidCounts = {};
    mockDocData.totalAnalysesCount = 0;
    mockGetDoc.mockResolvedValue(makeSnapshot(mockDocData));
  });

  it("allows admin regardless of usage", async () => {
    const { canPerformAnalysis } = await import("./dealUsageStorage.js");
    const result = await canPerformAnalysis("uid", TIERS.INVESTOR, true);
    expect(result).toEqual({ allowed: true, overage: false, count: 0, limit: Infinity });
  });

  it("allows paid tier when under limit", async () => {
    const month = getCurrentMonth();
    mockDocData.monthlyCounts = { [month]: 5 };
    mockDocData.overagePaidCounts = {};
    mockGetDoc.mockResolvedValue(makeSnapshot(mockDocData));
    const { canPerformAnalysis } = await import("./dealUsageStorage.js");
    const result = await canPerformAnalysis("uid", TIERS.INVESTOR, false);
    expect(result.allowed).toBe(true);
    expect(result.overage).toBe(false);
    expect(result.count).toBe(5);
    expect(result.limit).toBe(10);
  });

  it("disallows when over limit and no overage paid", async () => {
    const month = getCurrentMonth();
    mockDocData.monthlyCounts = { [month]: 10 };
    mockDocData.overagePaidCounts = {};
    mockGetDoc.mockResolvedValue(makeSnapshot(mockDocData));
    const { canPerformAnalysis } = await import("./dealUsageStorage.js");
    const result = await canPerformAnalysis("uid", TIERS.INVESTOR, false);
    expect(result.allowed).toBe(false);
    expect(result.overage).toBe(true);
    expect(result.count).toBe(10);
    expect(result.limit).toBe(10);
  });

  it("allows when over limit but overage paid", async () => {
    const month = getCurrentMonth();
    mockDocData.monthlyCounts = { [month]: 11 };
    mockDocData.overagePaidCounts = { [month]: 2 };
    mockGetDoc.mockResolvedValue(makeSnapshot(mockDocData));
    const { canPerformAnalysis } = await import("./dealUsageStorage.js");
    const result = await canPerformAnalysis("uid", TIERS.INVESTOR, false);
    expect(result.allowed).toBe(true);
    expect(result.overage).toBe(true);
    expect(result.count).toBe(11);
    expect(result.limit).toBe(10);
  });

  it("disallows free tier when at limit", async () => {
    mockDocData.totalAnalysesCount = 3;
    mockGetDoc.mockResolvedValue(makeSnapshot(mockDocData));
    const { canPerformAnalysis } = await import("./dealUsageStorage.js");
    const result = await canPerformAnalysis("uid", TIERS.FREE, false);
    expect(result.allowed).toBe(false);
    expect(result.overage).toBe(false);
    expect(result.count).toBe(3);
    expect(result.limit).toBe(3);
  });
});

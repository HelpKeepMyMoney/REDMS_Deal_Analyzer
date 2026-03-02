import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchPropertyDetails } from "./propertySearchApi.js";

describe("fetchPropertyDetails", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls Detroit API for Detroit address via options", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          {
            attributes: {
              parcel_number: "12345",
              taxpayer_1: "Test Owner",
              legal_description: "LOT 1",
              taxable_value: 10000,
            },
          },
        ],
      }),
    });

    const result = await fetchPropertyDetails("123 Main St, Detroit, MI 48201", {
      city: "Detroit",
      state: "MI",
    });

    expect(fetchSpy).toHaveBeenCalled();
    const callUrl = fetchSpy.mock.calls[0][0];
    expect(callUrl).toContain("arcgis.com");
    expect(callUrl).not.toContain("rentcast.io");

    expect(result).not.toBeNull();
    expect(result?.apn).toBe("12345");
    expect(result?.propertyOwner).toBe("Test Owner");

    fetchSpy.mockRestore();
  });

  it("calls Detroit API for Detroit address via address string fallback", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [{ attributes: { parcel_number: "X" } }],
      }),
    });

    await fetchPropertyDetails("456 Oak Ave, Detroit, MI 48238", {});

    expect(fetchSpy).toHaveBeenCalled();
    const callUrl = fetchSpy.mock.calls[0][0];
    expect(callUrl).toContain("arcgis.com");

    fetchSpy.mockRestore();
  });
});

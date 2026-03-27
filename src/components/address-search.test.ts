import { afterEach, describe, expect, it, vi } from "vitest";
import { geocodeAddress } from "./address-search";

describe("geocodeAddress", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns coordinates and address on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [
              {
                center: [-122.65, 45.5],
                place_name: "123 Oak St, Portland, OR 97201",
              },
            ],
          }),
      }),
    );

    const result = await geocodeAddress("123 Oak St", "fake-token");
    expect(result).toEqual({
      lat: 45.5,
      lng: -122.65,
      address: "123 Oak St, Portland, OR 97201",
    });
  });

  it("returns null when no results found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ features: [] }),
      }),
    );

    const result = await geocodeAddress("zzzznotanaddress", "fake-token");
    expect(result).toBeNull();
  });

  it("returns null on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );

    const result = await geocodeAddress("123 Oak St", "fake-token");
    expect(result).toBeNull();
  });
});

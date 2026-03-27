// src/main.test.ts
import { describe, expect, it, vi } from "vitest";
import { lookupUsdaZone } from "./main";

describe("lookupUsdaZone", () => {
  it("returns zone on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ zone: "8b" }),
      }),
    );
    const zone = await lookupUsdaZone(45.5, -122.65);
    expect(zone).toBe("8b");
    vi.restoreAllMocks();
  });

  it("returns null on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );
    const zone = await lookupUsdaZone(45.5, -122.65);
    expect(zone).toBeNull();
    vi.restoreAllMocks();
  });
});

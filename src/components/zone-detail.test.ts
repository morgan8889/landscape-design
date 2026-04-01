import { describe, expect, it } from "vitest";
import { formatCoverage, formatZoneCost } from "./zone-detail";

describe("formatCoverage", () => {
  it("formats normal percentage", () => {
    expect(formatCoverage(85)).toBe("~85%");
  });

  it("rounds to nearest integer", () => {
    expect(formatCoverage(85.7)).toBe("~86%");
  });

  it("shows >100% for overflow", () => {
    expect(formatCoverage(140)).toBe(">100%");
  });

  it("shows ~0% for zero", () => {
    expect(formatCoverage(0)).toBe("~0%");
  });
});

describe("formatZoneCost", () => {
  it("formats zone cost", () => {
    expect(formatZoneCost(142.5)).toBe("$142.50");
  });

  it("returns null for zero", () => {
    expect(formatZoneCost(0)).toBeNull();
  });

  it("formats large amounts", () => {
    expect(formatZoneCost(1500)).toBe("$1,500.00");
  });
});

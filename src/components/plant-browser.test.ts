import { describe, expect, it } from "vitest";
import { resolveCostOverride } from "./plant-browser";

describe("resolveCostOverride", () => {
  it("returns undefined when price was not edited", () => {
    expect(resolveCostOverride(false, 9.99)).toBeUndefined();
  });

  it("returns price when edited with a valid number", () => {
    expect(resolveCostOverride(true, 12.5)).toBe(12.5);
  });

  it("returns undefined when price field was cleared (NaN)", () => {
    expect(resolveCostOverride(true, Number.NaN)).toBeUndefined();
  });

  it("returns 0 when price is explicitly set to zero", () => {
    expect(resolveCostOverride(true, 0)).toBe(0);
  });

  it("returns undefined when price is negative", () => {
    expect(resolveCostOverride(true, -5)).toBeUndefined();
  });

  it("returns undefined when price is Infinity", () => {
    expect(resolveCostOverride(true, Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});

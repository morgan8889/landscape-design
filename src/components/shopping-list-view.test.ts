import { describe, expect, it } from "vitest";
import type { Zone, ZoneCategory } from "../types";
import { buildZoneLabels } from "./shopping-list-view";

const zone = (id: string, category: ZoneCategory): Zone => ({
  id,
  category,
  vertices: [],
  areaSqFt: 100,
  plants: [],
});

describe("buildZoneLabels", () => {
  it("returns category label for a single zone", () => {
    const labels = buildZoneLabels([zone("z1", "garden-bed")]);
    expect(labels.get("z1")).toBe("Garden Bed");
  });

  it("appends index when multiple zones share a category", () => {
    const labels = buildZoneLabels([
      zone("z1", "garden-bed"),
      zone("z2", "garden-bed"),
    ]);
    expect(labels.get("z1")).toBe("Garden Bed #1");
    expect(labels.get("z2")).toBe("Garden Bed #2");
  });

  it("does not index zones whose category is unique", () => {
    const labels = buildZoneLabels([
      zone("z1", "garden-bed"),
      zone("z2", "lawn"),
      zone("z3", "garden-bed"),
    ]);
    expect(labels.get("z1")).toBe("Garden Bed #1");
    expect(labels.get("z2")).toBe("Lawn");
    expect(labels.get("z3")).toBe("Garden Bed #2");
  });

  it("returns an empty map for an empty zones array", () => {
    expect(buildZoneLabels([])).toEqual(new Map());
  });
});

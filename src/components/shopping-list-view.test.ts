// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { Zone, ZoneCategory } from "../types";
import { buildZoneLabels, renderShoppingList } from "./shopping-list-view";

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

const DESIGN_BASE = {
  id: "test-id",
  address: "1 Test St",
  center: { lat: 0, lng: 0 },
  boundary: [],
  areaSqFt: 100,
  perimeterFt: 40,
  usdaZone: "8b",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("renderShoppingList", () => {
  it("shows empty state when design has no plants", () => {
    const container = document.createElement("div");
    renderShoppingList(container, { ...DESIGN_BASE, zones: [] }, vi.fn());
    expect(container.querySelector(".shopping-list-empty")).not.toBeNull();
  });

  it("renders a plant row when design has a plant assignment", () => {
    const container = document.createElement("div");
    const design = {
      ...DESIGN_BASE,
      zones: [
        {
          id: "z1",
          category: "garden-bed" as ZoneCategory,
          vertices: [],
          areaSqFt: 320,
          plants: [
            { plantId: "lavender", quantity: 10, calculatedQuantity: 10 },
          ],
        },
      ],
    };
    renderShoppingList(container, design, vi.fn());
    expect(container.querySelector(".shopping-item-name")?.textContent).toBe(
      "Lavender",
    );
    expect(container.querySelector(".shopping-item-qty")?.textContent).toBe(
      "x10",
    );
  });

  it("shows the grand total when plants are present", () => {
    const container = document.createElement("div");
    const design = {
      ...DESIGN_BASE,
      zones: [
        {
          id: "z1",
          category: "garden-bed" as ZoneCategory,
          vertices: [],
          areaSqFt: 320,
          plants: [{ plantId: "lavender", quantity: 2, calculatedQuantity: 2 }],
        },
      ],
    };
    renderShoppingList(container, design, vi.fn());
    expect(container.querySelector(".shopping-total-amount")).not.toBeNull();
  });

  it("calls onBack when Back to Summary button is clicked", () => {
    const container = document.createElement("div");
    const onBack = vi.fn();
    renderShoppingList(container, { ...DESIGN_BASE, zones: [] }, onBack);
    const backBtn = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".btn"),
    ).find((b) => b.textContent === "Back to Summary");
    backBtn?.click();
    expect(onBack).toHaveBeenCalledOnce();
  });
});

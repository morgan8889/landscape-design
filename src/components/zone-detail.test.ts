// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Zone } from "../types";
import {
  formatCoverage,
  formatZoneCost,
  renderZoneDetail,
} from "./zone-detail";

afterEach(() => {
  document.body.replaceChildren();
});

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

const emptyZone: Zone = {
  id: "z1",
  category: "garden-bed",
  vertices: [],
  areaSqFt: 320,
};

const zoneWithPlant: Zone = {
  ...emptyZone,
  plants: [{ plantId: "lavender", quantity: 5, calculatedQuantity: 5 }],
};

describe("renderZoneDetail", () => {
  it("shows 'No plants assigned' for an empty zone", () => {
    const container = document.createElement("div");
    renderZoneDetail(container, emptyZone, vi.fn(), vi.fn());
    expect(container.querySelector(".zone-detail-empty")?.textContent).toBe(
      "No plants assigned",
    );
  });

  it("renders area in sq ft", () => {
    const container = document.createElement("div");
    renderZoneDetail(container, emptyZone, vi.fn(), vi.fn());
    expect(container.querySelector(".zone-detail-area")?.textContent).toBe(
      "320 sq ft",
    );
  });

  it("renders plant quantity when plants present", () => {
    const container = document.createElement("div");
    renderZoneDetail(container, zoneWithPlant, vi.fn(), vi.fn());
    const rows = container.querySelectorAll(".zone-plant-row");
    expect(rows).toHaveLength(1);
    expect(container.querySelector(".zone-plant-qty")?.textContent).toBe("×5");
  });

  it("renders coverage percent when plants present", () => {
    const container = document.createElement("div");
    renderZoneDetail(container, zoneWithPlant, vi.fn(), vi.fn());
    expect(container.querySelector(".zone-coverage-percent")).not.toBeNull();
  });

  it("calls onAddPlants when Add Plants button clicked", () => {
    const onAdd = vi.fn();
    const container = document.createElement("div");
    renderZoneDetail(container, emptyZone, onAdd, vi.fn());
    container.querySelector<HTMLButtonElement>(".zone-detail-add-btn")?.click();
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it("shows confirm dialog (not callback directly) when remove clicked", () => {
    const onRemove = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    renderZoneDetail(container, zoneWithPlant, vi.fn(), onRemove);
    container.querySelector<HTMLButtonElement>(".zone-plant-remove")?.click();
    expect(onRemove).not.toHaveBeenCalled();
    expect(document.querySelector(".confirm-dialog-overlay")).not.toBeNull();
  });
});

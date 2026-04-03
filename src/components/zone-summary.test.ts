// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Zone } from "../types";
import {
  formatZoneArea,
  getTotalZoneArea,
  renderZoneSummary,
} from "./zone-summary";

afterEach(() => {
  document.body.replaceChildren();
});

describe("formatZoneArea", () => {
  it("formats area with category label", () => {
    expect(formatZoneArea("garden-bed", 320)).toBe("Garden Bed — 320 sq ft");
  });

  it("rounds to nearest integer", () => {
    expect(formatZoneArea("patio", 150.7)).toBe("Patio — 151 sq ft");
  });
});

describe("getTotalZoneArea", () => {
  it("sums all zone areas", () => {
    const zones: Zone[] = [
      { id: "1", category: "garden-bed", vertices: [], areaSqFt: 100 },
      { id: "2", category: "patio", vertices: [], areaSqFt: 200 },
    ];
    expect(getTotalZoneArea(zones)).toBe(300);
  });

  it("returns 0 for empty array", () => {
    expect(getTotalZoneArea([])).toBe(0);
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

describe("renderZoneSummary", () => {
  it("shows Add Zones button when no zones exist", () => {
    const container = document.createElement("div");
    renderZoneSummary(
      container,
      { ...DESIGN_BASE, zones: [] },
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );
    const btns = container.querySelectorAll<HTMLButtonElement>(".btn");
    const labels = Array.from(btns).map((b) => b.textContent);
    expect(labels).toContain("Add Zones");
  });

  it("shows Edit Zones button when zones exist", () => {
    const container = document.createElement("div");
    const zone: Zone = {
      id: "z1",
      category: "garden-bed",
      vertices: [],
      areaSqFt: 200,
    };
    renderZoneSummary(
      container,
      { ...DESIGN_BASE, zones: [zone] },
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );
    const btns = container.querySelectorAll<HTMLButtonElement>(".btn");
    const labels = Array.from(btns).map((b) => b.textContent);
    expect(labels).toContain("Edit Zones");
  });

  it("calls onAddZones when Add Zones button is clicked", () => {
    const onAddZones = vi.fn();
    const container = document.createElement("div");
    renderZoneSummary(
      container,
      { ...DESIGN_BASE, zones: [] },
      vi.fn(),
      onAddZones,
      vi.fn(),
      vi.fn(),
    );
    const addBtn = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".btn"),
    ).find((b) => b.textContent === "Add Zones");
    addBtn?.click();
    expect(onAddZones).toHaveBeenCalledOnce();
  });

  it("shows a Delete Zone button for each zone", () => {
    const container = document.createElement("div");
    const zones: Zone[] = [
      { id: "z1", category: "garden-bed", vertices: [], areaSqFt: 100 },
      { id: "z2", category: "lawn", vertices: [], areaSqFt: 200 },
    ];
    renderZoneSummary(
      container,
      { ...DESIGN_BASE, zones },
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );
    const deleteBtns = container.querySelectorAll(".zone-delete");
    expect(deleteBtns).toHaveLength(2);
  });

  it("shows confirm dialog (not callback directly) on Delete Zone click", () => {
    const onDelete = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    renderZoneSummary(
      container,
      {
        ...DESIGN_BASE,
        zones: [
          { id: "z1", category: "garden-bed", vertices: [], areaSqFt: 100 },
        ],
      },
      onDelete,
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );
    container.querySelector<HTMLButtonElement>(".zone-delete")?.click();
    expect(onDelete).not.toHaveBeenCalled();
    expect(document.querySelector(".confirm-dialog-overlay")).not.toBeNull();
  });
});

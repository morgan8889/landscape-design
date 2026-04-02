// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { Zone } from "../types";
import { renderBloomTimeline } from "./bloom-timeline";

const MONTH_LABELS = [
  "J",
  "F",
  "M",
  "A",
  "M",
  "J",
  "J",
  "A",
  "S",
  "O",
  "N",
  "D",
];

function makeZone(id: string, plantIds: string[]): Zone {
  return {
    id,
    category: "garden-bed",
    vertices: [],
    areaSqFt: 100,
    plants: plantIds.map((plantId) => ({
      plantId,
      quantity: 1,
      calculatedQuantity: 1,
    })),
  };
}

describe("renderBloomTimeline", () => {
  it("renders nothing when no zones are provided", () => {
    const container = document.createElement("div");
    renderBloomTimeline(container, []);
    expect(container.children).toHaveLength(0);
  });

  it("renders nothing when plants have no bloom or foliage data", () => {
    const container = document.createElement("div");
    const zones = [makeZone("z1", ["nonexistent-plant"])];
    renderBloomTimeline(container, zones);
    expect(container.children).toHaveLength(0);
  });

  it("renders the bloom timeline section when plants have bloom data", () => {
    const container = document.createElement("div");
    const zones = [makeZone("z1", ["lavender"])];
    renderBloomTimeline(container, zones);
    expect(container.querySelector(".bloom-timeline")).not.toBeNull();
  });

  it("renders 12 month abbreviation headers", () => {
    const container = document.createElement("div");
    const zones = [makeZone("z1", ["lavender"])];
    renderBloomTimeline(container, zones);
    const headers = container.querySelectorAll(".bloom-month-label");
    expect(headers).toHaveLength(12);
    const texts = Array.from(headers).map((h) => h.textContent);
    expect(texts).toEqual(MONTH_LABELS);
  });

  it("renders 12 summary bar cells", () => {
    const container = document.createElement("div");
    const zones = [makeZone("z1", ["lavender"])];
    renderBloomTimeline(container, zones);
    const cells = container.querySelectorAll(".bloom-summary-row .bloom-cell");
    expect(cells).toHaveLength(12);
  });

  it("marks gap months with bloom-cell-gap class", () => {
    const container = document.createElement("div");
    const zones = [makeZone("z1", ["lavender"])];
    renderBloomTimeline(container, zones);
    const gapCells = container.querySelectorAll(
      ".bloom-summary-row .bloom-cell-gap",
    );
    expect(gapCells.length).toBeGreaterThan(0);
  });

  it("shows gap callout text when gaps exist", () => {
    const container = document.createElement("div");
    const zones = [makeZone("z1", ["lavender"])];
    renderBloomTimeline(container, zones);
    const callout = container.querySelector(".bloom-gap-callout");
    expect(callout).not.toBeNull();
    expect(callout?.textContent).toMatch(/No bloom coverage/);
  });

  it("renders plant rows when toggle is clicked", () => {
    const container = document.createElement("div");
    const zones = [makeZone("z1", ["lavender", "black-eyed-susan"])];
    renderBloomTimeline(container, zones);
    const plantRows = container.querySelector(".bloom-plant-rows");
    expect(plantRows).not.toBeNull();
    // Initially hidden
    expect((plantRows as HTMLElement).hidden).toBe(true);
  });

  it("does not render gap callout when all months covered", () => {
    const container = document.createElement("div");
    // boxwood has foliage all 12 months
    const zones = [makeZone("z1", ["boxwood"])];
    renderBloomTimeline(container, zones);
    const callout = container.querySelector(".bloom-gap-callout");
    expect(callout).toBeNull();
  });

  it("renders plant emoji and name in plant rows", () => {
    const container = document.createElement("div");
    const zones = [makeZone("z1", ["lavender"])];
    renderBloomTimeline(container, zones);
    const rows = container.querySelectorAll(".bloom-plant-row");
    expect(rows.length).toBeGreaterThan(0);
    const firstRow = rows[0];
    expect(firstRow.querySelector(".bloom-label")).not.toBeNull();
    expect(firstRow.textContent).toContain("Lavender");
  });

  it("renders 12 cells per plant row", () => {
    const container = document.createElement("div");
    const zones = [makeZone("z1", ["lavender"])];
    renderBloomTimeline(container, zones);
    const rows = container.querySelectorAll(".bloom-plant-row");
    for (const row of Array.from(rows)) {
      const cells = row.querySelectorAll(".bloom-cell");
      expect(cells).toHaveLength(12);
    }
  });

  it("deduplicates the same plant assigned to multiple zones", () => {
    const container = document.createElement("div");
    const zones = [makeZone("z1", ["lavender"]), makeZone("z2", ["lavender"])];
    renderBloomTimeline(container, zones);
    const rows = container.querySelectorAll(".bloom-plant-row");
    const lavenderRows = Array.from(rows).filter((r) =>
      r.textContent?.includes("Lavender"),
    );
    expect(lavenderRows).toHaveLength(1);
  });
});

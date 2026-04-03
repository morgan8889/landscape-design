// src/storage/local-store.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { YardDesign } from "../types";
import {
  clearDesign,
  exportDesignJson,
  loadDesign,
  saveDesign,
} from "./local-store";

const STORAGE_KEY = "yard-design";

const sampleDesign: YardDesign = {
  id: "test-123",
  address: "123 Oak St, Portland, OR",
  center: { lat: 45.5, lng: -122.65 },
  boundary: [
    { lat: 45.5, lng: -122.65 },
    { lat: 45.5, lng: -122.649 },
    { lat: 45.501, lng: -122.649 },
    { lat: 45.501, lng: -122.65 },
  ],
  areaSqFt: 2400,
  perimeterFt: 196,
  usdaZone: "8b",
  createdAt: "2026-03-26T00:00:00Z",
  updatedAt: "2026-03-26T00:00:00Z",
};

afterEach(() => {
  localStorage.removeItem(STORAGE_KEY);
});

describe("saveDesign", () => {
  it("saves a design to localStorage", () => {
    saveDesign(sampleDesign);
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string)).toEqual(sampleDesign);
  });
});

describe("loadDesign", () => {
  it("returns null when nothing is saved", () => {
    expect(loadDesign()).toBeNull();
  });

  it("returns the saved design", () => {
    saveDesign(sampleDesign);
    expect(loadDesign()).toEqual(sampleDesign);
  });

  it("returns null when localStorage contains invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not valid json{{{");
    expect(loadDesign()).toBeNull();
  });
});

describe("loadDesign sanitizes costPerUnit", () => {
  const designWithPlants = (costPerUnit: unknown): string =>
    JSON.stringify({
      ...sampleDesign,
      zones: [
        {
          id: "z1",
          category: "garden-bed",
          vertices: [],
          areaSqFt: 100,
          plants: [
            {
              plantId: "lavender",
              quantity: 5,
              calculatedQuantity: 5,
              costPerUnit,
            },
          ],
        },
      ],
    });

  function loadedCostPerUnit(): unknown {
    const design = loadDesign();
    return design?.zones?.[0]?.plants?.[0]?.costPerUnit;
  }

  it("preserves valid costPerUnit", () => {
    localStorage.setItem(STORAGE_KEY, designWithPlants(12.5));
    expect(loadedCostPerUnit()).toBe(12.5);
  });

  it("preserves costPerUnit of zero", () => {
    localStorage.setItem(STORAGE_KEY, designWithPlants(0));
    expect(loadedCostPerUnit()).toBe(0);
  });

  it("strips negative costPerUnit", () => {
    localStorage.setItem(STORAGE_KEY, designWithPlants(-5));
    expect(loadedCostPerUnit()).toBeUndefined();
  });

  it("strips Infinity costPerUnit", () => {
    // JSON.stringify converts Infinity to null, so inject raw
    const raw = designWithPlants(0).replace(
      '"costPerUnit":0',
      '"costPerUnit":1e999',
    );
    localStorage.setItem(STORAGE_KEY, raw);
    expect(loadedCostPerUnit()).toBeUndefined();
  });

  it("strips NaN costPerUnit (parsed as null from JSON)", () => {
    const raw = designWithPlants(0).replace(
      '"costPerUnit":0',
      '"costPerUnit":null',
    );
    localStorage.setItem(STORAGE_KEY, raw);
    expect(loadedCostPerUnit()).toBeUndefined();
  });

  it("strips string costPerUnit", () => {
    localStorage.setItem(STORAGE_KEY, designWithPlants("free"));
    expect(loadedCostPerUnit()).toBeUndefined();
  });

  it("handles design with no zones", () => {
    saveDesign(sampleDesign);
    expect(loadDesign()).toEqual(sampleDesign);
  });
});

describe("loadDesign sanitizes quantity", () => {
  const designWithQuantity = (quantity: unknown): string =>
    JSON.stringify({
      ...sampleDesign,
      zones: [
        {
          id: "z1",
          category: "garden-bed",
          vertices: [],
          areaSqFt: 100,
          plants: [{ plantId: "lavender", quantity, calculatedQuantity: 5 }],
        },
      ],
    });

  function loadedQuantity(): unknown {
    return loadDesign()?.zones?.[0]?.plants?.[0]?.quantity;
  }

  it("preserves valid integer quantity", () => {
    localStorage.setItem(STORAGE_KEY, designWithQuantity(5));
    expect(loadedQuantity()).toBe(5);
  });

  it("clamps zero quantity to 1", () => {
    localStorage.setItem(STORAGE_KEY, designWithQuantity(0));
    expect(loadedQuantity()).toBe(1);
  });

  it("clamps negative quantity to 1", () => {
    localStorage.setItem(STORAGE_KEY, designWithQuantity(-3));
    expect(loadedQuantity()).toBe(1);
  });

  it("clamps fractional quantity to 1", () => {
    localStorage.setItem(STORAGE_KEY, designWithQuantity(2.7));
    expect(loadedQuantity()).toBe(1);
  });

  it("clamps NaN quantity to 1", () => {
    const raw = designWithQuantity(0).replace(
      '"quantity":0',
      '"quantity":null',
    );
    localStorage.setItem(STORAGE_KEY, raw);
    expect(loadedQuantity()).toBe(1);
  });
});

describe("exportDesignJson", () => {
  it("returns a JSON string of the design", () => {
    const json = exportDesignJson(sampleDesign);
    expect(JSON.parse(json)).toEqual(sampleDesign);
  });
});

describe("clearDesign", () => {
  it("removes the saved design from localStorage", () => {
    saveDesign(sampleDesign);
    clearDesign();
    expect(loadDesign()).toBeNull();
  });

  it("is a no-op when nothing is saved", () => {
    expect(() => clearDesign()).not.toThrow();
    expect(loadDesign()).toBeNull();
  });
});

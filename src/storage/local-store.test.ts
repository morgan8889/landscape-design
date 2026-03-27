// src/storage/local-store.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { YardDesign } from "../types";
import { exportDesignJson, loadDesign, saveDesign } from "./local-store";

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
});

describe("exportDesignJson", () => {
  it("returns a JSON string of the design", () => {
    const json = exportDesignJson(sampleDesign);
    expect(JSON.parse(json)).toEqual(sampleDesign);
  });
});

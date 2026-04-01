import { describe, expect, it } from "vitest";
import type { PlantAssignment, PlantCategory, PlantInfo, Zone } from "../types";
import {
  aggregatePlants,
  buildShoppingList,
  formatCategoryLabel,
  groupByCategory,
} from "./shopping-list";
import type { ShoppingLineItem } from "./shopping-list";

function mockPlant(
  overrides: Partial<PlantInfo> & {
    id: string;
    name: string;
    category: PlantCategory;
  },
): PlantInfo {
  return {
    emoji: "🌱",
    sunRequirement: "full-sun",
    waterNeed: "low",
    spacingInches: 18,
    matureHeightFt: 2,
    matureWidthFt: 2,
    tags: [],
    zoneCompatibility: ["garden-bed"],
    costPerUnit: 5.0,
    ...overrides,
  };
}

function makeZone(id: string, plants: PlantAssignment[] = []): Zone {
  return {
    id,
    category: "garden-bed",
    vertices: [],
    areaSqFt: 100,
    plants,
  };
}

const catalog: Record<string, PlantInfo> = {
  lavender: mockPlant({
    id: "lavender",
    name: "Lavender",
    category: "perennial",
    emoji: "💜",
    costPerUnit: 8,
  }),
  boxwood: mockPlant({
    id: "boxwood",
    name: "Boxwood",
    category: "shrub",
    emoji: "🌿",
    costPerUnit: 25,
  }),
  maple: mockPlant({
    id: "maple",
    name: "Maple",
    category: "tree",
    emoji: "🍁",
    costPerUnit: 50,
  }),
  petunia: mockPlant({
    id: "petunia",
    name: "Petunia",
    category: "annual",
    emoji: "🌺",
    costPerUnit: 3,
  }),
  fescue: mockPlant({
    id: "fescue",
    name: "Fescue",
    category: "grass",
    emoji: "🌾",
    costPerUnit: 2,
  }),
  creeping_thyme: mockPlant({
    id: "creeping_thyme",
    name: "Creeping Thyme",
    category: "ground-cover",
    emoji: "🌿",
    costPerUnit: 4,
  }),
};

const getPlantInfo = (id: string): PlantInfo | undefined => catalog[id];

describe("aggregatePlants", () => {
  it("returns empty array for empty zones array", () => {
    expect(aggregatePlants([], getPlantInfo)).toEqual([]);
  });

  it("returns empty array for zones with no plants", () => {
    const zones = [makeZone("z1"), makeZone("z2")];
    expect(aggregatePlants(zones, getPlantInfo)).toEqual([]);
  });

  it("combines same plant across two zones", () => {
    const zones = [
      makeZone("z1", [
        { plantId: "lavender", quantity: 5, calculatedQuantity: 5 },
      ]),
      makeZone("z2", [
        { plantId: "lavender", quantity: 3, calculatedQuantity: 3 },
      ]),
    ];
    const result = aggregatePlants(zones, getPlantInfo);
    expect(result).toHaveLength(1);
    expect(result[0].totalQuantity).toBe(8);
    expect(result[0].zoneIds).toEqual(["z1", "z2"]);
  });

  it("keeps different plants separate", () => {
    const zones = [
      makeZone("z1", [
        { plantId: "lavender", quantity: 5, calculatedQuantity: 5 },
        { plantId: "boxwood", quantity: 2, calculatedQuantity: 2 },
      ]),
    ];
    const result = aggregatePlants(zones, getPlantInfo);
    expect(result).toHaveLength(2);
    const ids = result.map((r) => r.plantId);
    expect(ids).toContain("lavender");
    expect(ids).toContain("boxwood");
  });

  it("handles cost overrides correctly", () => {
    const zones = [
      makeZone("z1", [
        {
          plantId: "lavender",
          quantity: 5,
          calculatedQuantity: 5,
          costPerUnit: 10,
        },
      ]),
      makeZone("z2", [
        { plantId: "lavender", quantity: 3, calculatedQuantity: 3 },
      ]),
    ];
    const result = aggregatePlants(zones, getPlantInfo);
    // zone A: 5 * 10 = 50, zone B: 3 * 8 (catalog) = 24 → lineTotal = 74
    expect(result[0].lineTotal).toBe(74);
    expect(result[0].unitCost).toBe(74 / 8);
  });

  it("uses catalog cost when no override", () => {
    const zones = [
      makeZone("z1", [
        { plantId: "lavender", quantity: 4, calculatedQuantity: 4 },
      ]),
    ];
    const result = aggregatePlants(zones, getPlantInfo);
    expect(result[0].lineTotal).toBe(32); // 4 * 8
    expect(result[0].unitCost).toBe(8);
  });

  it("sorts results alphabetically by name", () => {
    const zones = [
      makeZone("z1", [
        { plantId: "maple", quantity: 1, calculatedQuantity: 1 },
        { plantId: "boxwood", quantity: 2, calculatedQuantity: 2 },
        { plantId: "lavender", quantity: 3, calculatedQuantity: 3 },
      ]),
    ];
    const result = aggregatePlants(zones, getPlantInfo);
    expect(result.map((r) => r.name)).toEqual(["Boxwood", "Lavender", "Maple"]);
  });

  it("skips unknown plant IDs gracefully", () => {
    const zones = [
      makeZone("z1", [
        { plantId: "lavender", quantity: 5, calculatedQuantity: 5 },
        { plantId: "unknown_plant", quantity: 3, calculatedQuantity: 3 },
      ]),
    ];
    const result = aggregatePlants(zones, getPlantInfo);
    expect(result).toHaveLength(1);
    expect(result[0].plantId).toBe("lavender");
  });
});

describe("groupByCategory", () => {
  const items: ShoppingLineItem[] = [
    {
      plantId: "maple",
      name: "Maple",
      emoji: "🍁",
      category: "tree",
      totalQuantity: 2,
      unitCost: 50,
      lineTotal: 100,
      zoneIds: ["z1"],
    },
    {
      plantId: "boxwood",
      name: "Boxwood",
      emoji: "🌿",
      category: "shrub",
      totalQuantity: 5,
      unitCost: 25,
      lineTotal: 125,
      zoneIds: ["z1"],
    },
    {
      plantId: "lavender",
      name: "Lavender",
      emoji: "💜",
      category: "perennial",
      totalQuantity: 10,
      unitCost: 8,
      lineTotal: 80,
      zoneIds: ["z1", "z2"],
    },
  ];

  it("groups items correctly", () => {
    const groups = groupByCategory(items);
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.category)).toEqual([
      "tree",
      "shrub",
      "perennial",
    ]);
  });

  it("computes subtotals", () => {
    const groups = groupByCategory(items);
    const treeGroup = groups.find((g) => g.category === "tree");
    expect(treeGroup?.subtotal).toBe(100);
    const shrubGroup = groups.find((g) => g.category === "shrub");
    expect(shrubGroup?.subtotal).toBe(125);
  });

  it("orders categories: tree → shrub → perennial → annual → grass → ground-cover", () => {
    const allItems: ShoppingLineItem[] = [
      {
        plantId: "p1",
        name: "A",
        emoji: "🌱",
        category: "ground-cover",
        totalQuantity: 1,
        unitCost: 1,
        lineTotal: 1,
        zoneIds: ["z1"],
      },
      {
        plantId: "p2",
        name: "B",
        emoji: "🌱",
        category: "annual",
        totalQuantity: 1,
        unitCost: 1,
        lineTotal: 1,
        zoneIds: ["z1"],
      },
      {
        plantId: "p3",
        name: "C",
        emoji: "🌱",
        category: "tree",
        totalQuantity: 1,
        unitCost: 1,
        lineTotal: 1,
        zoneIds: ["z1"],
      },
      {
        plantId: "p4",
        name: "D",
        emoji: "🌱",
        category: "grass",
        totalQuantity: 1,
        unitCost: 1,
        lineTotal: 1,
        zoneIds: ["z1"],
      },
      {
        plantId: "p5",
        name: "E",
        emoji: "🌱",
        category: "shrub",
        totalQuantity: 1,
        unitCost: 1,
        lineTotal: 1,
        zoneIds: ["z1"],
      },
      {
        plantId: "p6",
        name: "F",
        emoji: "🌱",
        category: "perennial",
        totalQuantity: 1,
        unitCost: 1,
        lineTotal: 1,
        zoneIds: ["z1"],
      },
    ];
    const groups = groupByCategory(allItems);
    expect(groups.map((g) => g.category)).toEqual([
      "tree",
      "shrub",
      "perennial",
      "annual",
      "grass",
      "ground-cover",
    ]);
  });

  it("omits empty categories", () => {
    const shrubOnly: ShoppingLineItem[] = [
      {
        plantId: "boxwood",
        name: "Boxwood",
        emoji: "🌿",
        category: "shrub",
        totalQuantity: 5,
        unitCost: 25,
        lineTotal: 125,
        zoneIds: ["z1"],
      },
    ];
    const groups = groupByCategory(shrubOnly);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe("shrub");
  });
});

describe("buildShoppingList", () => {
  it("computes grandTotal, totalItems, totalQuantity", () => {
    const zones = [
      makeZone("z1", [
        { plantId: "lavender", quantity: 5, calculatedQuantity: 5 },
        { plantId: "boxwood", quantity: 2, calculatedQuantity: 2 },
      ]),
      makeZone("z2", [
        { plantId: "lavender", quantity: 3, calculatedQuantity: 3 },
      ]),
    ];
    const list = buildShoppingList(zones, getPlantInfo);
    // lavender: 8 * 8 = 64, boxwood: 2 * 25 = 50 → grand total = 114
    expect(list.grandTotal).toBe(114);
    expect(list.totalItems).toBe(2);
    expect(list.totalQuantity).toBe(10);
    expect(list.categories.length).toBeGreaterThan(0);
  });
});

describe("formatCategoryLabel", () => {
  it("maps all 6 categories correctly", () => {
    expect(formatCategoryLabel("tree")).toBe("Trees");
    expect(formatCategoryLabel("shrub")).toBe("Shrubs");
    expect(formatCategoryLabel("perennial")).toBe("Perennials");
    expect(formatCategoryLabel("annual")).toBe("Annuals");
    expect(formatCategoryLabel("grass")).toBe("Grasses");
    expect(formatCategoryLabel("ground-cover")).toBe("Ground Covers");
  });
});

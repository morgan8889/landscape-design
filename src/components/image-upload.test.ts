import { describe, expect, it } from "vitest";
import { isValidImageType } from "./image-upload";

describe("isValidImageType", () => {
  it("accepts jpg", () => {
    expect(isValidImageType("image/jpeg")).toBe(true);
  });

  it("accepts png", () => {
    expect(isValidImageType("image/png")).toBe(true);
  });

  it("rejects gif", () => {
    expect(isValidImageType("image/gif")).toBe(false);
  });

  it("rejects pdf", () => {
    expect(isValidImageType("application/pdf")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidImageType("")).toBe(false);
  });
});

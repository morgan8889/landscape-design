import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  isValidImageType,
  validateFile,
} from "./image-upload";

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

describe("validateFile", () => {
  it("accepts a valid small jpeg", () => {
    expect(validateFile({ type: "image/jpeg", size: 1024 })).toBeNull();
  });

  it("accepts a valid png at exactly the size limit", () => {
    expect(
      validateFile({ type: "image/png", size: MAX_IMAGE_BYTES }),
    ).toBeNull();
  });

  it("rejects a file that exceeds the size limit", () => {
    expect(
      validateFile({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 }),
    ).toBe("Image must be smaller than 5 MB.");
  });

  it("rejects an invalid mime type regardless of size", () => {
    expect(validateFile({ type: "image/gif", size: 100 })).toBe(
      "Please upload a JPG or PNG image.",
    );
  });

  it("reports size error before type error when both are invalid", () => {
    expect(validateFile({ type: "image/gif", size: MAX_IMAGE_BYTES + 1 })).toBe(
      "Image must be smaller than 5 MB.",
    );
  });
});

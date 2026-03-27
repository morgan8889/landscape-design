// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  formatArea,
  formatPerimeter,
  triggerJsonDownload,
} from "./yard-summary";

describe("formatArea", () => {
  it("formats area with commas and unit", () => {
    expect(formatArea(2400)).toBe("2,400 sq ft");
  });

  it("rounds to nearest integer", () => {
    expect(formatArea(2400.7)).toBe("2,401 sq ft");
  });
});

describe("formatPerimeter", () => {
  it("formats perimeter with unit", () => {
    expect(formatPerimeter(196)).toBe("196 ft");
  });

  it("rounds to nearest integer", () => {
    expect(formatPerimeter(196.4)).toBe("196 ft");
  });
});

describe("triggerJsonDownload", () => {
  it("creates a download link with correct content", () => {
    // jsdom does not implement URL.createObjectURL / revokeObjectURL — stub them first
    if (!URL.createObjectURL) {
      URL.createObjectURL = () => "";
    }
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = () => {};
    }

    const clickSpy = vi.fn();
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockReturnValue({
        href: "",
        download: "",
        click: clickSpy,
      } as unknown as HTMLAnchorElement);
    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:fake");
    const revokeObjectURLSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});

    triggerJsonDownload('{"test":true}', "design.json");

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:fake");

    createElementSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });
});

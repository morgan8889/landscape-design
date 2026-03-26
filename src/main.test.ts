import { describe, expect, it } from "vitest";
import { greet } from "./main";

describe("greet", () => {
  it("returns a greeting with the given name", () => {
    expect(greet("World")).toBe("Hello, World!");
  });

  it("handles empty string", () => {
    expect(greet("")).toBe("Hello, !");
  });
});

import { describe, expect, it } from "vitest";
import { retrievalQuery } from "../src/tools/query.js";

describe("retrievalQuery", () => {
  it("returns the scaffold response without throwing", () => {
    expect(retrievalQuery()).toEqual({ runs: [] });
  });
});

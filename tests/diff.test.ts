import { describe, expect, it } from "vitest";
import { retrievalDiff } from "../src/tools/diff.js";

describe("retrievalDiff", () => {
  it("returns the scaffold response without throwing", () => {
    expect(retrievalDiff()).toEqual({
      only_in_a: [],
      only_in_b: [],
      shared: [],
      summary: "0 chunks only in A, 0 only in B, 0 shared",
    });
  });
});

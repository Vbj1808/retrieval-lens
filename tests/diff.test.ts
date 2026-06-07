import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../src/db/index.js";
import { retrievalDiff } from "../src/tools/diff.js";
import { retrievalObserve, type ObserveInput } from "../src/tools/observe.js";

async function clearDatabase(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM chunks");
  await db.execute("DELETE FROM runs");
}

async function seedRun(input: ObserveInput): Promise<void> {
  const result = await retrievalObserve(input);
  expect(result.stored).toBe(true);
}

const runA: ObserveInput = {
  run_id: "run-a",
  query: "audit trail query A",
  chunks: [
    { content: "Shared by source", score: 0.8, source: "shared.md", rank: 1 },
    { content: "Only in run A", score: 0.7, source: "a-only.md", rank: 2 },
    { content: "Another shared source", score: 0.6, source: "delta.md", rank: 3 },
  ],
};

const runB: ObserveInput = {
  run_id: "run-b",
  query: "audit trail query B",
  chunks: [
    { content: "Shared by source with changed content", score: 0.75, source: "shared.md", rank: 1 },
    { content: "Only in run B", score: 0.65, source: "b-only.md", rank: 2 },
    { content: "Another shared source changed", score: 0.59, source: "delta.md", rank: 3 },
  ],
};

describe("retrievalDiff", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it("returns only-in-A, only-in-B, and shared chunks on the happy path", async () => {
    await seedRun(runA);
    await seedRun(runB);

    const diff = await retrievalDiff({ run_id_a: "run-a", run_id_b: "run-b", match_by: "source" });

    expect(diff.only_in_a).toEqual([{ content: "Only in run A", score: 0.7, source: "a-only.md", rank: 2 }]);
    expect(diff.only_in_b).toEqual([{ content: "Only in run B", score: 0.65, source: "b-only.md", rank: 2 }]);
    expect(diff.shared).toHaveLength(2);
    expect(diff.shared[0]).toMatchObject({
      chunk: { content: "Shared by source", score: 0.8, source: "shared.md", rank: 1 },
      score_a: 0.8,
      score_b: 0.75,
    });
    expect(diff.shared[0]?.score_delta).toBeCloseTo(-0.05);
    expect(diff.shared[1]).toMatchObject({
      chunk: { content: "Another shared source", score: 0.6, source: "delta.md", rank: 3 },
      score_a: 0.6,
      score_b: 0.59,
    });
    expect(diff.shared[1]?.score_delta).toBeCloseTo(-0.01);
  });

  it("matches chunks by source when match_by is source", async () => {
    await seedRun({
      run_id: "source-a",
      query: "source match A",
      chunks: [{ content: "Old source content", score: 0.9, source: "same-source.md", rank: 1 }],
    });
    await seedRun({
      run_id: "source-b",
      query: "source match B",
      chunks: [{ content: "New source content", score: 0.4, source: "same-source.md", rank: 1 }],
    });

    const diff = await retrievalDiff({ run_id_a: "source-a", run_id_b: "source-b", match_by: "source" });

    expect(diff.only_in_a).toEqual([]);
    expect(diff.only_in_b).toEqual([]);
    expect(diff.shared).toHaveLength(1);
    expect(diff.shared[0]).toMatchObject({
      chunk: { content: "Old source content", score: 0.9, source: "same-source.md", rank: 1 },
      score_a: 0.9,
      score_b: 0.4,
    });
    expect(diff.shared[0]?.score_delta).toBeCloseTo(-0.5);
  });

  it("matches chunks by content_hash when match_by is content_hash", async () => {
    await seedRun({
      run_id: "hash-a",
      query: "hash match A",
      chunks: [{ content: "Identical content, renamed source", score: 0.5, source: "old-name.md", rank: 1 }],
    });
    await seedRun({
      run_id: "hash-b",
      query: "hash match B",
      chunks: [{ content: "Identical content, renamed source", score: 0.8, source: "new-name.md", rank: 1 }],
    });

    const diff = await retrievalDiff({ run_id_a: "hash-a", run_id_b: "hash-b", match_by: "content_hash" });

    expect(diff.only_in_a).toEqual([]);
    expect(diff.only_in_b).toEqual([]);
    expect(diff.shared).toHaveLength(1);
    expect(diff.shared[0]).toMatchObject({
      chunk: { content: "Identical content, renamed source", score: 0.5, source: "old-name.md", rank: 1 },
      score_a: 0.5,
      score_b: 0.8,
    });
    expect(diff.shared[0]?.score_delta).toBeCloseTo(0.3);
  });

  it("returns empty only-in sets and zero deltas for identical runs", async () => {
    const chunks = [
      { content: "First identical chunk", score: 0.91, source: "one.md", rank: 1 },
      { content: "Second identical chunk", score: 0.82, source: "two.md", rank: 2 },
    ];
    await seedRun({ run_id: "identical-a", query: "same", chunks });
    await seedRun({ run_id: "identical-b", query: "same", chunks });

    const diff = await retrievalDiff({ run_id_a: "identical-a", run_id_b: "identical-b", match_by: "content_hash" });

    expect(diff.only_in_a).toEqual([]);
    expect(diff.only_in_b).toEqual([]);
    expect(diff.shared).toHaveLength(2);
    expect(diff.shared.map((shared) => shared.score_delta)).toEqual([0, 0]);
  });

  it("returns an MCP error when run_id_a is missing", async () => {
    await seedRun(runB);

    await expect(retrievalDiff({ run_id_a: "missing-a", run_id_b: "run-b", match_by: "source" })).rejects.toThrow(
      "run_id missing-a not found",
    );
  });

  it("returns an MCP error when run_id_b is missing", async () => {
    await seedRun(runA);

    await expect(retrievalDiff({ run_id_a: "run-a", run_id_b: "missing-b", match_by: "source" })).rejects.toThrow(
      "run_id missing-b not found",
    );
  });

  it("includes correct counts and average delta in the summary string", async () => {
    await seedRun(runA);
    await seedRun(runB);

    const diff = await retrievalDiff({ run_id_a: "run-a", run_id_b: "run-b", match_by: "source" });

    expect(diff.summary).toBe("1 chunks only in A, 1 only in B, 2 shared (avg delta -0.03)");
  });
});

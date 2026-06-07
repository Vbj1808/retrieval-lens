import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../src/db/index.js";
import { retrievalObserve, type ObserveInput } from "../src/tools/observe.js";
import { retrievalStats } from "../src/tools/stats.js";

async function clearDatabase(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM chunks");
  await db.execute("DELETE FROM runs");
}

async function setRunTimestamp(runId: string, createdAt: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE runs SET created_at = ? WHERE run_id = ?", [createdAt, runId]);
}

async function insertRun(input: ObserveInput, createdAt: string): Promise<void> {
  await retrievalObserve(input);
  await setRunTimestamp(input.run_id, createdAt);
}

const runA: ObserveInput = {
  run_id: "stats-run-a",
  query: "query a",
  pipeline_tag: "alpha",
  chunks: [
    { content: "a-one", score: 0.9, source: "shared.md", rank: 1 },
    { content: "a-two", score: 0.7, source: "alpha.md", rank: 2 },
    { content: "a-three", score: 0.2, source: "shared.md", rank: 3 },
  ],
};

const runB: ObserveInput = {
  run_id: "stats-run-b",
  query: "query b",
  pipeline_tag: "alpha",
  chunks: [
    { content: "b-one", score: 0.8, source: "shared.md", rank: 1 },
    { content: "b-two", score: 0.4, source: "beta.md", rank: 2 },
  ],
};

const runC: ObserveInput = {
  run_id: "stats-run-c",
  query: "query c",
  pipeline_tag: "beta",
  chunks: [
    { content: "c-one", score: 0.6, source: "gamma.md", rank: 1 },
    { content: "c-two", score: 0.1, source: "shared.md", rank: 2 },
  ],
};

async function insertStatsFixture(): Promise<void> {
  await insertRun(runA, "2026-06-01T10:00:00.000Z");
  await insertRun(runB, "2026-06-01T12:00:00.000Z");
  await insertRun(runC, "2026-06-03T09:00:00.000Z");
}

describe("retrievalStats", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it("computes total runs, average top-1 score, median, and p90 on the happy path", async () => {
    await insertStatsFixture();

    await expect(retrievalStats()).resolves.toMatchObject({
      total_runs: 3,
      avg_top1_score: (0.9 + 0.8 + 0.6) / 3,
      p50_score: 0.6,
      p90_score: 0.9,
    });
  });

  it("filters by pipeline_tag and only counts matching runs", async () => {
    await insertStatsFixture();

    const stats = await retrievalStats({ pipeline_tag: "alpha" });

    expect(stats.total_runs).toBe(2);
    expect(stats.avg_top1_score).toBeCloseTo(0.85);
    expect(stats.p50_score).toBe(0.7);
    expect(stats.p90_score).toBe(0.9);
  });

  it("filters by since_iso and only counts runs at or after the timestamp", async () => {
    await insertStatsFixture();

    await expect(retrievalStats({ since_iso: "2026-06-02T00:00:00.000Z" })).resolves.toMatchObject({
      total_runs: 1,
      avg_top1_score: 0.6,
      p50_score: 0.35,
      p90_score: 0.6,
    });
  });

  it("filters by until_iso and only counts runs at or before the timestamp", async () => {
    await insertStatsFixture();

    const stats = await retrievalStats({ until_iso: "2026-06-01T23:59:59.999Z" });

    expect(stats.total_runs).toBe(2);
    expect(stats.avg_top1_score).toBeCloseTo(0.85);
    expect(stats.p50_score).toBe(0.7);
    expect(stats.p90_score).toBe(0.9);
  });

  it("returns top_sources counted across matching runs and sorted by count descending", async () => {
    await insertStatsFixture();

    const stats = await retrievalStats();

    expect(stats.top_sources).toEqual([
      { source: "shared.md", count: 4 },
      { source: "alpha.md", count: 1 },
      { source: "beta.md", count: 1 },
      { source: "gamma.md", count: 1 },
    ]);
  });

  it("returns runs_per_day counted by date and sorted ascending", async () => {
    await insertStatsFixture();

    const stats = await retrievalStats();

    expect(stats.runs_per_day).toEqual([
      { date: "2026-06-01", count: 2 },
      { date: "2026-06-03", count: 1 },
    ]);
  });

  it("returns zero score metrics for matching runs that have no chunks", async () => {
    await insertRun(
      {
        run_id: "stats-empty-run",
        query: "empty retrieval",
        pipeline_tag: "empty",
        chunks: [],
      },
      "2026-06-04T00:00:00.000Z",
    );

    await expect(retrievalStats({ pipeline_tag: "empty" })).resolves.toEqual({
      total_runs: 1,
      avg_top1_score: 0,
      p50_score: 0,
      p90_score: 0,
      top_sources: [],
      runs_per_day: [{ date: "2026-06-04", count: 1 }],
    });
  });

  it("returns the zeroed struct without throwing when the database is empty", async () => {
    await expect(retrievalStats()).resolves.toEqual({
      total_runs: 0,
      avg_top1_score: 0,
      p50_score: 0,
      p90_score: 0,
      top_sources: [],
      runs_per_day: [],
    });
  });

  it("returns the zeroed struct without throwing when no runs match filters", async () => {
    await insertStatsFixture();

    await expect(retrievalStats({ pipeline_tag: "missing" })).resolves.toEqual({
      total_runs: 0,
      avg_top1_score: 0,
      p50_score: 0,
      p90_score: 0,
      top_sources: [],
      runs_per_day: [],
    });
  });
});

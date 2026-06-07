import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../src/db/index.js";
import { retrievalObserve, type ObserveInput } from "../src/tools/observe.js";

async function clearDatabase(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM chunks");
  await db.execute("DELETE FROM runs");
}

const sampleInput: ObserveInput = {
  run_id: "run-happy-path",
  query: "Which passages discuss RAG auditing?",
  pipeline_tag: "unit-test",
  chunks: [
    {
      content: "Retrieval-lens records every chunk seen by a model.",
      score: 0.92,
      source: "docs/overview.md",
      rank: 1,
    },
    {
      content: "Audit trails make replay and diff workflows easier.",
      score: 0.84,
      source: "docs/audit.md",
      rank: 2,
    },
  ],
};

describe("retrievalObserve", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it("inserts a run and its chunks on the happy path", async () => {
    await expect(retrievalObserve(sampleInput)).resolves.toEqual({
      stored: true,
      run_id: sampleInput.run_id,
      chunk_count: 2,
    });

    const db = await getDb();
    const runResult = await db.execute("SELECT run_id, query, pipeline_tag FROM runs WHERE run_id = ?", [
      sampleInput.run_id,
    ]);
    const chunkResult = await db.execute(
      "SELECT content, score, source, rank FROM chunks WHERE run_id = ? ORDER BY rank",
      [sampleInput.run_id],
    );

    expect(runResult.rows).toHaveLength(1);
    expect(runResult.rows[0]).toMatchObject({
      run_id: sampleInput.run_id,
      query: sampleInput.query,
      pipeline_tag: sampleInput.pipeline_tag,
    });
    expect(chunkResult.rows).toHaveLength(2);
    expect(chunkResult.rows[0]).toMatchObject({
      content: sampleInput.chunks[0]?.content,
      score: sampleInput.chunks[0]?.score,
      source: sampleInput.chunks[0]?.source,
      rank: sampleInput.chunks[0]?.rank,
    });
  });

  it("returns stored false for a duplicate run_id without throwing or overwriting", async () => {
    await retrievalObserve(sampleInput);

    const duplicateInput: ObserveInput = {
      run_id: sampleInput.run_id,
      query: "This query must not replace the original.",
      chunks: [
        {
          content: "This chunk should not be stored.",
          score: 0.1,
          source: "duplicate.md",
          rank: 1,
        },
      ],
    };

    await expect(retrievalObserve(duplicateInput)).resolves.toEqual({
      stored: false,
      run_id: sampleInput.run_id,
      chunk_count: 0,
    });

    const db = await getDb();
    const runResult = await db.execute("SELECT query FROM runs WHERE run_id = ?", [sampleInput.run_id]);
    const chunkCountResult = await db.execute("SELECT COUNT(*) AS count FROM chunks WHERE run_id = ?", [
      sampleInput.run_id,
    ]);

    expect(runResult.rows[0]?.query).toBe(sampleInput.query);
    expect(chunkCountResult.rows[0]?.count).toBe(2);
  });

  it("inserts the run and returns zero chunk_count when chunks is empty", async () => {
    const emptyInput: ObserveInput = {
      run_id: "run-empty-chunks",
      query: "A query with no retrieved chunks",
      chunks: [],
    };

    await expect(retrievalObserve(emptyInput)).resolves.toEqual({
      stored: true,
      run_id: emptyInput.run_id,
      chunk_count: 0,
    });

    const db = await getDb();
    const runResult = await db.execute("SELECT run_id, pipeline_tag FROM runs WHERE run_id = ?", [emptyInput.run_id]);
    const chunkResult = await db.execute("SELECT id FROM chunks WHERE run_id = ?", [emptyInput.run_id]);

    expect(runResult.rows).toHaveLength(1);
    expect(runResult.rows[0]).toMatchObject({ run_id: emptyInput.run_id, pipeline_tag: null });
    expect(chunkResult.rows).toHaveLength(0);
  });

  it("stores content_hash as a valid 64-character hexadecimal string", async () => {
    await retrievalObserve(sampleInput);

    const db = await getDb();
    const result = await db.execute("SELECT content_hash FROM chunks WHERE run_id = ? ORDER BY rank", [
      sampleInput.run_id,
    ]);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.content_hash).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/));
    expect(result.rows[1]?.content_hash).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/));
  });

  it("stores created_at as a valid ISO 8601 UTC timestamp", async () => {
    await retrievalObserve(sampleInput);

    const db = await getDb();
    const result = await db.execute("SELECT created_at FROM runs WHERE run_id = ?", [sampleInput.run_id]);
    const createdAt = result.rows[0]?.created_at;

    expect(createdAt).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/));
    expect(new Date(String(createdAt)).toISOString()).toBe(createdAt);
  });
});

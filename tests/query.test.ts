import { describe, expect, it } from "vitest";
import { retrievalObserve, type ObserveInput } from "../src/tools/observe.js";
import { retrievalQuery } from "../src/tools/query.js";

function taggedRun(runId: string, pipelineTag: string, rankOrder: number[] = [1]): ObserveInput {
  return {
    run_id: runId,
    query: `query for ${runId}`,
    pipeline_tag: pipelineTag,
    chunks: rankOrder.map((rank) => ({
      content: `content ${runId} rank ${rank}`,
      score: rank / 10,
      source: `source-${rank}.md`,
      rank,
    })),
  };
}

async function waitForNextTimestamp(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 5);
  });
}

describe("retrievalQuery", () => {
  it("returns a single observed run with all contracted fields when queried by run_id", async () => {
    const input: ObserveInput = {
      run_id: "query-happy-path-run",
      query: "Which chunks did the model see?",
      pipeline_tag: "query-happy-path",
      chunks: [
        {
          content: "Second-ranked context appears later in the result list.",
          score: 0.74,
          source: "docs/second.md",
          rank: 2,
        },
        {
          content: "First-ranked context appears first in replay output.",
          score: 0.91,
          source: "docs/first.md",
          rank: 1,
        },
      ],
    };

    await retrievalObserve(input);

    const result = await retrievalQuery({ run_id: input.run_id });

    expect(result.runs).toHaveLength(1);
    expect(result.runs[0]).toEqual({
      run_id: input.run_id,
      query: input.query,
      pipeline_tag: input.pipeline_tag,
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      chunks: [
        {
          content: input.chunks[1]?.content,
          score: input.chunks[1]?.score,
          source: input.chunks[1]?.source,
          rank: input.chunks[1]?.rank,
        },
        {
          content: input.chunks[0]?.content,
          score: input.chunks[0]?.score,
          source: input.chunks[0]?.source,
          rank: input.chunks[0]?.rank,
        },
      ],
    });
  });

  it("filters runs by pipeline_tag", async () => {
    const matchingTag = "query-pipeline-match";
    const otherTag = "query-pipeline-other";
    await retrievalObserve(taggedRun("query-pipeline-run-a", matchingTag));
    await retrievalObserve(taggedRun("query-pipeline-run-b", matchingTag));
    await retrievalObserve(taggedRun("query-pipeline-run-c", otherTag));

    const result = await retrievalQuery({ pipeline_tag: matchingTag, limit: 10 });

    expect(result.runs.map((run) => run.run_id).sort()).toEqual(["query-pipeline-run-a", "query-pipeline-run-b"]);
    expect(result.runs.every((run) => run.pipeline_tag === matchingTag)).toBe(true);
  });

  it("filters runs by since_iso", async () => {
    const pipelineTag = "query-since-filter";
    await retrievalObserve(taggedRun("query-since-before", pipelineTag));
    await waitForNextTimestamp();
    const sinceIso = new Date().toISOString();
    await waitForNextTimestamp();
    await retrievalObserve(taggedRun("query-since-after", pipelineTag));

    const result = await retrievalQuery({ pipeline_tag: pipelineTag, since_iso: sinceIso, limit: 10 });

    expect(result.runs.map((run) => run.run_id)).toEqual(["query-since-after"]);
    expect(result.runs[0]?.timestamp >= sinceIso).toBe(true);
  });

  it("returns an empty runs array without throwing when no run matches", async () => {
    await expect(retrievalQuery({ run_id: "query-missing-run" })).resolves.toEqual({ runs: [] });
  });

  it("silently clamps limits over 100", async () => {
    const pipelineTag = "query-limit-clamp";

    for (let index = 0; index < 105; index += 1) {
      await retrievalObserve(taggedRun(`query-limit-${index.toString().padStart(3, "0")}`, pipelineTag));
    }

    const result = await retrievalQuery({ pipeline_tag: pipelineTag, limit: 101 });

    expect(result.runs.length).toBeLessThanOrEqual(100);
    expect(result.runs).toHaveLength(100);
  });

  it("orders chunks by rank ascending", async () => {
    const run = taggedRun("query-rank-order", "query-rank-order", [3, 1, 2]);
    await retrievalObserve(run);

    const result = await retrievalQuery({ run_id: run.run_id });

    expect(result.runs[0]?.chunks.map((chunk) => chunk.rank)).toEqual([1, 2, 3]);
  });
});

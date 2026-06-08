#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getDb } from "./db/index.js";
import { retrievalObserve, retrievalObserveTool } from "./tools/observe.js";
import { retrievalQuery, retrievalQueryTool } from "./tools/query.js";
import { retrievalDiff, retrievalDiffTool } from "./tools/diff.js";
import { retrievalStats, retrievalStatsTool } from "./tools/stats.js";
import { logger } from "./utils/logger.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const chunkSchema = z.object({
  content: z.string(),
  score: z.number(),
  source: z.string(),
  rank: z.number().int(),
});

const retrievedChunkSchema = chunkSchema;

function asStructuredContent<T extends object>(value: T): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value as Record<string, unknown>,
  };
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "retrieval-lens", version: "0.1.0" });

  server.registerTool(
    "retrieval_observe",
    {
      title: "Retrieval Observe",
      description: retrievalObserveTool.description,
      _meta: { instructions: retrievalObserveTool.instructions },
      inputSchema: z.object({
        run_id: z.string(),
        query: z.string(),
        chunks: z.array(chunkSchema),
        pipeline_tag: z.string().optional(),
      }),
      outputSchema: z.object({
        stored: z.boolean(),
        run_id: z.string(),
        chunk_count: z.number(),
      }),
    },
    async (input) => asStructuredContent(await retrievalObserve(input)),
  );

  server.registerTool(
    "retrieval_query",
    {
      title: "Retrieval Query",
      description: retrievalQueryTool.description,
      _meta: { instructions: retrievalQueryTool.instructions },
      inputSchema: z.object({
        run_id: z.string().optional(),
        pipeline_tag: z.string().optional(),
        limit: z.number().optional(),
        since_iso: z.string().optional(),
      }),
      outputSchema: z.object({
        runs: z.array(
          z.object({
            run_id: z.string(),
            query: z.string(),
            pipeline_tag: z.string().nullable(),
            timestamp: z.string(),
            chunks: z.array(retrievedChunkSchema),
          }),
        ),
      }),
    },
    async (input) => asStructuredContent(await retrievalQuery(input)),
  );

  server.registerTool(
    "retrieval_diff",
    {
      title: "Retrieval Diff",
      description: retrievalDiffTool.description,
      _meta: { instructions: retrievalDiffTool.instructions },
      inputSchema: z.object({
        run_id_a: z.string(),
        run_id_b: z.string(),
        match_by: z.enum(["source", "content_hash"]),
      }),
      outputSchema: z.object({
        only_in_a: z.array(retrievedChunkSchema),
        only_in_b: z.array(retrievedChunkSchema),
        shared: z.array(
          z.object({
            chunk: retrievedChunkSchema,
            score_a: z.number(),
            score_b: z.number(),
            score_delta: z.number(),
          }),
        ),
        summary: z.string(),
      }),
    },
    async (input) => asStructuredContent(await retrievalDiff(input)),
  );

  server.registerTool(
    "retrieval_stats",
    {
      title: "Retrieval Stats",
      description: retrievalStatsTool.description,
      _meta: { instructions: retrievalStatsTool.instructions },
      inputSchema: z.object({
        pipeline_tag: z.string().optional(),
        since_iso: z.string().optional(),
        until_iso: z.string().optional(),
      }),
      outputSchema: z.object({
        total_runs: z.number(),
        avg_top1_score: z.number(),
        p50_score: z.number(),
        p90_score: z.number(),
        top_sources: z.array(z.object({ source: z.string(), count: z.number() })),
        runs_per_day: z.array(z.object({ date: z.string(), count: z.number() })),
      }),
    },
    async (input) => asStructuredContent(await retrievalStats(input)),
  );

  return server;
}

async function main(): Promise<void> {
  await getDb();
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(message);
  process.exit(1);
});

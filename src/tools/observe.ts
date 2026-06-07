import { createHash } from "node:crypto";
import { insertObservedRun } from "../db/index.js";

export interface ObserveInput {
  run_id: string;
  query: string;
  chunks: Array<{
    content: string;
    score: number;
    source: string;
    rank: number;
  }>;
  pipeline_tag?: string | undefined;
}

export interface ObserveOutput {
  stored: boolean;
  run_id: string;
  chunk_count: number;
}

function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function retrievalObserve(input: ObserveInput): Promise<ObserveOutput> {
  const createdAt = new Date().toISOString();
  const chunks = input.chunks.map((chunk) => ({
    ...chunk,
    content_hash: contentHash(chunk.content),
  }));

  const stored = await insertObservedRun({
    run_id: input.run_id,
    query: input.query,
    pipeline_tag: input.pipeline_tag ?? null,
    created_at: createdAt,
    chunks,
  });

  if (!stored) {
    return { stored: false, run_id: input.run_id, chunk_count: 0 };
  }

  return { stored: true, run_id: input.run_id, chunk_count: input.chunks.length };
}

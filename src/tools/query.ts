import { findRetrievedRuns } from "../db/index.js";

export interface QueryInput {
  run_id?: string | undefined;
  pipeline_tag?: string | undefined;
  limit?: number | undefined;
  since_iso?: string | undefined;
}

export interface RetrievedChunk {
  content: string;
  score: number;
  source: string;
  rank: number;
}

export interface RunRecord {
  run_id: string;
  query: string;
  pipeline_tag: string | null;
  timestamp: string;
  chunks: RetrievedChunk[];
}

export interface QueryOutput {
  runs: RunRecord[];
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(limit), 0), MAX_LIMIT);
}

export async function retrievalQuery(input: QueryInput = {}): Promise<QueryOutput> {
  const runs = await findRetrievedRuns({
    run_id: input.run_id,
    pipeline_tag: input.pipeline_tag,
    since_iso: input.since_iso,
    limit: normalizeLimit(input.limit),
  });

  return {
    runs: runs.map((run) => ({
      run_id: run.run_id,
      query: run.query,
      pipeline_tag: run.pipeline_tag,
      timestamp: run.created_at,
      chunks: run.chunks,
    })),
  };
}

export interface QueryInput {
  run_id?: string;
  pipeline_tag?: string;
  limit?: number;
  since_iso?: string;
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

export function retrievalQuery(): QueryOutput {
  return { runs: [] };
}

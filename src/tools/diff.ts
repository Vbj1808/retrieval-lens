export type MatchBy = "source" | "content_hash";

export interface DiffInput {
  run_id_a: string;
  run_id_b: string;
  match_by: MatchBy;
}

export interface DiffChunk {
  content: string;
  score: number;
  source: string;
  rank: number;
}

export interface SharedChunk {
  chunk: DiffChunk;
  score_a: number;
  score_b: number;
  score_delta: number;
}

export interface DiffOutput {
  only_in_a: DiffChunk[];
  only_in_b: DiffChunk[];
  shared: SharedChunk[];
  summary: string;
}

export function retrievalDiff(): DiffOutput {
  return { only_in_a: [], only_in_b: [], shared: [], summary: "0 chunks only in A, 0 only in B, 0 shared" };
}

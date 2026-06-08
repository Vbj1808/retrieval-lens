import { findDiffChunks, runExists, type DiffChunkRecord } from "../db/index.js";

export const retrievalDiffTool = {
  description: "Compare two retrieval runs side by side to find missing chunks, shared chunks, and score movement between runs.",
  instructions:
    'Use this tool to compare two retrieval runs side by side. Provide run_id_a and run_id_b, and set match_by to either "source" or "content_hash". Returns chunks only in A, only in B, shared chunks, and a score_delta summary showing retrieval regression or improvement.',
} as const;

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

interface IndexedChunk {
  chunk: DiffChunkRecord;
  index: number;
}

function publicChunk(chunk: DiffChunkRecord): DiffChunk {
  return {
    content: chunk.content,
    score: chunk.score,
    source: chunk.source,
    rank: chunk.rank,
  };
}

function matchKey(chunk: DiffChunkRecord, matchBy: MatchBy): string {
  return matchBy === "source" ? chunk.source : chunk.content_hash;
}

function indexChunks(chunks: DiffChunkRecord[], matchBy: MatchBy): Map<string, IndexedChunk[]> {
  const indexed = new Map<string, IndexedChunk[]>();

  chunks.forEach((chunk, index) => {
    const key = matchKey(chunk, matchBy);
    const existing = indexed.get(key);
    const value = { chunk, index };

    if (existing === undefined) {
      indexed.set(key, [value]);
    } else {
      existing.push(value);
    }
  });

  return indexed;
}

function buildSummary(onlyInA: DiffChunk[], onlyInB: DiffChunk[], shared: SharedChunk[]): string {
  const averageDelta =
    shared.length === 0 ? 0 : shared.reduce((total, current) => total + current.score_delta, 0) / shared.length;

  return `${onlyInA.length} chunks only in A, ${onlyInB.length} only in B, ${shared.length} shared (avg delta ${averageDelta.toFixed(2)})`;
}

export async function retrievalDiff(input: DiffInput): Promise<DiffOutput> {
  const [runAExists, runBExists] = await Promise.all([runExists(input.run_id_a), runExists(input.run_id_b)]);

  if (!runAExists) {
    throw new Error(`run_id ${input.run_id_a} not found`);
  }

  if (!runBExists) {
    throw new Error(`run_id ${input.run_id_b} not found`);
  }

  const [chunksA, chunksB] = await Promise.all([findDiffChunks(input.run_id_a), findDiffChunks(input.run_id_b)]);
  const indexedB = indexChunks(chunksB, input.match_by);
  const matchedBIndexes = new Set<number>();
  const onlyInA: DiffChunk[] = [];
  const shared: SharedChunk[] = [];

  for (const chunkA of chunksA) {
    const candidates = indexedB.get(matchKey(chunkA, input.match_by));
    const match = candidates?.find((candidate) => !matchedBIndexes.has(candidate.index));

    if (match === undefined) {
      onlyInA.push(publicChunk(chunkA));
    } else {
      matchedBIndexes.add(match.index);
      shared.push({
        chunk: publicChunk(chunkA),
        score_a: chunkA.score,
        score_b: match.chunk.score,
        score_delta: match.chunk.score - chunkA.score,
      });
    }
  }

  const onlyInB = chunksB
    .filter((_chunk, index) => !matchedBIndexes.has(index))
    .map((chunk) => publicChunk(chunk));

  return {
    only_in_a: onlyInA,
    only_in_b: onlyInB,
    shared,
    summary: buildSummary(onlyInA, onlyInB, shared),
  };
}

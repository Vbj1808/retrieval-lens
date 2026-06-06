# TOOL_CONTRACTS.md — retrieval-lens

Exact TypeScript types for every MCP tool. Codex must implement to these contracts exactly — no extra fields, no renamed fields.

---

## `retrieval_observe`

```typescript
interface ObserveInput {
  run_id: string;          // caller-assigned, must be unique
  query: string;           // exact query sent to retriever
  chunks: Array<{
    content: string;       // raw chunk text
    score: number;         // similarity/relevance score (0.0–1.0 typical)
    source: string;        // doc ID, filename, URL, or any string identifier
    rank: number;          // 1-based position in retrieval results
  }>;
  pipeline_tag?: string;   // optional label for filtering later
}

interface ObserveOutput {
  stored: boolean;
  run_id: string;
  chunk_count: number;
}
```

**Error cases:**
- `run_id` already exists → return `{ stored: false, run_id, chunk_count: 0 }` with an MCP error code, do NOT overwrite.
- `chunks` is empty array → still store the run (valid empty retrieval), `chunk_count: 0`.

---

## `retrieval_query`

```typescript
interface QueryInput {
  run_id?: string;         // if provided, return exactly that run
  pipeline_tag?: string;   // filter by tag
  limit?: number;          // default 10, max 100
  since_iso?: string;      // ISO 8601 lower bound on created_at
}

interface RetrievedChunk {
  content: string;
  score: number;
  source: string;
  rank: number;
}

interface RunRecord {
  run_id: string;
  query: string;
  pipeline_tag: string | null;
  timestamp: string;       // ISO 8601
  chunks: RetrievedChunk[];
}

interface QueryOutput {
  runs: RunRecord[];
}
```

**Error cases:**
- No runs match → `{ runs: [] }` — never throw, never return null.
- `limit` > 100 → clamp to 100 silently.

---

## `retrieval_diff`

```typescript
type MatchBy = 'source' | 'content_hash';

interface DiffInput {
  run_id_a: string;
  run_id_b: string;
  match_by: MatchBy;
}

interface DiffChunk {
  content: string;
  score: number;
  source: string;
  rank: number;
}

interface SharedChunk {
  chunk: DiffChunk;        // chunk as it appeared in run_a
  score_a: number;
  score_b: number;
  score_delta: number;     // score_b - score_a
}

interface DiffOutput {
  only_in_a: DiffChunk[];
  only_in_b: DiffChunk[];
  shared: SharedChunk[];
  summary: string;         // e.g. "3 chunks only in A, 1 only in B, 5 shared (avg delta -0.03)"
}
```

**Error cases:**
- Either `run_id` does not exist → MCP error with message "run_id X not found".
- Identical runs → `only_in_a: [], only_in_b: [], shared: [all chunks with delta 0]`.

---

## `retrieval_stats`

```typescript
interface StatsInput {
  pipeline_tag?: string;
  since_iso?: string;
  until_iso?: string;
}

interface StatsOutput {
  total_runs: number;
  avg_top1_score: number;  // average of rank=1 scores across all runs
  p50_score: number;       // median of ALL chunk scores
  p90_score: number;       // 90th percentile of ALL chunk scores
  top_sources: Array<{
    source: string;
    count: number;          // how many times this source appeared across runs
  }>;
  runs_per_day: Array<{
    date: string;           // "YYYY-MM-DD"
    count: number;
  }>;
}
```

**Error cases:**
- Empty DB or no matching runs → return zeroed struct: `{ total_runs: 0, avg_top1_score: 0, p50_score: 0, p90_score: 0, top_sources: [], runs_per_day: [] }`. Never throw.
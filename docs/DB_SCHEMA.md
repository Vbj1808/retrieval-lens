# DB_SCHEMA.md — retrieval-lens

## Tables

### `runs`

Stores one row per `retrieval_observe` call.

```sql
CREATE TABLE IF NOT EXISTS runs (
  run_id       TEXT PRIMARY KEY,
  query        TEXT NOT NULL,
  pipeline_tag TEXT,
  created_at   TEXT NOT NULL  -- ISO 8601 UTC: e.g. "2026-06-06T14:23:00.000Z"
);
```

### `chunks`

Stores one row per chunk within a retrieval run.

```sql
CREATE TABLE IF NOT EXISTS chunks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id       TEXT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  content_hash TEXT NOT NULL,  -- SHA-256 hex of content, used by retrieval_diff
  score        REAL NOT NULL,
  source       TEXT NOT NULL,
  rank         INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chunks_run_id ON chunks(run_id);
CREATE INDEX IF NOT EXISTS idx_runs_pipeline ON runs(pipeline_tag);
CREATE INDEX IF NOT EXISTS idx_runs_created  ON runs(created_at);
```

## Notes

- `content_hash` is SHA-256 of `content` (hex string). Computed in `src/tools/observe.ts` before insert. Never stored by the caller.
- `created_at` is always UTC ISO 8601. Use `new Date().toISOString()` in TypeScript.
- Cascade delete: deleting a run deletes its chunks. No orphaned chunks.
- No soft deletes in v0.1.
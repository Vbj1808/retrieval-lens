CREATE TABLE IF NOT EXISTS runs (
  run_id       TEXT PRIMARY KEY,
  query        TEXT NOT NULL,
  pipeline_tag TEXT,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chunks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id       TEXT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  score        REAL NOT NULL,
  source       TEXT NOT NULL,
  rank         INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chunks_run_id ON chunks(run_id);
CREATE INDEX IF NOT EXISTS idx_runs_pipeline ON runs(pipeline_tag);
CREATE INDEX IF NOT EXISTS idx_runs_created  ON runs(created_at);

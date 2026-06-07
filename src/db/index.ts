import { createClient, type Client } from "@libsql/client";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, tmpdir } from "node:os";

let db: Client | undefined;
let initializing: Promise<Client> | undefined;

export interface ObservedChunkRecord {
  content: string;
  content_hash: string;
  score: number;
  source: string;
  rank: number;
}

export interface ObservedRunRecord {
  run_id: string;
  query: string;
  pipeline_tag: string | null;
  created_at: string;
  chunks: ObservedChunkRecord[];
}

export interface QueryRunFilter {
  run_id?: string | undefined;
  pipeline_tag?: string | undefined;
  since_iso?: string | undefined;
  limit: number;
}

export interface RetrievedChunkRecord {
  content: string;
  score: number;
  source: string;
  rank: number;
}

export interface RetrievedRunRecord {
  run_id: string;
  query: string;
  pipeline_tag: string | null;
  created_at: string;
  chunks: RetrievedChunkRecord[];
}

export interface DiffChunkRecord {
  content: string;
  content_hash: string;
  score: number;
  source: string;
  rank: number;
}

function defaultDbUrl(): string {
  return `file:${join(homedir(), ".retrieval-lens", "audit.db")}`;
}

function configuredDbUrl(): string {
  const configured = process.env.RETRIEVAL_LENS_DB;

  if (configured === undefined || configured.length === 0) {
    return defaultDbUrl();
  }

  if (configured === ":memory:") {
    return `file:${join(tmpdir(), `retrieval-lens-${process.pid}.db`)}`;
  }

  if (configured.includes(":")) {
    return configured;
  }

  return `file:${configured}`;
}

async function readSchema(): Promise<string> {
  const currentFile = fileURLToPath(import.meta.url);
  const localSchemaPath = join(dirname(currentFile), "schema.sql");

  try {
    return await readFile(localSchemaPath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return readFile(join(process.cwd(), "src", "db", "schema.sql"), "utf8");
    }

    throw error;
  }
}

async function initializeDb(): Promise<Client> {
  const url = configuredDbUrl();

  if (url.startsWith("file:") && url !== "file::memory:") {
    await mkdir(dirname(url.slice("file:".length)), { recursive: true });
  }

  const client = createClient({ url });
  const schema = await readSchema();
  await client.migrate(
    schema
      .split(";")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0),
  );

  return client;
}

export async function getDb(): Promise<Client> {
  if (db !== undefined) {
    return db;
  }

  initializing ??= initializeDb();
  db = await initializing;
  return db;
}

export async function insertObservedRun(run: ObservedRunRecord): Promise<boolean> {
  const client = await getDb();
  const transaction = await client.transaction("write");
  let committed = false;

  try {
    const insertRun = await transaction.execute({
      sql: "INSERT OR IGNORE INTO runs (run_id, query, pipeline_tag, created_at) VALUES (?, ?, ?, ?)",
      args: [run.run_id, run.query, run.pipeline_tag, run.created_at],
    });

    if (insertRun.rowsAffected === 0) {
      await transaction.commit();
      committed = true;
      return false;
    }

    for (const chunk of run.chunks) {
      await transaction.execute({
        sql: "INSERT INTO chunks (run_id, content, content_hash, score, source, rank) VALUES (?, ?, ?, ?, ?, ?)",
        args: [run.run_id, chunk.content, chunk.content_hash, chunk.score, chunk.source, chunk.rank],
      });
    }

    await transaction.commit();
    committed = true;
    return true;
  } finally {
    if (!committed) {
      transaction.close();
    }
  }
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value : String(value);
}

function nullableTextValue(value: unknown): string | null {
  if (value === null) {
    return null;
  }

  return textValue(value);
}

function numericValue(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

export async function findRetrievedRuns(filter: QueryRunFilter): Promise<RetrievedRunRecord[]> {
  const client = await getDb();
  const conditions: string[] = [];
  const args: Array<string | number> = [];
  const limit = filter.run_id === undefined ? filter.limit : 1;

  if (filter.run_id !== undefined) {
    conditions.push("run_id = ?");
    args.push(filter.run_id);
  } else {
    if (filter.pipeline_tag !== undefined) {
      conditions.push("pipeline_tag = ?");
      args.push(filter.pipeline_tag);
    }

    if (filter.since_iso !== undefined) {
      conditions.push("created_at >= ?");
      args.push(filter.since_iso);
    }
  }

  const whereClause = conditions.length === 0 ? "" : `WHERE ${conditions.join(" AND ")}`;
  const runResult = await client.execute({
    sql: `SELECT run_id, query, pipeline_tag, created_at FROM runs ${whereClause} ORDER BY created_at DESC LIMIT ?`,
    args: [...args, limit],
  });

  const runs = runResult.rows.map((row) => ({
    run_id: textValue(row.run_id),
    query: textValue(row.query),
    pipeline_tag: nullableTextValue(row.pipeline_tag),
    created_at: textValue(row.created_at),
    chunks: [] as RetrievedChunkRecord[],
  }));

  if (runs.length === 0) {
    return [];
  }

  const chunksByRun = new Map(runs.map((run) => [run.run_id, run.chunks]));
  const placeholders = runs.map(() => "?").join(", ");
  const chunkResult = await client.execute({
    sql: `SELECT run_id, content, score, source, rank FROM chunks WHERE run_id IN (${placeholders}) ORDER BY run_id, rank ASC`,
    args: runs.map((run) => run.run_id),
  });

  for (const row of chunkResult.rows) {
    const runChunks = chunksByRun.get(textValue(row.run_id));

    if (runChunks !== undefined) {
      runChunks.push({
        content: textValue(row.content),
        score: numericValue(row.score),
        source: textValue(row.source),
        rank: numericValue(row.rank),
      });
    }
  }

  return runs;
}

export async function runExists(runId: string): Promise<boolean> {
  const client = await getDb();
  const result = await client.execute({
    sql: "SELECT 1 FROM runs WHERE run_id = ? LIMIT 1",
    args: [runId],
  });

  return result.rows.length > 0;
}

export async function findDiffChunks(runId: string): Promise<DiffChunkRecord[]> {
  const client = await getDb();
  const result = await client.execute({
    sql: "SELECT content, content_hash, score, source, rank FROM chunks WHERE run_id = ? ORDER BY rank ASC",
    args: [runId],
  });

  return result.rows.map((row) => ({
    content: textValue(row.content),
    content_hash: textValue(row.content_hash),
    score: numericValue(row.score),
    source: textValue(row.source),
    rank: numericValue(row.rank),
  }));
}

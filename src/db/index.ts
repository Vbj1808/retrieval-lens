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

import { createClient, type Client } from "@libsql/client";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

let db: Client | undefined;
let initializing: Promise<Client> | undefined;

function defaultDbUrl(): string {
  return `file:${join(homedir(), ".retrieval-lens", "audit.db")}`;
}

function configuredDbUrl(): string {
  const configured = process.env.RETRIEVAL_LENS_DB;

  if (configured === undefined || configured.length === 0) {
    return defaultDbUrl();
  }

  if (configured === ":memory:") {
    return "file::memory:";
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

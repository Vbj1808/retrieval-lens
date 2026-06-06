import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../src/db/index.js";
import { retrievalObserve } from "../src/tools/observe.js";

const temporaryDirectories: string[] = [];

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

describe("retrievalObserve", () => {
  afterEach(async () => {
    for (const directory of temporaryDirectories.splice(0)) {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("returns the scaffold response without throwing", () => {
    expect(retrievalObserve()).toEqual({ stored: false, run_id: "", chunk_count: 0 });
  });

  it("initializes the scaffold database schema", async () => {
    const db = await getDb();
    await expect(getDb()).resolves.toBe(db);
    const result = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    const tableNames = result.rows.map((row) => row.name);

    expect(tableNames).toContain("runs");
    expect(tableNames).toContain("chunks");
  });

  it("initializes a configured file database", async () => {
    const originalDb = process.env.RETRIEVAL_LENS_DB;
    const directory = await mkdtemp(join(tmpdir(), "retrieval-lens-"));
    temporaryDirectories.push(directory);
    process.env.RETRIEVAL_LENS_DB = join(directory, "audit.db");
    vi.resetModules();

    const module = await import("../src/db/index.js");
    const db = await module.getDb();
    const result = await db.execute("SELECT name FROM sqlite_master WHERE name = 'runs'");

    expect(result.rows).toHaveLength(1);
    restoreEnv("RETRIEVAL_LENS_DB", originalDb);
    db.close();
  });

  it("accepts file URLs from configuration", async () => {
    const originalDb = process.env.RETRIEVAL_LENS_DB;
    process.env.RETRIEVAL_LENS_DB = "file::memory:";
    vi.resetModules();

    const module = await import("../src/db/index.js");
    const db = await module.getDb();

    await expect(db.execute("SELECT 1 AS ready")).resolves.toBeDefined();
    restoreEnv("RETRIEVAL_LENS_DB", originalDb);
    db.close();
  });
});

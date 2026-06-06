import { afterEach, describe, expect, it, vi } from "vitest";
import { retrievalStats } from "../src/tools/stats.js";
import { logger, type LogLevel } from "../src/utils/logger.js";

describe("retrievalStats", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the scaffold response without throwing", () => {
    expect(retrievalStats()).toEqual({
      total_runs: 0,
      avg_top1_score: 0,
      p50_score: 0,
      p90_score: 0,
      top_sources: [],
      runs_per_day: [],
    });
  });

  it("writes logger messages to stderr", () => {
    const originalLevel = process.env.RETRIEVAL_LENS_LOG;
    process.env.RETRIEVAL_LENS_LOG = "debug";
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];

    for (const level of levels) {
      logger[level](`${level} message`);
    }

    expect(write).toHaveBeenCalledTimes(4);

    process.env.RETRIEVAL_LENS_LOG = "not-a-level";
    logger.debug("hidden message");
    expect(write).toHaveBeenCalledTimes(4);

    if (originalLevel === undefined) {
      delete process.env.RETRIEVAL_LENS_LOG;
      return;
    }

    process.env.RETRIEVAL_LENS_LOG = originalLevel;
  });
});

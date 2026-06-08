import { findStatsRuns } from "../db/index.js";

export const retrievalStatsTool = {
  description: "Aggregate retrieval quality and volume metrics across stored runs, including score distributions, top sources, and daily trends.",
  instructions:
    "Use this tool to get aggregate statistics across multiple retrieval runs. Filter by pipeline_tag, since_iso, and until_iso. Returns total_runs, avg_top1_score, p50_score, p90_score, top_sources by frequency, and runs_per_day trend data.",
} as const;

export interface StatsInput {
  pipeline_tag?: string | undefined;
  since_iso?: string | undefined;
  until_iso?: string | undefined;
}

export interface StatsOutput {
  total_runs: number;
  avg_top1_score: number;
  p50_score: number;
  p90_score: number;
  top_sources: Array<{
    source: string;
    count: number;
  }>;
  runs_per_day: Array<{
    date: string;
    count: number;
  }>;
}

const EMPTY_STATS: StatsOutput = {
  total_runs: 0,
  avg_top1_score: 0,
  p50_score: 0,
  p90_score: 0,
  top_sources: [],
  runs_per_day: [],
};

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(sortedValues: number[]): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  const midpoint = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[midpoint] ?? 0;
  }

  const lower = sortedValues[midpoint - 1] ?? 0;
  const upper = sortedValues[midpoint] ?? 0;
  return (lower + upper) / 2;
}

function nearestRankPercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  const rawIndex = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  const index = Math.max(0, Math.min(sortedValues.length - 1, rawIndex));
  return sortedValues[index] ?? 0;
}

export async function retrievalStats(input: StatsInput = {}): Promise<StatsOutput> {
  const runs = await findStatsRuns(input);

  if (runs.length === 0) {
    return { ...EMPTY_STATS, top_sources: [], runs_per_day: [] };
  }

  const top1Scores: number[] = [];
  const allScores: number[] = [];
  const sourceCounts = new Map<string, number>();
  const runsPerDay = new Map<string, number>();

  for (const run of runs) {
    const day = run.created_at.slice(0, 10);
    runsPerDay.set(day, (runsPerDay.get(day) ?? 0) + 1);

    for (const chunk of run.chunks) {
      allScores.push(chunk.score);
      sourceCounts.set(chunk.source, (sourceCounts.get(chunk.source) ?? 0) + 1);

      if (chunk.rank === 1) {
        top1Scores.push(chunk.score);
      }
    }
  }

  const sortedScores = [...allScores].sort((left, right) => left - right);
  const topSources = [...sourceCounts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((left, right) => right.count - left.count || left.source.localeCompare(right.source))
    .slice(0, 10);
  const runsPerDayRows = [...runsPerDay.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((left, right) => left.date.localeCompare(right.date));

  return {
    total_runs: runs.length,
    avg_top1_score: average(top1Scores),
    p50_score: median(sortedScores),
    p90_score: nearestRankPercentile(sortedScores, 90),
    top_sources: topSources,
    runs_per_day: runsPerDayRows,
  };
}

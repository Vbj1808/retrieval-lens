export interface StatsInput {
  pipeline_tag?: string;
  since_iso?: string;
  until_iso?: string;
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

export function retrievalStats(): StatsOutput {
  return {
    total_runs: 0,
    avg_top1_score: 0,
    p50_score: 0,
    p90_score: 0,
    top_sources: [],
    runs_per_day: [],
  };
}

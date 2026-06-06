export interface ObserveInput {
  run_id: string;
  query: string;
  chunks: Array<{
    content: string;
    score: number;
    source: string;
    rank: number;
  }>;
  pipeline_tag?: string;
}

export interface ObserveOutput {
  stored: boolean;
  run_id: string;
  chunk_count: number;
}

export function retrievalObserve(): ObserveOutput {
  return { stored: false, run_id: "", chunk_count: 0 };
}

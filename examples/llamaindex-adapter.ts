import { BaseNodePostprocessor } from "llamaindex";

type RetrievalLensChunk = {
  content: string;
  score: number;
  source: string;
  rank: number;
};

type RetrievalObserveInput = {
  run_id: string;
  query: string;
  chunks: RetrievalLensChunk[];
  pipeline_tag?: string;
};

type RetrievalLensMcpClient = {
  call(toolName: "retrieval_observe", input: RetrievalObserveInput): Promise<unknown>;
};

type RetrievalNodeMetadata = Record<string, unknown> & {
  source?: unknown;
};

type RetrievalNode = {
  text: string;
  score?: number;
  metadata: RetrievalNodeMetadata;
};

const sourceFromMetadata = (metadata: RetrievalNodeMetadata): string =>
  typeof metadata.source === "string" ? metadata.source : "unknown";

/**
 * Add retrieval-lens auditing after a LlamaIndex retrieval step without changing results.
 *
 * Usage:
 *   const postprocessor = new RetrievalLensPostprocessor(mcp, "support-bot");
 *   queryEngine.nodePostprocessors = [postprocessor];
 *
 * The postprocessor records the nodes passed to it and returns them unchanged.
 */
export class RetrievalLensPostprocessor extends BaseNodePostprocessor {
  constructor(
    private readonly mcp: RetrievalLensMcpClient,
    private readonly pipeline_tag?: string,
  ) {
    super();
  }

  override async postprocessNodes(nodes: RetrievalNode[], query = ""): Promise<RetrievalNode[]> {
    const run_id = crypto.randomUUID();

    await this.mcp.call("retrieval_observe", {
      run_id,
      query,
      chunks: nodes.map((node, index) => ({
        content: node.text,
        score: node.score ?? 0,
        source: sourceFromMetadata(node.metadata),
        rank: index + 1,
      })),
      ...(this.pipeline_tag === undefined ? {} : { pipeline_tag: this.pipeline_tag }),
    });

    return nodes;
  }
}

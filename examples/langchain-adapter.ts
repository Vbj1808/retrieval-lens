import { BaseRetriever } from "langchain/schema/retriever";

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

type RetrievalMetadata = Record<string, unknown> & {
  score?: unknown;
  source?: unknown;
};

type RetrievalDocument = {
  pageContent: string;
  metadata: RetrievalMetadata;
};

const scoreFromMetadata = (metadata: RetrievalMetadata): number =>
  typeof metadata.score === "number" ? metadata.score : 0;

const sourceFromMetadata = (metadata: RetrievalMetadata): string =>
  typeof metadata.source === "string" ? metadata.source : "unknown";

/**
 * Wrap any LangChain BaseRetriever to mirror each retrieval into retrieval-lens.
 *
 * Usage:
 *   const retriever = new RetrievalLensRetriever(vectorStore.asRetriever(), mcp, "support-bot");
 *   const docs = await retriever.getRelevantDocuments("what is the refund policy?");
 *
 * The wrapped retriever still returns the original LangChain documents unchanged.
 */
export class RetrievalLensRetriever extends BaseRetriever {
  constructor(
    private readonly inner: BaseRetriever,
    private readonly mcp: RetrievalLensMcpClient,
    private readonly pipeline_tag?: string,
  ) {
    super();
  }

  override async _getRelevantDocuments(query: string): Promise<RetrievalDocument[]> {
    const documents = (await this.inner.getRelevantDocuments(query)) as RetrievalDocument[];
    const run_id = crypto.randomUUID();

    await this.mcp.call("retrieval_observe", {
      run_id,
      query,
      chunks: documents.map((document, index) => ({
        content: document.pageContent,
        score: scoreFromMetadata(document.metadata),
        source: sourceFromMetadata(document.metadata),
        rank: index + 1,
      })),
      ...(this.pipeline_tag === undefined ? {} : { pipeline_tag: this.pipeline_tag }),
    });

    return documents;
  }
}

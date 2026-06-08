declare module "langchain/schema/retriever" {
  export abstract class BaseRetriever {
    getRelevantDocuments(query: string): Promise<unknown[]>;
    abstract _getRelevantDocuments(query: string): Promise<unknown[]>;
  }
}

declare module "llamaindex" {
  export abstract class BaseNodePostprocessor {
    abstract postprocessNodes(nodes: unknown[], query?: string): Promise<unknown[]>;
  }
}

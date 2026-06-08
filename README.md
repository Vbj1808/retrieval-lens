# retrieval-lens

> A black-box flight recorder for RAG retrieval inside MCP agents.

**retrieval-lens** is an MCP server that logs every retrieval step your RAG agent makes — what chunks were retrieved, their scores, sources, and rankings — so you can audit, replay, and diff retrieval runs after the fact.

---

## The Problem

When a RAG agent gives a wrong answer, you need to know: did retrieval fail, or did generation fail? Right now there's no easy way to answer that. Your observability tool shows you the LLM call. It doesn't show you which chunks the model saw before it answered, what scores they had, or how retrieval changed between yesterday and today.

retrieval-lens fixes that. Every retrieval run is logged. Nothing is hidden.

---

## Demo

When your RAG agent gives a wrong answer, ask retrieval-lens what it saw:

```typescript
await mcp.call("retrieval_diff", {
  run_id_a: "support-bot-before-embedding-refresh",
  run_id_b: "support-bot-after-embedding-refresh",
  match_by: "source"
});
```

See docs/demo-diff.png for real output from Claude Code.

---

## MCP Tools

| Tool | What it does |
|---|---|
| `retrieval_observe` | Log a retrieval run — query, chunks, scores, sources, rankings |
| `retrieval_query` | Replay what the model saw before a specific answer |
| `retrieval_diff` | Compare two retrieval runs — what changed, what score drifted |
| `retrieval_stats` | Aggregate score distributions, top sources, runs over time |

---

## Quickstart

Run retrieval-lens directly with npx:

```bash
npx retrieval-lens
```

Add retrieval-lens to Claude Code with one command:

```bash
claude mcp add retrieval-lens npx retrieval-lens
```

Then call `retrieval_observe` after every retrieval step in your RAG pipeline:

```typescript
await mcp.call("retrieval_observe", {
  run_id: crypto.randomUUID(),
  query: "what is the refund policy?",
  chunks: [
    { content: "Refunds are processed within 5 days...", score: 0.91, source: "policy.md", rank: 1 },
    { content: "Contact support for refund requests...", score: 0.74, source: "faq.md", rank: 2 }
  ],
  pipeline_tag: "support-bot"
});
```

---

## Adapters

### LangChain

See examples/langchain-adapter.ts

### LlamaIndex

See examples/llamaindex-adapter.ts

---

## Why not LangSmith / Langfuse?

Those are full observability platforms. retrieval-lens is surgical:

- **Local-first** — SQLite, zero signup, no data leaves your machine
- **MCP-native** — one config line, works in any MCP client
- **Retrieval-only** — focused on the layer where most RAG failures actually happen

---

## Status

🚧 Active development. Harness-first build using [harness engineering](https://walkinglabs.github.io/learn-harness-engineering/en/) principles.

- [x] F05 — scaffold
- [x] F01 — retrieval_observe
- [x] F02 — retrieval_query
- [x] F03 — retrieval_diff
- [x] F04 — retrieval_stats

---

## License

MIT

---

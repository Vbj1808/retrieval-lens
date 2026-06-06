# retrieval-lens

> A black-box flight recorder for RAG retrieval inside MCP agents.

**retrieval-lens** is an MCP server that logs every retrieval step your RAG agent makes — what chunks were retrieved, their scores, sources, and rankings — so you can audit, replay, and diff retrieval runs after the fact.

```bash
npx retrieval-lens
```

---

## The Problem

When a RAG agent gives a wrong answer, you need to know: did retrieval fail, or did generation fail? Right now there's no easy way to answer that. Your observability tool shows you the LLM call. It doesn't show you which chunks the model saw before it answered, what scores they had, or how retrieval changed between yesterday and today.

retrieval-lens fixes that. Every retrieval run is logged. Nothing is hidden.

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

Add to your MCP client config (Claude Desktop, Cursor, Windsurf):

```json
{
  "mcpServers": {
    "retrieval-lens": {
      "command": "npx",
      "args": ["retrieval-lens"]
    }
  }
}
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

## Why not LangSmith / Langfuse?

Those are full observability platforms. retrieval-lens is surgical:

- **Local-first** — SQLite, zero signup, no data leaves your machine
- **MCP-native** — one config line, works in any MCP client
- **Retrieval-only** — focused on the layer where most RAG failures actually happen

---

## Status

🚧 Active development. Harness-first build using [harness engineering](https://walkinglabs.github.io/learn-harness-engineering/en/) principles.

- [x] F05 — scaffold
- [ ] F01 — `retrieval_observe`
- [ ] F02 — `retrieval_query`
- [ ] F03 — `retrieval_diff`
- [ ] F04 — `retrieval_stats`

---

## License

MIT

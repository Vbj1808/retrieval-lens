# DECISIONS.md — retrieval-lens

Record every non-obvious design decision here with the reason. Codex reads this to avoid re-litigating resolved questions.

---

## D01 — Storage: @libsql/client instead of better-sqlite3

Reason: better-sqlite3 is a native addon that fails to compile on Node 25 arm64
(requires C++20, no prebuilt binary available). Switched to @libsql/client —
pure JS, zero compilation, supports :memory: for tests, TypeScript-native.
Tradeoff: async API instead of sync. Acceptable for MCP server use case.

---

## D02 — Transport: stdio only (v0.1)

**Decision:** Ship v0.1 as stdio MCP only.  
**Reason:** stdio is the universal default for Claude Desktop, Claude Code, Cursor, Windsurf. HTTP/SSE transport can be added in v0.2. Shipping stdio first means `npx retrieval-lens` works day one with zero config.

---

## D03 — TypeScript strict mode on

**Decision:** `strict: true` in tsconfig, `noImplicitAny: true`, `strictNullChecks: true`.  
**Reason:** MCP tool schemas are typed contracts. A type error here is a broken tool schema in production. Strict mode catches this at compile time.  

---

## D04 — Test runner: vitest

**Decision:** Use `vitest` not `jest`.  
**Reason:** Native ESM support, no transform config needed for TypeScript, faster cold start. The MCP SDK uses ESM. Jest with ESM in 2025 is a pain.

---

## D05 — No external embedding/vector dependencies

**Decision:** retrieval-lens does NOT embed, chunk, or retrieve. It only observes and stores what the caller reports.  
**Reason:** We are an audit layer, not a retrieval layer. Adding embedding deps would double install size and confuse the value prop. The caller (LangChain, LlamaIndex, custom RAG) does the retrieval; we watch it.

---

## D06 — run_id is caller-assigned

**Decision:** The caller provides `run_id`, we don't generate it.  
**Reason:** The caller knows the trace/span ID from their own system. Forcing our own ID would make correlation harder. Callers who don't have one can use `crypto.randomUUID()`.

---


## D07 — Test `:memory:` database uses a process-local temp file

**Decision:** Treat `RETRIEVAL_LENS_DB=:memory:` as a process-local temporary file path when initializing the libSQL client.
**Reason:** The libSQL file client may open separate logical connections for migrations, transactions, and reads; `file::memory:` does not reliably share schema state across those connections. A temp file preserves fast isolated test storage while keeping transaction-backed writes observable by later reads in the same process.

## Open Questions

- Should `retrieval_query` support pagination beyond `limit`? (cursor-based?) → defer to v0.2
- Should we support exporting runs to JSON/CSV? → defer to v0.2
- `npm run inspect` is currently blocked by npm registry policy (`E403` fetching `@modelcontextprotocol/inspector`). Re-run after registry access is available.

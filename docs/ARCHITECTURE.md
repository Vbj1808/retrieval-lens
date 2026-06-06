# ARCHITECTURE.md — retrieval-lens

## Directory Structure

```
retrieval-lens/
├── AGENTS.md               ← Codex reads this first, every session
├── PROGRESS.md             ← current verified state + next task
├── DECISIONS.md            ← design decisions with reasons
├── feature_list.json       ← source of truth for feature status
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.json
│
├── src/
│   ├── index.ts            ← MCP server entry point; registers all tools
│   ├── db/
│   │   ├── index.ts        ← exports getDb(), runs migrations on startup
│   │   └── schema.sql      ← DDL for runs and chunks tables
│   ├── tools/
│   │   ├── observe.ts      ← retrieval_observe implementation
│   │   ├── query.ts        ← retrieval_query implementation
│   │   ├── diff.ts         ← retrieval_diff implementation
│   │   └── stats.ts        ← retrieval_stats implementation
│   └── utils/
│       └── logger.ts       ← stderr logger (never stdout — MCP uses stdout)
│
├── tests/
│   ├── observe.test.ts
│   ├── query.test.ts
│   ├── diff.test.ts
│   └── stats.test.ts
│
└── docs/
    ├── ARCHITECTURE.md     ← this file
    ├── DB_SCHEMA.md
    ├── TOOL_CONTRACTS.md
    └── CONSTRAINTS.md
```

## Module Responsibilities

### `src/index.ts`
- Creates the MCP `Server` instance
- Imports and registers all 4 tools from `src/tools/`
- Calls `getDb()` on startup to ensure DB is initialized
- Connects to stdio transport
- **Never** contains business logic — only wiring

### `src/db/index.ts`
- Single export: `getDb()` returns the `better-sqlite3` Database instance
- On first call: runs schema migration from `schema.sql`
- DB file location: `~/.retrieval-lens/audit.db` (respects `RETRIEVAL_LENS_DB` env var override)
- All other modules import `getDb()` — they never open their own DB connections

### `src/tools/*.ts`
- One file per MCP tool
- Each exports a single function: `(args: ToolInput) => ToolOutput`
- No direct `console.log` — use `logger`
- No direct DB access — use `getDb()`

### `src/utils/logger.ts`
- Writes to `process.stderr` only (MCP protocol uses stdout for JSON-RPC)
- Log levels: `debug`, `info`, `warn`, `error`
- Enabled via `RETRIEVAL_LENS_LOG=debug|info|warn|error` env var (default: `warn`)
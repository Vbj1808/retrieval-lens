# PROGRESS.md — retrieval-lens

## Current State

**Status:** 🔴 Not started — harness files created, no code yet.  
**Last verified:** harness files only (`AGENTS.md`, `feature_list.json`, `PROGRESS.md`, `DECISIONS.md`, `package.json` scaffold)  
**Last commit:** (none yet)

---

## Task Queue (ordered by priority)

| ID  | Task              | Status    | Blocked by |
|-----|-------------------|-----------|------------|
| F05 | scaffold          | 🔴 pending | —          |
| F01 | retrieval_observe | 🔴 pending | F05        |
| F02 | retrieval_query   | 🔴 pending | F01        |
| F03 | retrieval_diff    | 🔴 pending | F01        |
| F04 | retrieval_stats   | 🔴 pending | F01        |

---

## Session Log

### Session 0 — Harness Setup (human)
- Created: `AGENTS.md`, `feature_list.json`, `PROGRESS.md`, `DECISIONS.md`
- Created: `docs/ARCHITECTURE.md`, `docs/TOOL_CONTRACTS.md`, `docs/DB_SCHEMA.md`, `docs/CONSTRAINTS.md`
- Created: `package.json` (stub)
- **Next task for Codex:** F05 — scaffold. Run `npm install && npm run build && npm test` green on stubs.

---

## Verification Baseline

Once F05 is complete, paste actual output here:

```
npm install   → exit 0
npm run build → exit 0, 0 errors
npm test      → x/x passing
npm run lint  → exit 0, 0 errors
npm run inspect → lists 4 tools
```
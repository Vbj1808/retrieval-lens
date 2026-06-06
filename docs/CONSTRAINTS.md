# CONSTRAINTS.md — retrieval-lens

Hard rules. These are not preferences. Codex must not violate them.

## Code Constraints

1. **No `console.log` in `src/`** — MCP uses stdout for JSON-RPC. Any `console.log` corrupts the protocol. Use `src/utils/logger.ts` (writes to stderr).
2. **No `any` types** — `strict: true` is set. Use proper types or `unknown` with a type guard.
3. **No direct SQLite calls outside `src/db/index.ts`** — all storage goes through `getDb()`.
4. **No new `npm` dependencies without explicit approval** — the approved deps list is in `package.json`. Adding a dep is a decision, not an implementation detail.
5. **`src/index.ts` contains only wiring** — no business logic, no SQL, no computation.

## Test Constraints

6. **Each tool module has its own test file** — `tests/observe.test.ts`, `tests/query.test.ts`, etc.
7. **Tests use an in-memory SQLite DB** — set `RETRIEVAL_LENS_DB=:memory:` in test setup. Never write to the real `~/.retrieval-lens/audit.db` during tests.
8. **Every error case in TOOL_CONTRACTS.md must have a test** — happy path alone is not sufficient.

## MCP Protocol Constraints

9. **Tool names must exactly match** — `retrieval_observe`, `retrieval_query`, `retrieval_diff`, `retrieval_stats`. No abbreviations, no camelCase.
10. **`npm run inspect` must exit 0** — if mcp-inspector errors, the tool schema is broken. Fix before marking done.

## Git Constraints

11. **One commit per completed logical unit** — format: `feat(<tool>): <description>` or `fix(<module>): <description>`.
12. **Never commit with failing tests** — run `npm test` before every commit.
13. **Never commit `dist/`** — it is in `.gitignore`. Only source is committed.

## Scope Constraints

14. **WIP = 1** — one task active at a time. If a second task is needed to unblock, make the smallest possible fix and note it in `PROGRESS.md`.
15. **Do not touch `docs/*.md` files during implementation** — those are harness files. Only update `PROGRESS.md` and `feature_list.json` at session end.
# PROGRESS.md — retrieval-lens

## Current Verified State

- 2026-06-06: Completed F01 `retrieval_observe` core capture tool only. The tool now accepts the contracted observe input, computes SHA-256 `content_hash` values, stores one `runs` row plus zero or more `chunks` rows, preserves existing rows on duplicate `run_id`, and returns the contracted `{ stored, run_id, chunk_count }` response.
- 2026-06-07: Completed F02 `retrieval_query` playback tool only. The tool accepts `run_id`, `pipeline_tag`, `limit`, and `since_iso`; clamps `limit` to 100; returns `{ runs: [] }` for misses; maps `created_at` to `timestamp`; and returns chunks ordered by rank ascending.
- `npm install && npm run build && npm test` baseline before F02 exited 0. Evidence: `Test Files  4 passed (4)` and `Tests  9 passed (9)`.
- `npm run build` exits 0 with 0 TypeScript errors. Evidence: `> retrieval-lens@0.1.0 build` followed by successful process exit 0.
- `npm test` exits 0 with all query tests passing. Evidence: `✓ tests/query.test.ts (6 tests)`, `Test Files  4 passed (4)`, and `Tests  14 passed (14)`.
- Coverage for `src/tools/query.ts` is >= 85%. Evidence: coverage report row `query.ts   |     100 |      100 |     100 |     100`.
- `npm run lint` exits 0. Evidence: `eslint src/ tests/ && tsc --noEmit` completed with process exit 0.
- `npm run inspect` could not be completed in this environment because `npx @modelcontextprotocol/inspector dist/index.js` was blocked by registry policy. Evidence: `npm error 403 403 Forbidden - GET https://registry.npmjs.org/@modelcontextprotocol%2finspector`. Latest F03 attempt produced the same E403 registry failure.


- 2026-06-07: Completed F03 `retrieval_diff` diff tool only. The tool validates both run IDs, loads stored chunks through `src/db/`, matches one-to-one by `source` or `content_hash`, returns `only_in_a`, `only_in_b`, `shared` score deltas, and emits the summary string with average delta.
- `npm run build` exits 0 with 0 TypeScript errors for F03. Evidence: `> retrieval-lens@0.1.0 build` followed by successful process exit 0.
- `npm test` exits 0 with all diff tests passing. Evidence: `✓ tests/diff.test.ts (7 tests)`, `Test Files  4 passed (4)`, and `Tests  20 passed (20)`.
- Coverage for `src/tools/diff.ts` is >= 85%. Evidence: coverage report row `diff.ts    |    97.1 |     91.3 |     100 |    97.1`.
- `npm run lint` exits 0. Evidence: `eslint src/ tests/ && tsc --noEmit` completed before `npm run inspect` started.

## Current Task

- F03 `retrieval_diff` is complete. External inspector execution remains blocked by npm registry policy in this environment.

## Next Task

- F04 `retrieval_stats` remains pending. Do not start it unless explicitly assigned in a future session.

## Blockers / Risks

- `npm run inspect` is blocked by npm registry policy in this environment (`E403` fetching `@modelcontextprotocol/inspector`). Re-run once the inspector package is available through the configured registry.

- 2026-06-07: Completed F04 `retrieval_stats` stats tool only. The tool now accepts `pipeline_tag`, `since_iso`, and `until_iso` filters; aggregates matching runs; computes total runs, average rank-1 score, p50/p90 score distribution, top sources, and runs per day; and returns the zeroed struct for empty/no-match results.
- `npm run build` exits 0 with 0 TypeScript errors for F04. Evidence: `> retrieval-lens@0.1.0 build` followed by successful process exit 0.
- `npm test` exits 0 with all stats tests passing. Evidence: `✓ tests/stats.test.ts (9 tests)`, `Test Files  4 passed (4)`, and `Tests  27 passed (27)`.
- Coverage for `src/tools/stats.ts` is >= 85%. Evidence: coverage report row `stats.ts   |     100 |    87.09 |     100 |     100`.
- `npm run lint` exits 0. Evidence: `eslint src/ tests/ && tsc --noEmit` completed with process exit 0.
- `npm run inspect` remains blocked by npm registry policy in this environment. Evidence: `npm error 403 403 Forbidden - GET https://registry.npmjs.org/@modelcontextprotocol%2finspector`.

## F04 Session Closeout

- Current state: F04 `retrieval_stats` is complete except external inspector execution remains blocked by npm registry policy in this environment.
- Final build requirement: `npm run build` was re-run after implementation and exited 0.

## 2026-06-08 Documentation and Adapter Examples Session

- Current state: README was replaced with the updated demo, Quickstart, Adapters, complete Status checklist, and Trust Stack content requested for the documentation refresh.
- Adapter examples added under `examples/` for LangChain and LlamaIndex, with an example-specific TypeScript config and ambient optional-dependency type stubs so the examples can be checked without installing those frameworks.
- Baseline verification before edits: `npm install && npm run build && npm test` exited 0. Evidence: `Test Files  4 passed (4)` and `Tests  27 passed (27)`.
- Example compile check exits 0. Evidence: `npx tsc --noEmit -p examples/tsconfig.json` completed with process exit 0.
- `npm run build` exits 0 with 0 TypeScript errors. Evidence: `> retrieval-lens@0.1.1 build` followed by successful process exit 0.
- `npm run lint` exits 0. Evidence: `eslint src/ tests/ && tsc --noEmit` completed with process exit 0.
- No `src/` or `tests/` files were modified in this session.
- Blockers / risks: no unresolved risks or open questions for this documentation-and-examples update.

## 2026-06-08 Tool Metadata Scoring Session

- Current state: Improved metadata for all four MCP tools by replacing stub descriptions with action-oriented descriptions and attaching the requested tool instructions through each tool's MCP `_meta.instructions` field.
- Baseline verification before edits: `npm install && npm run build && npm test` exited 0. Evidence: `Test Files  4 passed (4)` and `Tests  27 passed (27)`.
- `npm run build` exits 0 with 0 TypeScript errors after metadata edits. Evidence: `> retrieval-lens@0.1.1 build` followed by successful process exit 0.
- `npm test` exits 0 after metadata edits. Evidence: `Test Files  4 passed (4)` and `Tests  27 passed (27)`.
- `npm run lint` exits 0 after metadata edits. Evidence: `eslint src/ tests/ && tsc --noEmit` completed before `npm run inspect` started.
- MCP tool metadata smoke check exits 0. Evidence: the stdio `tools/list` check printed all four tool names with improved descriptions and `_meta.instructions` prefixes.
- `npm run inspect` remains blocked by npm registry policy in this environment. Evidence: `npm error 403 403 Forbidden - GET https://registry.npmjs.org/@modelcontextprotocol%2finspector`.
- `feature_list.json` remains unchanged because this session updated existing complete tool metadata only; no feature status changed.

# PROGRESS.md — retrieval-lens

## Current Verified State

- 2026-06-06: Completed F01 `retrieval_observe` core capture tool only. The tool now accepts the contracted observe input, computes SHA-256 `content_hash` values, stores one `runs` row plus zero or more `chunks` rows, preserves existing rows on duplicate `run_id`, and returns the contracted `{ stored, run_id, chunk_count }` response.
- 2026-06-07: Completed F02 `retrieval_query` playback tool only. The tool accepts `run_id`, `pipeline_tag`, `limit`, and `since_iso`; clamps `limit` to 100; returns `{ runs: [] }` for misses; maps `created_at` to `timestamp`; and returns chunks ordered by rank ascending.
- `npm install && npm run build && npm test` baseline before F02 exited 0. Evidence: `Test Files  4 passed (4)` and `Tests  9 passed (9)`.
- `npm run build` exits 0 with 0 TypeScript errors. Evidence: `> retrieval-lens@0.1.0 build` followed by successful process exit 0.
- `npm test` exits 0 with all query tests passing. Evidence: `✓ tests/query.test.ts (6 tests)`, `Test Files  4 passed (4)`, and `Tests  14 passed (14)`.
- Coverage for `src/tools/query.ts` is >= 85%. Evidence: coverage report row `query.ts   |     100 |      100 |     100 |     100`.
- `npm run lint` exits 0. Evidence: `eslint src/ tests/ && tsc --noEmit` completed with process exit 0.
- `npm run inspect` could not be completed in this environment because `npx @modelcontextprotocol/inspector dist/index.js` was blocked by registry policy. Evidence: `npm error 403 403 Forbidden - GET https://registry.npmjs.org/@modelcontextprotocol%2finspector`.

## Current Task

- F02 `retrieval_query` is complete, except external inspector execution remains blocked by npm registry policy in this environment.

## Next Task

- F03 `retrieval_diff` remains pending. Do not start it until the next session.

## Blockers / Risks

- `npm run inspect` is blocked by npm registry policy in this environment (`E403` fetching `@modelcontextprotocol/inspector`). Re-run once the inspector package is available through the configured registry.

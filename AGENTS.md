# AGENTS.md — retrieval-lens

**retrieval-lens** is a TypeScript MCP server that intercepts RAG retrieval calls,
logs every chunk seen by the model (with scores, query, timestamp, and source),
and exposes tools so agents can audit, replay, and diff retrieval runs.

## First-Run Commands

```bash
npm install          # install dependencies
npm run build        # compile TypeScript → dist/
npm test             # run full test suite (vitest)
npm run lint         # eslint + tsc --noEmit
npm run inspect      # run mcp-inspector against built server
```

> If any of these fail, fix that before writing new feature code.

## Startup Workflow (read this every session)

1. `pwd` — confirm you are in the project root.
2. Read `PROGRESS.md` — find the current verified state and the single next task.
3. Read `feature_list.json` — identify the highest-priority feature with status `"pending"`.
4. `git log --oneline -5` — understand what the last session completed.
5. `npm install && npm run build && npm test` — verify baseline is green.
6. If baseline is red, fix it first. Do not start new work on a broken state.

## Hard Constraints

- **WIP = 1.** Work on exactly one feature per session. Do not activate a second task.
- **No `console.log` in `src/`** — use the `logger` utility in `src/utils/logger.ts`.
- **No `any` types** — TypeScript strict mode is on; every type must be explicit.
- **No direct SQLite calls outside `src/db/`** — all storage goes through the db module.
- **MCP schema validity is non-negotiable** — every tool must pass `npm run inspect` before marking done.
- Do not modify `package.json` scripts or `tsconfig.json` without an explicit instruction.
- Do not declare a feature done unless all Definition of Done criteria are met (see below).

## Definition of Done (per feature)

A task is complete **only** when ALL of the following are true:

- [ ] Implementation exists in `src/`
- [ ] `npm test` passes with 0 failures
- [ ] `npm run lint` passes with 0 errors
- [ ] `npm run inspect` lists the tool with correct input/output schema
- [ ] Coverage for the new module is ≥ 85%
- [ ] `PROGRESS.md` is updated with evidence (test output line, not just "done")
- [ ] `feature_list.json` status updated to `"complete"`
- [ ] `git commit` made with message format: `feat(<tool-name>): <what it does>`

## End-of-Session Checklist (clock-out)

Before ending ANY session:

1. Update `PROGRESS.md` — current state, what passed, what is blocked.
2. Update `feature_list.json` — status field for the task worked on.
3. Write any unresolved risk or open question in `DECISIONS.md`.
4. `git commit` — one atomic commit per completed logical unit.
5. Run `npm run build` one final time — repo must be in a buildable state.

## Topic Docs

- Architecture: `docs/ARCHITECTURE.md`
- DB schema: `docs/DB_SCHEMA.md`
- Tool contracts: `docs/TOOL_CONTRACTS.md`
- Constraints: `docs/CONSTRAINTS.md`
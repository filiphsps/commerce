# lspmesh — task checklist

Flat index of `plan.md`. Check off as completed. Each task is one commit.

## Phase 0 — npm name (DONE)
- [x] 0.1 Publish `lspmesh@0.0.0` stub (name reserved)
- [ ] 0.2 **Owner, manual web:** configure npm Trusted Publisher → `filiphsps/commerce` + `release.yml`

## Phase 1 — Scaffold
- [ ] 1.0 Create `feat/lspmesh` branch; move spec onto it
- [ ] 1.1 Add `packages/ai/*` to `pnpm-workspace.yaml`
- [ ] 1.2 Package scaffold (package.json/tsconfig/vite/vitest/index/README) + build + shebang
- [ ] 1.3 Widen `block-new-error` hook to `packages/ai/lspmesh/`; note in ADR 0001

## Phase 2 — Config
- [ ] 2.1 Config types + default three-backend config
- [ ] 2.2 Config loader + upward discovery + validation
- [ ] 2.3 Extension→backend routing helpers

## Phase 3 — Backend client
- [ ] 3.1 Pure helpers: locations, definition classifier, seed ordering
- [ ] 3.2 `BackendClient` over vscode-jsonrpc (timeout, death-reject, mtime sync) + echo fixture
- [ ] 3.3 `BackendRegistry` (respawn-on-death, routing)

## Phase 4 — Engine
- [ ] 4.1 `mergeLocations` (union + dedupe)
- [ ] 4.2 `AggregatorEngine` (positionOp, workspace/symbol seed-and-fan, find_*)

## Phase 5 — LSP mode
- [ ] 5.1 `startLspServer` (Claude Code op set) + `rawForward` on engine

## Phase 6 — MCP mode
- [ ] 6.1 `buildMcpServer`/`startMcpServer` (find_symbol/references/implementations)

## Phase 7 — CLI
- [ ] 7.1 `lspmesh lsp|mcp` bin + public API exports

## Phase 8 — Integration
- [ ] 8.1 Integration config + fixture workspace + LSP/MCP/parity real-backend tests

## Phase 9 — Marketplace
- [ ] 9.1 `lspmesh` plugin in commerce-plugins marketplace (lspServers + mcpServers via npx)

## Phase 10 — Docs
- [ ] 10.1 Package `docs/*.mdx` + new "AI" category in `_categories.json`/`meta.json`/mirror titles; `gen` + `docs:gen:check`

## Phase 11 — Consolidation (gated on parity green)
- [ ] 11.1 Disable ts/tailwind LSP plugins; register lspmesh (dist); delete `lsp-symbols.mjs`; update `CLAUDE.md`; manual verify

## Phase 12 — Release
- [ ] 12.1 Changeset (→0.0.1) + trusted publishing in `release.yml`
- [ ] 12.2 **Owner, post-merge:** CI publishes `lspmesh@0.0.1` w/ provenance; flip dev wiring to `npx lspmesh@latest`

## Phase 13 — Finish
- [ ] 13.1 Full gate (build/lint/typecheck/test/integration/docs:gen:check) + PR (rebase, never merge)

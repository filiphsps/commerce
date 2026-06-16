# lspmesh — LSP aggregator + MCP server

**Status:** approved (grilled 2026-06-16)
**Slug:** `2026-06-16-lspmesh-lsp-aggregator`

## Problem

`/.claude/mcp/lsp-symbols.mjs` is a hand-rolled, single-file MCP server that
restores by-name symbol search over this monorepo (the built-in LSP
`workspaceSymbol` is broken — [claude-code#30948](https://github.com/anthropics/claude-code/issues/30948)).
It is registered per-machine at local scope, untyped, untested, and ties only
`typescript-language-server`. We want a real, published, testable package that
**aggregates multiple LSP backends at once** (typescript, tailwind, biome) behind
one front, exposes both an **LSP server** and an **MCP server**, and is
installable by anyone via a Claude marketplace.

## Goal

Ship `lspmesh@0.0.1` — a dual-protocol LSP aggregator under
`packages/ai/lspmesh` — and consolidate commerce's own tooling onto it.

## Locked decisions (the ledger)

| Topic | Decision |
| --- | --- |
| npm name | `lspmesh` — **bare, unscoped, public** (verified available 2026-06-16). MIT. Standalone OSS (ADR-0001 class: native `Error` allowed, no `@nordcom` runtime dep). |
| Location | `packages/ai/lspmesh/`. Add `packages/ai/*` to `pnpm-workspace.yaml` (mirrors `packages/tagtree/*`, `packages/cart/*`). |
| Versioning | **Independent** of other pkgs. **Name reserved 2026-06-16 by publishing a `0.0.0` stub** (live on npm, `latest=0.0.0`) so trusted publishing can be configured. First **real** release is **`0.0.1`**, published by CI via **trusted publishing** (npm OIDC + provenance) once the package is built. Changesets-managed; bare name is automatically outside the `@nordcom/*` ignore list. `publishConfig.access: public`. **Pending manual web step:** configure the npm Trusted Publisher for `lspmesh` → `filiphsps/commerce` + `release.yml`. |
| Product | A **real LSP aggregator** (LSP server mode) **plus** MCP tool functions (MCP server mode), sharing one core engine. |
| Aggregation purpose | Front **multiple** backend LSP servers **simultaneously** (typescript + tailwind + biome). A single file may be served by several backends. |
| Routing + merge | Route each request to **every** backend whose `extensionToLanguage` matches the document's path; **merge** responses per-op (union locations, concat hovers). `workspace/symbol` and the MCP `find_*` tools **fan out across all backends** and merge. |
| LSP fidelity | Implement only the **Claude Code LSP tool op set**: `definition`, `references`, `hover`, `documentSymbol`, `implementation`, `prepareCallHierarchy`/`incomingCalls`/`outgoingCalls`, `workspaceSymbol`. No completion/diagnostics/formatting in 0.0.1. |
| Binary | One `lspmesh` bin with two modes: `lspmesh lsp` (LSP server over stdio) and `lspmesh mcp` (MCP server over stdio). Shared engine. |
| Backends 0.0.1 | typescript + tailwind + biome, **config-driven** (`command`/`args`/`extensionToLanguage`), **npx-pinned defaults**, **no bundled** language servers. |
| Protocol libs | `@modelcontextprotocol/sdk` (MCP) + `vscode-jsonrpc` + `vscode-languageserver-protocol` (LSP framing/types, both inbound server and outbound backend client). |
| Consolidation | lspmesh **replaces** the `typescript-lsp` + `tailwind-lsp-adapter` commerce-plugins **and** `lsp-symbols.mjs`, gated on verified parity. Commerce dev wires lspmesh via the workspace `dist` build. |
| Marketplace | Lives in the public `filiphsps/commerce` repo. External install: `claude plugin marketplace add filiphsps/commerce` → enable the `lspmesh` plugin. Plugin registers `lspServers` (`npx lspmesh lsp`) + `mcpServers` (`npx lspmesh mcp`). |
| Docs | Mirror `next-build-notifier`: package ships `docs/*.mdx` (mirrored by `apps/docs/scripts/mirror-workspace-docs.ts`), TypeDoc auto-includes `packages/**/src`, add a new "AI" category to `apps/docs/content/packages/_categories.json` + `meta.json`, keyed `ai/lspmesh`. Gate with `pnpm --filter @nordcom/commerce-docs docs:gen:check`. |
| Tests | Layered — unit (config/routing/per-op merge/dedup/symbol-classification/seed-ordering) + **real-backend integration** spawning `lspmesh lsp`/`lspmesh mcp` against a fixture workspace with typescript + tailwind + biome + a parity test vs the old `lsp-symbols` on this repo. |
| Scaffold | Mirror `next-build-notifier` (`tsc && vite build`, vitest, `extends ../../tsconfig.lib.json`, codecov, MIT, `type: module`) plus a `bin` with shebang and a CLI build entry. |

## Carry-over hardening (from the current `lsp-symbols.mjs`)

These behaviors must survive the port and live in the typescript-backed code path
(they are the working `workspace/symbol` fix):

1. **Request timeouts** (45s) + reject in-flight on backend death.
2. **Dead-backend detection + respawn** on next use.
3. **mtime-aware `didOpen`/`didChange`** — re-sync a file when it changed on disk.
4. **Seed strategy** for tsserver lazy project loading: `git grep` for files
   mentioning the symbol, order them (defer tests/`dist`/`.d.ts`, **float the
   file whose basename matches the symbol**), cap, and surface truncation.
5. **Definition-shaped ranking** — definitions ranked ahead of import sites;
   `definitionsOnly` option.
6. **Multi-definition union** — resolve every distinct definition of a name and
   union references/implementations, each tagged with `definedAt`; optional
   `file` pin.

## Architecture

```
                       stdin/stdout
                            │
        ┌───────────────────┴───────────────────┐
        │                                         │
  lspmesh lsp  (LSP server, vscode-jsonrpc)  lspmesh mcp (MCP server, MCP SDK)
        │                                         │
        └──────────────┬──────────────────────────┘
                       │  AggregatorEngine (shared core)
                       │   • config + backend registry
                       │   • route(doc) → matching backends
                       │   • per-op merge / dedup
                       │   • workspace/symbol seed+fan+merge
                       │   • find_symbol/refs/impls (MCP)
        ┌──────────────┼──────────────┬───────────────┐
   BackendClient   BackendClient  BackendClient   (one per configured server)
   typescript        tailwind        biome
   (vscode-jsonrpc child process each: spawn, initialize, didOpen/didChange,
    request, timeout, restart-on-death)
```

## Out of scope for 0.0.1

- Editor-only LSP ops (completion, diagnostics push, formatting, rename, code
  actions, semantic tokens).
- Backends beyond typescript/tailwind/biome (architecture stays config-open).
- Capability passthrough negotiation beyond advertising the supported op set.
- A standalone marketplace repo (graduate later if desired).

## Done = 

- `lspmesh@0.0.1` builds, tests (unit + integration) pass, types emit.
- `lspmesh lsp` and `lspmesh mcp` both run against the three backends.
- Parity test green vs old `lsp-symbols` on this repo.
- Marketplace plugin installs; commerce consolidated onto lspmesh; old plugins +
  `lsp-symbols.mjs` removed.
- Docs generate and `docs:gen:check` passes.
- Manual first publish done; trusted publishing + changesets release wired.

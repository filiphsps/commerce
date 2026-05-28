# typescript-lsp (repo-local)

TypeScript/JavaScript language-server support for Claude Code's `LSP` tool —
go-to-definition, find references, hover, document/workspace symbols, call
hierarchy, and diagnostics across this monorepo.

Repo-local replacement for the `typescript-lsp@claude-plugins-official` plugin,
so the whole team gets identical config from version control. It is **registered
for everyone working in this repo** via `.claude/settings.json`
(`extraKnownMarketplaces.commerce-plugins` + `enabledPlugins`). The official
plugin is explicitly disabled in project settings to avoid double-loading the
`typescript` server. No per-user setup needed — Claude Code auto-installs it from
the in-repo marketplace on session start.

## Prerequisites

None to install. The server is launched with `pnpm dlx` at a pinned version
(`typescript-language-server@4.4.1`), so the only requirement is `pnpm` on
`PATH` — which this repo already needs. `pnpm dlx` fetches the binary into the
pnpm cache on first use and reuses it afterward; `typescript-language-server`
drives the workspace's own `typescript` (resolved from `node_modules`), so type
intelligence matches the repo.

To avoid a slow first LSP spawn, optionally pre-warm the cache once:

```bash
pnpm dlx typescript-language-server@4.4.1 --version
```

Supported extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs`,
`.cjs`.

## Verify

After `/reload-plugins` (or a restart), the reload summary should report the
`typescript` LSP server loaded. Then the `LSP` tool's `goToDefinition` /
`findReferences` / `hover` operations work on `.ts` / `.tsx` files.

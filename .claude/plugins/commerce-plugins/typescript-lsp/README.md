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

## Prerequisites (one-time, per machine)

The plugin only declares LSP config; the server binary (plus the `typescript`
package it drives) must be on `PATH`, installed globally via pnpm:

```bash
pnpm add -g typescript-language-server typescript
```

Confirm the pnpm global bin dir is on `PATH` (run `pnpm setup` once if not):

```bash
which typescript-language-server   # must resolve
```

Supported extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs`,
`.cjs`.

## Verify

After `/reload-plugins` (or a restart), the reload summary should report the
`typescript` LSP server loaded. Then the `LSP` tool's `goToDefinition` /
`findReferences` / `hover` operations work on `.ts` / `.tsx` files.

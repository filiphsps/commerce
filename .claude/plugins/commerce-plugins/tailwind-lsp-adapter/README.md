# tailwind-lsp-adapter (repo-local)

Tailwind CSS language-server support for Claude Code's `LSP` tool — completions,
hover info, and diagnostics for Tailwind classes across this monorepo.

This plugin is **registered for everyone working in this repo** via
`.claude/settings.json` (`extraKnownMarketplaces.commerce-plugins` +
`enabledPlugins`). No per-user `--setup` is needed — Claude Code auto-installs it
from the in-repo marketplace on session start.

## Prerequisites

None to install. The server is launched with `pnpm dlx` at pinned versions, so
the only requirement is `pnpm` on `PATH` — which this repo already needs. A
single `pnpm dlx` invocation pulls both packages into the pnpm cache and runs
them together:

```
pnpm dlx --package tailwind-lsp-adapter@1.1.5 \
         --package @tailwindcss/language-server@0.14.29 \
         tailwind-lsp-adapter
```

`tailwind-lsp-adapter` wraps `@tailwindcss/language-server` (spawned from the same
dlx environment) to fit Claude Code's LSP transport. `pnpm dlx` caches both on
first use and reuses them afterward.

To avoid a slow first LSP spawn, optionally pre-warm the cache once:

```bash
pnpm dlx --package tailwind-lsp-adapter@1.1.5 --package @tailwindcss/language-server@0.14.29 tailwind-lsp-adapter --help >/dev/null 2>&1 || true
```

## Scope

This server owns only CSS-family extensions: `.css`, `.scss`, `.less`, `.html`,
`.vue`, `.svelte`. It deliberately does **not** claim `.js/.jsx/.ts/.tsx` —
Claude Code routes each extension to a single server (first registered wins,
operation-blind), so claiming those would shadow `typescript-lsp` and break
`goToDefinition`/`findReferences` on components. typescript owns the JS/TS family
alone; tailwind owns CSS.

## Verify

After `/reload-plugins` (or a restart), the reload summary should report the
`tailwindcss` LSP server loaded. Then the `LSP` tool's `hover` / `documentSymbol`
operations work on `.css` / `.scss` files.

# tailwind-lsp-adapter (repo-local)

Tailwind CSS language-server support for Claude Code's `LSP` tool — completions,
hover info, and diagnostics for Tailwind classes across this monorepo.

This plugin is **registered for everyone working in this repo** via
`.claude/settings.json` (`extraKnownMarketplaces.commerce-plugins` +
`enabledPlugins`). No per-user `--setup` is needed — Claude Code auto-installs it
from the in-repo marketplace on session start.

## Prerequisites (one-time, per machine)

The plugin only declares LSP config; the two server binaries must be on `PATH`,
installed globally via pnpm:

```bash
pnpm add -g tailwind-lsp-adapter tailwindcss-language-server
```

Confirm the pnpm global bin dir is on `PATH` (run `pnpm setup` once if not):

```bash
which tailwind-lsp-adapter tailwindcss-language-server   # both must resolve
```

`tailwind-lsp-adapter` wraps `tailwindcss-language-server` to fit Claude Code's
LSP transport. Without them on `PATH`, the `tailwindcss` server fails to spawn
(TypeScript/JS intelligence via `typescript-lsp` is unaffected).

## Verify

After `/reload-plugins` (or a restart), the reload summary should report the
`tailwindcss` LSP server loaded. Then the `LSP` tool's `hover` / `documentSymbol`
operations work on `.tsx` / `.css` files.

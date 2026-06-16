# lspmesh (Claude Code plugin)

Registers [`lspmesh`](https://github.com/filiphsps/commerce/tree/master/packages/ai/lspmesh)
as both:

- an **LSP server** (`lspmesh lsp`) — aggregates TypeScript, Tailwind, and Biome
  behind one endpoint, routing each request to every backend that handles the
  file and merging the results; and
- an **MCP server** (`lspmesh mcp`) — by-name `find_symbol`, `find_references`,
  and `find_implementations` for AI agents.

Both launch via `pnpm dlx lspmesh@latest`, so no global install is required.

## Install

```bash
claude plugin marketplace add filiphsps/commerce
# then enable the "lspmesh" plugin
```

> Goes live once `lspmesh@0.0.1` is published to npm. Until then, run it from the
> workspace build (`node packages/ai/lspmesh/dist/cli.js lsp|mcp`).

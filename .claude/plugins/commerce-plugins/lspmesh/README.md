# lspmesh (Claude Code plugin)

Registers [`lspmesh`](https://github.com/filiphsps/commerce/tree/master/packages/ai/lspmesh)
for this repo as both:

- an **LSP server** (`lspmesh lsp`) — aggregates TypeScript, Tailwind, and Biome
  behind one endpoint, routing each request to every backend that handles the
  file and merging the results; and
- an **MCP server** (`lspmesh mcp`) — by-name `find_symbol`, `find_references`,
  and `find_implementations` for AI agents.

Both run from the **workspace build** (`node packages/ai/lspmesh/dist/cli.js`), so
build the package first:

```bash
pnpm --filter lspmesh build   # or: pnpm build:packages
```

This replaces the `typescript-lsp` and `tailwind-lsp-adapter` plugins and the old
`lsp-symbols` MCP server.

> Standalone (outside this repo): install the published package and run
> `pnpm dlx lspmesh@latest lsp` / `mcp`.

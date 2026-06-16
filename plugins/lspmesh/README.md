# lspmesh (Claude Code plugin)

Registers the published [`lspmesh`](https://github.com/filiphsps/commerce/tree/master/packages/ai/lspmesh)
package as both:

- an **LSP server** (`lspmesh lsp`) — aggregates TypeScript, Tailwind, and Biome
  behind one endpoint, routing each request to every backend that handles the
  file and merging the results; and
- an **MCP server** (`lspmesh mcp`) — by-name `find_symbol`, `find_references`,
  and `find_implementations` for AI agents.

Both run the **published package** via `pnpm dlx lspmesh@0.0.3`, so no local
build is required.

> Inside the monorepo, use the repo-local `commerce-plugins` directory source
> instead — it runs the workspace build (`node packages/ai/lspmesh/dist/cli.js`).

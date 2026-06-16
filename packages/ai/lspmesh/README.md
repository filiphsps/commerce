# lspmesh

[![npm version](https://img.shields.io/npm/v/lspmesh)](https://www.npmjs.com/package/lspmesh)
[![npm downloads](https://img.shields.io/npm/dm/lspmesh)](https://www.npmjs.com/package/lspmesh)

LSP aggregator + MCP server. Fronts multiple language servers (TypeScript,
Tailwind, Biome) behind one LSP endpoint, routing each request to every backend
that handles the file and merging the results — and exposes the same
intelligence as MCP tools for AI coding agents.

```bash
npx lspmesh lsp   # LSP server over stdio
npx lspmesh mcp   # MCP server over stdio
```

See the full docs at
<https://filiphsps.github.io/commerce/packages/ai/lspmesh/overview/>.

## License

MIT

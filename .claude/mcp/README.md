# `lsp-symbols` MCP server

Symbol-search-by-name for this monorepo. Works around two gaps:

1. **Claude Code's built-in LSP tool has no `query` parameter**, so its
   `workspaceSymbol` operation always sends an empty query and returns nothing
   ([claude-code#30948](https://github.com/anthropics/claude-code/issues/30948)).
2. **`typescript-language-server` loads each TS project lazily** and its
   `workspace/symbol` (tsserver navto) only searches projects whose files are
   open. Opening every file up front (what off-the-shelf bridges do) floods
   tsserver in our 66-tsconfig workspace and navto comes back empty.

Strategy: `git grep` for files mentioning the symbol → open just those (loading
their projects) → run `workspace/symbol`.

## Tools

-   `find_symbol({ query })` — where a symbol is defined, by exact name. Returns
    `file:line:character` + a source snippet.
-   `find_references({ query })` — all references to a symbol, by exact name.

## Setup (per machine, opt-in)

Not wired into the committed `.mcp.json` — it needs `typescript-language-server`
on the machine, which isn't a repo dependency. Register at **local** scope:

```sh
claude mcp add lsp-symbols -s local \
  -e LSP_SYMBOLS_ROOT="$PWD" \
  -e TYPESCRIPT_LANGUAGE_SERVER_BIN="$(command -v typescript-language-server)" \
  -- node "$PWD/.claude/mcp/lsp-symbols.mjs"
```

Prereqs: `node`, `git`, and `typescript-language-server` (`pnpm add -g
typescript typescript-language-server`). Reconnect MCP (`/mcp`) or restart the
session after adding.

## Notes

-   First query against a cold project waits while tsserver indexes (polls up to
    ~60s); subsequent queries reuse the loaded project.
-   Results include import sites alongside definitions — the real definition is
    the entry whose snippet starts with `export`/`const`/`function`/`class`/etc.
-   `find_references` resolves the first definition of a name; for two distinct
    symbols sharing a name it picks the first match.

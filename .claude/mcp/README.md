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

## This is an MCP server, not an LSP server

It exposes **MCP tools** (by-name search), not the Language Server Protocol. The
actual LSP server is registered separately by the **`typescript-lsp`** plugin in
the in-repo `commerce-plugins` marketplace, which runs `typescript-language-server`
and powers Claude Code's built-in `LSP` tool (position-based ops:
`goToDefinition`, `findReferences`, `hover`, `documentSymbol`,
`goToImplementation`, call hierarchy). The two are complementary and you want
both:

| Need | Use |
| --- | --- |
| "where is `X` defined / who uses `X`", by **name** | this MCP (`find_symbol` / `find_references` / `find_implementations`) |
| def/refs/hover/impl at a **cursor position** | the built-in `LSP` tool (typescript-lsp plugin) |

The native `LSP` tool's `workspaceSymbol` (the only by-name op) is broken
(#30948), which is the entire reason this MCP exists. This server speaks MCP
JSON-RPC on its stdio, so it **cannot** be wired as an `lspServers` entry — Claude
Code would try to drive it with LSP `initialize`/`textDocument/*` and it would
fail. Keep it an MCP.

## Tools

-   `find_symbol({ query, definitionsOnly? })` — where a symbol is defined, by
    exact name. Returns `file:line:character` + a source snippet, **definitions
    ranked ahead of import sites**. Pass `definitionsOnly: true` to drop import
    sites entirely. When the seed search is capped the reply is wrapped as
    `{ truncated: true, totalSeedFiles, results }` so a partial answer never
    reads as exhaustive.
-   `find_references({ query, file? })` — all references to a symbol, by exact
    name. Resolves **every** distinct definition of the name (not just the
    first) and unions their references; each result carries a `definedAt`
    (`file:line`) tag for the definition it resolves to, so a name shared by two
    unrelated symbols reports both sets, visibly separated. Pass the optional
    `file` (repo-relative path) to restrict to the definition in one path when a
    name collides and only one is wanted.
-   `find_implementations({ query, file? })` — implementations of an interface or
    abstract member, by exact name. The name-based counterpart to the built-in
    position-only `goToImplementation`; same multi-definition union + `definedAt`
    tagging + optional `file` pin as `find_references`.

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
-   Requests time out (45s) and a dead tsserver is detected and respawned on the
    next call, so a wedged or crashed server fails the one call instead of
    hanging every future one.
-   The client tracks open files by mtime and sends `didChange` when a file
    changed on disk since it was opened — edits made mid-session are reflected,
    not stale.
-   Seed files are ordered before the cap so the definition survives: test/spec/
    mock, `dist/`, and `.d.ts` files are deferred, and a file whose basename
    matches the symbol (`locale.ts` → `Locale`) is floated to the top — otherwise
    git's alphabetical order can bury a `packages/` definition under hundreds of
    `apps/` import sites for a common name.
-   Results include import sites alongside definitions — the real definition is
    the entry whose snippet starts with `export`/`const`/`function`/`class`/etc.
-   `find_references` / `find_implementations` filter to definition-shaped entries
    (dropping import/re-export lines), run one pass per distinct definition, and
    merge the results — so colliding names no longer silently report just one
    symbol's results. Use `definedAt` to tell the sets apart, or `file` to pin
    one. If no entry looks like a definition (e.g. a class member), they fall
    back to running across all matches.

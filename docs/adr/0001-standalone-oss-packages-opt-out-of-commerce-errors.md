# Standalone OSS packages opt out of `@nordcom/commerce-errors`

The repo bans the native `Error` constructor in app and package source (throw via `@nordcom/commerce-errors`), enforced by the `block-new-error` hook. We exempt packages published as standalone, dependency-free OSS — e.g. `next-build-notifier` (bare npm name, MIT, peer-deps only): they use the native `Error` so they carry no Nordcom runtime dependency, because forcing the errors package into a generic, publishable utility would defeat its dependency-free design.

## Consequences

- `next-build-notifier` source legitimately contains `new Error(...)` (`context.ts`, `default-fetcher.ts`). A future reader should not "fix" this to use `@nordcom/commerce-errors`.
- The `block-new-error` hook currently exempts only `/scripts/`, so it will block the next edit to such a package. The exemption must be widened to recognize the opt-out class (e.g. a marker in `package.json` or a path allowlist), not just `/scripts/`.
- `lspmesh` (`packages/ai/lspmesh`, bare npm name, MIT) is a second package in this class: a standalone LSP-aggregator/MCP server that ships no Nordcom runtime dependency, so it uses the native `Error`. It is path-allowlisted in the hook alongside `next-build-notifier` and `.claude/mcp/`.

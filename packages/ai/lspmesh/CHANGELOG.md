# lspmesh

## 0.0.3

### Patch Changes

- [`95249fe`](https://github.com/filiphsps/commerce/commit/95249febac61d518d31e5ad7036488825300b88b) Thanks [@filiphsps](https://github.com/filiphsps)! - Update domain to <nordcom.store> 🎉

## 0.0.2

### Patch Changes

- [`02a1185`](https://github.com/filiphsps/commerce/commit/02a1185fa794ff1741e4dd041ac1b7dec91e4821) Thanks [@filiphsps](https://github.com/filiphsps)! - Fix the docs link in the `README.md` file. Also add a `LICENSE.md`.

- [`67e3ee6`](https://github.com/filiphsps/commerce/commit/67e3ee60dd18f26aae86341286b902e0cfc6e18c) Thanks [@filiphsps](https://github.com/filiphsps)! - Run unit tests per-package through turbo so an unchanged package restores its result from the build cache instead of re-running; coverage is merged across packages and floor-gated as before. Tooling-only — no change to published output.

## 0.0.1

### Patch Changes

- [#2036](https://github.com/filiphsps/commerce/pull/2036) [`e0ecf0d`](https://github.com/filiphsps/commerce/commit/e0ecf0d77defcb22523336175ad969e6d05733e2) Thanks [@filiphsps](https://github.com/filiphsps)! - Initial release: an LSP aggregator + MCP server that fronts TypeScript, Tailwind, and Biome behind one endpoint — routing each request to every backend that handles the file and merging the results — plus by-name `find_symbol` / `find_references` / `find_implementations` MCP tools.

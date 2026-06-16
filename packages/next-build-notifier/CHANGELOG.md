# next-build-notifier

## 0.2.2

### Patch Changes

- [`efa97d3`](https://github.com/filiphsps/commerce/commit/efa97d3eac009d437f45b2b3d28591bb6f597964) Thanks [@filiphsps](https://github.com/filiphsps)! - Fix the version endpoint reporting a different id than the client baked, which left the "update available" banner stuck forever. `createVersionRoute` resolved the id via `resolveBuildId(process.env)` — passing the whole `process.env` object defeats Next's build-time inlining (it only replaces literal `process.env.X` accesses), so the baked `NEXT_PUBLIC_BUILD_ID` was invisible at runtime and the chain collapsed to an ambient runtime var or `'development'`. The default resolver now reads `process.env.NEXT_PUBLIC_BUILD_ID` directly so the endpoint reports the same id the client compares against.

- [`67e3ee6`](https://github.com/filiphsps/commerce/commit/67e3ee60dd18f26aae86341286b902e0cfc6e18c) Thanks [@filiphsps](https://github.com/filiphsps)! - Run unit tests per-package through turbo so an unchanged package restores its result from the build cache instead of re-running; coverage is merged across packages and floor-gated as before. Tooling-only — no change to published output.

## 0.2.1

### Patch Changes

- [`29f8582`](https://github.com/filiphsps/commerce/commit/29f85824396ac30bea101697a4ee2b4ac1581b13) Thanks [@filiphsps](https://github.com/filiphsps)! - Add npm version and downloads badges to the package READMEs, and point each `homepage` at its live docs page under `https://nordcom.store/docs/packages/…`.

## 0.2.0

### Minor Changes

- [#2034](https://github.com/filiphsps/commerce/pull/2034) [`d500a1b`](https://github.com/filiphsps/commerce/commit/d500a1b5fa07da4d69fa1ca0ffd38e9b478e195f) Thanks [@filiphsps](https://github.com/filiphsps)! - Add `next-build-notifier`: a headless "new build available" indicator for Next.js. Generic build detection (any host) with first-class Vercel support, exposed as a config wrapper (`withBuildNotifier`), a route-handler factory (`createVersionRoute`), and a headless client API (`BuildNotifierProvider` / `useBuildNotification` / `<BuildNotifier>`).

# next-build-notifier

## 0.2.1

### Patch Changes

- [`29f8582`](https://github.com/filiphsps/commerce/commit/29f85824396ac30bea101697a4ee2b4ac1581b13) Thanks [@filiphsps](https://github.com/filiphsps)! - Add npm version and downloads badges to the package READMEs, and point each `homepage` at its live docs page under `https://filiphsps.github.io/commerce/packages/…`.

## 0.2.0

### Minor Changes

- [#2034](https://github.com/filiphsps/commerce/pull/2034) [`d500a1b`](https://github.com/filiphsps/commerce/commit/d500a1b5fa07da4d69fa1ca0ffd38e9b478e195f) Thanks [@filiphsps](https://github.com/filiphsps)! - Add `next-build-notifier`: a headless "new build available" indicator for Next.js. Generic build detection (any host) with first-class Vercel support, exposed as a config wrapper (`withBuildNotifier`), a route-handler factory (`createVersionRoute`), and a headless client API (`BuildNotifierProvider` / `useBuildNotification` / `<BuildNotifier>`).
